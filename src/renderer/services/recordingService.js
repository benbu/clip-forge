/**
 * Recording Service - Handles screen + webcam recording and audio routing
 */

const VIDEO_MIME = 'video/webm;codecs=vp9,opus';
const DEFAULT_VIDEO_BITRATE = 3000000; // 3 Mbps

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
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.outputStream = null;
    this.screenStream = null;
    this.cameraStream = null;
    this.audioStream = null;
    this.compositor = null;

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

  buildCompositeStream(screenStream, cameraStream, overlay) {
    if (!screenStream) {
      throw new Error('Screen stream required for composite');
    }

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

        if (cameraVideo && overlay) {
          const overlaySize = Math.max(0.1, Math.min(overlay.size || 0.2, 0.5));
          const videoWidth = canvas.width * overlaySize;
          const aspect = cameraVideo.videoWidth && cameraVideo.videoHeight
            ? cameraVideo.videoWidth / cameraVideo.videoHeight
            : 16 / 9;
          const videoHeight = videoWidth / aspect;

          const margin = 24;
          let x = canvas.width - videoWidth - margin;
          let y = margin;

          switch (overlay.position) {
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

          const radius = overlay.borderRadius ?? 12;
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
        rafId = null;
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

    if (this.mediaRecorder) {
      throw new Error('Recording already in progress');
    }

    try {
      this.cleanup();

      this.screenStream = await this.createScreenStream(sourceId);

      if (cameraEnabled) {
        try {
          this.cameraStream = await this.createCameraStream(cameraDeviceId);
        } catch (cameraError) {
          console.warn('Failed to access camera, continuing without PiP:', cameraError);
          this.cameraStream = null;
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

      let finalStream = this.screenStream;
      if (this.cameraStream) {
        this.compositor = this.buildCompositeStream(this.screenStream, this.cameraStream, overlay);
        finalStream = this.compositor.stream;
      }

      if (this.audioStream) {
        const audioTrack = this.audioStream.getAudioTracks()[0];
        if (audioTrack && finalStream.getAudioTracks().length === 0) {
          finalStream.addTrack(audioTrack);
        }
      }

      const options = {
        mimeType: VIDEO_MIME,
        videoBitsPerSecond: DEFAULT_VIDEO_BITRATE,
      };

      this.mediaRecorder = new MediaRecorder(finalStream, options);
      this.recordedChunks = [];
      this.outputStream = finalStream;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(500);

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

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.pause();
      } catch (error) {
        console.warn('Failed to pause media recorder:', error);
      }
    }
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      try {
        this.mediaRecorder.resume();
      } catch (error) {
        console.warn('Failed to resume media recorder:', error);
      }
    }
  }

  async stopRecording() {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;

      recorder.onstop = () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: VIDEO_MIME });
          const url = URL.createObjectURL(blob);
          const size = blob.size;
          this.cleanup();
          resolve({ blob, url, size });
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      recorder.onerror = (event) => {
        const error = event.error || new Error('Unknown recording error');
        this.cleanup();
        reject(error);
      };

      try {
        recorder.stop();
      } catch (stopError) {
        this.cleanup();
        reject(stopError);
      }
    });
  }

  async persistRecordingBlob(blob, options = {}) {
    if (!window?.electronAPI?.prepareRecordingPath || !window?.electronAPI?.saveFile) {
      throw new Error('Electron save APIs not available');
    }

    const { extension = 'webm', fileName = null } = options;
    const targetPath = await window.electronAPI.prepareRecordingPath({
      extension,
      fileName,
    });

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await window.electronAPI.saveFile(targetPath, buffer);

    return targetPath;
  }

  setMicrophoneMuted(muted) {
    if (!this.audioStream) return;
    this.audioStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  cleanup() {
    this.stopMetering();

    if (this.compositor?.dispose) {
      try {
        this.compositor.dispose();
      } catch (error) {
        console.warn('Failed to dispose compositor:', error);
      }
    }
    this.compositor = null;

    stopStreamTracks(this.outputStream);
    stopStreamTracks(this.screenStream);
    stopStreamTracks(this.cameraStream);
    stopStreamTracks(this.audioStream);

    this.outputStream = null;
    this.screenStream = null;
    this.cameraStream = null;
    this.audioStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

export const recordingService = new RecordingService();
