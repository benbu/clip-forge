/**
 * Recording Service - Manages capture streams, preview compositing, and persistence.
 */

import { Buffer } from 'buffer';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeCoordinates = (coords) => {
  if (!coords || typeof coords !== 'object') return null;
  const xPercent = Number.isFinite(coords.xPercent) ? clamp(coords.xPercent, 0, 1) : null;
  const yPercent = Number.isFinite(coords.yPercent) ? clamp(coords.yPercent, 0, 1) : null;
  if (xPercent === null || yPercent === null) return null;
  return { xPercent, yPercent };
};

const sanitizeOverlay = (overlay = {}, defaults = DEFAULT_OVERLAY) => {
  const positionRaw = typeof overlay.position === 'string' ? overlay.position : defaults.position;
  const position = positionRaw === 'custom' || OVERLAY_POSITIONS.includes(positionRaw)
    ? positionRaw
    : defaults.position;

  const sizeRaw = Number.isFinite(overlay.size) ? overlay.size : defaults.size;
  const size = clamp(sizeRaw, 0.1, 0.6);

  const borderRadiusRaw = Number.isFinite(overlay.borderRadius) ? overlay.borderRadius : defaults.borderRadius;
  const borderRadius = clamp(borderRadiusRaw, 0, 64);

  const coordinates = position === 'custom'
    ? sanitizeCoordinates(overlay.coordinates) || { xPercent: 0.5, yPercent: 0.5 }
    : null;

  return {
    position,
    size,
    borderRadius,
    coordinates,
  };
};

const VIDEO_MIME = 'video/webm;codecs=vp9,opus';
const DEFAULT_VIDEO_BITRATE = 3000000; // 3 Mbps
const OVERLAY_POSITIONS = ['top-right', 'bottom-right', 'bottom-left', 'top-left', 'center', 'custom'];
const DEFAULT_OVERLAY = {
  position: 'top-right',
  size: 0.22,
  borderRadius: 12,
  coordinates: null,
};
const OVERLAY_MARGIN = 24;

const getVideoDimensions = (track) => {
  if (!track) {
    return { width: 1920, height: 1080 };
  }
  const settings = track.getSettings?.() || {};
  return {
    width: settings.width || 1920,
    height: settings.height || 1080,
  };
};

const stopStreamTracks = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch (error) {
      console.warn('Failed to stop track', error);
    }
  });
};

export class RecordingService {
  constructor() {
    // Streams
    this.screenStream = null;
    this.cameraStream = null;
    this.audioStream = null;

    // Composite preview
    this.previewCompositor = null;
    this.overlayState = { ...DEFAULT_OVERLAY };

    // Recorders
    this.baseRecorder = null;
    this.baseChunks = [];

    this.previewRecorder = null;
    this.previewChunks = [];

    this.cameraRecorder = null;
    this.cameraChunks = [];

    this.outputStream = null;

    // Dimensions
    this.screenDimensions = null;
    this.cameraDimensions = null;

    // Metering
    this.audioContext = null;
    this.analyser = null;
    this.audioSourceNode = null;
    this.meterRaf = null;
    this.onMeter = null;
  }

  async getScreenSources() {
    if (!window?.electronAPI?.getScreenSources) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.getScreenSources();
  }

  async enumerateDevices() {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], videoInputs: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || 'Microphone',
        }));
      const videoInputs = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || 'Camera',
        }));

      return { audioInputs, videoInputs };
    } catch (error) {
      console.error('Failed to enumerate media devices:', error);
      return { audioInputs: [], videoInputs: [] };
    }
  }

  async ensureDevicePermissions({ audio = false, video = false } = {}) {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    try {
      await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
    } catch (error) {
      console.warn('Media device permission check failed:', error);
    }
  }

  async createScreenStream(sourceId) {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
        },
      },
    });
  }

  async createCameraStream(deviceId) {
    return navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
  }

  async createAudioStream(deviceId) {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  }

  buildCompositeStream(screenStream, cameraStream, overlayState) {
    if (!screenStream) {
      throw new Error('Screen stream required for composite');
    }

    const overlayRef = overlayState || { ...DEFAULT_OVERLAY };

    const [screenTrack] = screenStream.getVideoTracks();
    const dimensions = getVideoDimensions(screenTrack);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');

    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.play().catch(() => {});

    let cameraVideo = null;

    if (cameraStream) {
      cameraVideo = document.createElement('video');
      cameraVideo.srcObject = cameraStream;
      cameraVideo.muted = true;
      cameraVideo.play().catch(() => {});
    }

    let rafId = null;

    const drawFrame = () => {
      try {
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        if (cameraVideo && overlayRef) {
          const overlaySize = Math.max(0.1, Math.min(overlayRef.size || 0.2, 0.6));
          const videoWidth = canvas.width * overlaySize;
          const aspect =
            cameraVideo.videoWidth && cameraVideo.videoHeight
              ? cameraVideo.videoWidth / cameraVideo.videoHeight
              : 16 / 9;
          const videoHeight = videoWidth / aspect;

          const margin = OVERLAY_MARGIN;
          let x = canvas.width - videoWidth - margin;
          let y = margin;

          switch (overlayRef.position) {
            case 'top-left':
              x = margin;
              y = margin;
              break;
            case 'bottom-left':
              x = margin;
              y = canvas.height - videoHeight - margin;
              break;
            case 'bottom-right':
              x = canvas.width - videoWidth - margin;
              y = canvas.height - videoHeight - margin;
              break;
            case 'center':
              x = (canvas.width - videoWidth) / 2;
              y = (canvas.height - videoHeight) / 2;
              break;
            default:
              x = canvas.width - videoWidth - margin;
              y = margin;
              break;
          }

          const radius = overlayRef.borderRadius ?? 12;
          if (radius > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + videoWidth - radius, y);
            ctx.quadraticCurveTo(x + videoWidth, y, x + videoWidth, y + radius);
            ctx.lineTo(x + videoWidth, y + videoHeight - radius);
            ctx.quadraticCurveTo(
              x + videoWidth,
              y + videoHeight,
              x + videoWidth - radius,
              y + videoHeight
            );
            ctx.lineTo(x + radius, y + videoHeight);
            ctx.quadraticCurveTo(x, y + videoHeight, x, y + videoHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(cameraVideo, x, y, videoWidth, videoHeight);
            ctx.restore();
          } else {
            ctx.drawImage(cameraVideo, x, y, videoWidth, videoHeight);
          }
        }
      } catch (error) {
        console.warn('Composite draw error:', error);
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);

    const outputStream = canvas.captureStream(30);

    const dispose = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      if (screenVideo) {
        screenVideo.pause();
        screenVideo.srcObject = null;
      }
      if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
      }
    };

    return { stream: outputStream, dispose };
  }

  startMetering(stream, callback) {
    this.stopMetering();

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!stream) return;

    try {
      this.audioContext = new AudioContextCtor();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.audioSourceNode = this.audioContext.createMediaStreamSource(stream);
      this.audioSourceNode.connect(this.analyser);
      this.onMeter = callback;

      const bufferLength = this.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!this.analyser || !this.onMeter) return;

        this.analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i += 1) {
          const value = dataArray[i] - 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / bufferLength) / 128;
        this.onMeter(Math.min(1, rms));
        this.meterRaf = window.requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (error) {
      console.warn('Failed to start audio metering:', error);
      this.stopMetering();
    }
  }

  stopMetering() {
    if (this.meterRaf) {
      window.cancelAnimationFrame(this.meterRaf);
      this.meterRaf = null;
    }
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect source node:', error);
      }
      this.audioSourceNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect analyser:', error);
      }
      this.analyser = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Failed to close audio context:', error);
      }
      this.audioContext = null;
    }
    this.onMeter = null;
  }

  createBaseStream(screenStream, audioStream) {
    const tracks = [...(screenStream?.getVideoTracks() || [])];
    if (audioStream) {
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        tracks.push(audioTrack);
      }
    }
    return new MediaStream(tracks);
  }

  async startRecording({
    sourceId,
    audioEnabled = true,
    audioDeviceId = 'default',
    cameraEnabled = true,
    cameraDeviceId = 'default',
    overlay = null,
    onMeterLevel = null,
  }) {
    if (!sourceId) {
      throw new Error('No screen source selected');
    }

    if (this.baseRecorder || this.previewRecorder) {
      throw new Error('Recording already in progress');
    }

    try {
      this.cleanup();

      this.screenStream = await this.createScreenStream(sourceId);
      const screenTrack = this.screenStream.getVideoTracks()[0];
      this.screenDimensions = getVideoDimensions(screenTrack);

      if (cameraEnabled) {
        try {
          this.cameraStream = await this.createCameraStream(cameraDeviceId);
          const cameraTrack = this.cameraStream.getVideoTracks()[0];
          this.cameraDimensions = getVideoDimensions(cameraTrack);
        } catch (cameraError) {
          console.warn('Failed to access camera, continuing without PiP:', cameraError);
          this.cameraStream = null;
          this.cameraDimensions = null;
        }
      }

      if (audioEnabled) {
        try {
          this.audioStream = await this.createAudioStream(audioDeviceId);
        } catch (audioError) {
          console.warn('Failed to access microphone, continuing without audio:', audioError);
          this.audioStream = null;
        }
      }

      this.overlayState = sanitizeOverlay({
        ...DEFAULT_OVERLAY,
        ...(overlay || {}),
      });

      const baseStream = this.createBaseStream(this.screenStream, this.audioStream);
      this.outputStream = baseStream;

      const recorderOptions = {
        mimeType: VIDEO_MIME,
        videoBitsPerSecond: DEFAULT_VIDEO_BITRATE,
      };

      this.baseChunks = [];
      this.baseRecorder = new MediaRecorder(baseStream, recorderOptions);
      this.baseRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.baseChunks.push(event.data);
        }
      };
      this.baseRecorder.start(500);

      if (this.cameraStream) {
        this.cameraChunks = [];
        const cameraRecorder = new MediaRecorder(this.cameraStream, recorderOptions);
        cameraRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.cameraChunks.push(event.data);
          }
        };
        cameraRecorder.start(500);
        this.cameraRecorder = cameraRecorder;
      } else {
        this.cameraRecorder = null;
        this.cameraChunks = [];
      }

      if (this.cameraStream) {
        this.previewChunks = [];
        this.previewCompositor = this.buildCompositeStream(
          this.screenStream,
          this.cameraStream,
          this.overlayState
        );
        this.previewRecorder = new MediaRecorder(this.previewCompositor.stream, recorderOptions);
        this.previewRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.previewChunks.push(event.data);
          }
        };
        this.previewRecorder.start(500);
      } else {
        this.previewRecorder = null;
        this.previewChunks = [];
      }

      if (this.audioStream && typeof onMeterLevel === 'function') {
        this.startMetering(this.audioStream, onMeterLevel);
      }

      return {
        screenStream: this.screenStream,
        cameraStream: this.cameraStream,
        outputStream: this.outputStream,
      };
    } catch (error) {
      this.cleanup();
      console.error('Error starting recording session:', error);
      throw error;
    }
  }

  stopRecorder(recorder, chunks, mimeType = VIDEO_MIME) {
    if (!recorder) return Promise.resolve(null);

    if (recorder.state === 'inactive') {
      try {
        const blob = new Blob(chunks, { type: mimeType });
        return Promise.resolve({
          blob,
          size: blob.size,
          mimeType,
        });
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve, reject) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop);
        recorder.removeEventListener('error', handleError);
        try {
          const blob = new Blob(chunks, { type: mimeType });
          resolve({
            blob,
            size: blob.size,
            mimeType,
          });
        } catch (error) {
          reject(error);
        }
      };

      const handleError = (event) => {
        recorder.removeEventListener('stop', handleStop);
        recorder.removeEventListener('error', handleError);
        reject(event?.error || new Error('Recording error'));
      };

      recorder.addEventListener('stop', handleStop);
      recorder.addEventListener('error', handleError);

      try {
        recorder.stop();
      } catch (error) {
        recorder.removeEventListener('stop', handleStop);
        recorder.removeEventListener('error', handleError);
        reject(error);
      }
    });
  }

  async stopRecording() {
    if (!this.baseRecorder) {
      throw new Error('No active recording');
    }

    const screenDimensions = this.screenDimensions ? { ...this.screenDimensions } : null;
    const cameraDimensions = this.cameraDimensions ? { ...this.cameraDimensions } : null;
    const overlayDefaults = sanitizeOverlay(this.overlayState);

    let baseResult = null;
    let previewResult = null;
    let cameraResult = null;

    try {
      const results = await Promise.all([
        this.stopRecorder(this.baseRecorder, this.baseChunks),
        this.stopRecorder(this.previewRecorder, this.previewChunks),
        this.stopRecorder(this.cameraRecorder, this.cameraChunks),
      ]);
      [baseResult, previewResult, cameraResult] = results;
    } finally {
      this.cleanup();
    }

    return {
      base: baseResult,
      preview: previewResult,
      camera: cameraResult,
      screenDimensions,
      cameraDimensions,
      overlayDefaults: sanitizeOverlay(overlayDefaults),
      overlayMargin: OVERLAY_MARGIN,
    };
  }

  async saveBlob(blob, { fileName, extension = 'webm' }) {
    if (!blob) return null;
    if (!window?.electronAPI?.prepareRecordingPath || !window?.electronAPI?.saveFile) {
      throw new Error('Electron save APIs not available');
    }

    const targetPath = await window.electronAPI.prepareRecordingPath({
      extension,
      fileName,
    });

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await window.electronAPI.saveFile(targetPath, buffer);

    return {
      path: targetPath,
      fileName: targetPath.split(/[\\/]/).pop() || fileName,
      extension,
    };
  }

  async persistRecordingOutputs(results, options = {}) {
    if (!results) {
      throw new Error('Missing recording output payload');
    }

    const baseName =
      options.baseName || `ClipForge-Recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    const baseInfo = await this.saveBlob(results.base?.blob, {
      fileName: baseName,
      extension: options.extension || 'webm',
    });
    if (!baseInfo) {
      throw new Error('Failed to persist primary recording output');
    }

    const previewInfo = results.preview?.blob
      ? await this.saveBlob(results.preview.blob, {
          fileName: `${baseName}-preview`,
          extension: options.extension || 'webm',
        })
      : null;

    const cameraInfo = results.camera?.blob
      ? await this.saveBlob(results.camera.blob, {
          fileName: `${baseName}-camera`,
          extension: options.extension || 'webm',
        })
      : null;

    return {
      base: baseInfo,
      preview: previewInfo,
      camera: cameraInfo,
      baseName,
    };
  }

  pause() {
    if (this.baseRecorder && this.baseRecorder.state === 'recording') {
      try {
        this.baseRecorder.pause();
      } catch (error) {
        console.warn('Failed to pause base recorder:', error);
      }
    }
    if (this.previewRecorder && this.previewRecorder.state === 'recording') {
      try {
        this.previewRecorder.pause();
      } catch (error) {
        console.warn('Failed to pause preview recorder:', error);
      }
    }
    if (this.cameraRecorder && this.cameraRecorder.state === 'recording') {
      try {
        this.cameraRecorder.pause();
      } catch (error) {
        console.warn('Failed to pause camera recorder:', error);
      }
    }
  }

  resume() {
    if (this.baseRecorder && this.baseRecorder.state === 'paused') {
      try {
        this.baseRecorder.resume();
      } catch (error) {
        console.warn('Failed to resume base recorder:', error);
      }
    }
    if (this.previewRecorder && this.previewRecorder.state === 'paused') {
      try {
        this.previewRecorder.resume();
      } catch (error) {
        console.warn('Failed to resume preview recorder:', error);
      }
    }
    if (this.cameraRecorder && this.cameraRecorder.state === 'paused') {
      try {
        this.cameraRecorder.resume();
      } catch (error) {
        console.warn('Failed to resume camera recorder:', error);
      }
    }
  }

  setMicrophoneMuted(muted) {
    if (!this.audioStream) return;
    this.audioStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  updateOverlay(updates = {}) {
    const current = this.overlayState || DEFAULT_OVERLAY;
    this.overlayState = sanitizeOverlay({ ...current, ...updates }, current);
    if (this.previewRecorder && this.previewRecorder.state !== 'inactive') {
      // The composite stream references overlayState by reference,
      // so updates will reflect automatically on the next frame.
    }
  }

  cleanup() {
    this.stopMetering();

    if (this.previewCompositor?.dispose) {
      try {
        this.previewCompositor.dispose();
      } catch (error) {
        console.warn('Failed to dispose compositor:', error);
      }
    }
    this.previewCompositor = null;

    stopStreamTracks(this.outputStream);
    stopStreamTracks(this.screenStream);
    stopStreamTracks(this.cameraStream);
    stopStreamTracks(this.audioStream);

    this.outputStream = null;
    this.screenStream = null;
    this.cameraStream = null;
    this.audioStream = null;

    this.overlayState = { ...DEFAULT_OVERLAY };

    this.baseRecorder = null;
    this.previewRecorder = null;
    this.cameraRecorder = null;

    this.baseChunks = [];
    this.previewChunks = [];
    this.cameraChunks = [];

    this.screenDimensions = null;
    this.cameraDimensions = null;
  }
}

export const recordingService = new RecordingService();
