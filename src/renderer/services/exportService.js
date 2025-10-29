/**
 * Export Service - Handles video export and rendering
 */

import { mergeClips, initVideoService } from './videoService';
import { useSettingsStore } from '@/store/settingsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { resolveFileSystemPath } from '@/lib/fileUtils';

const hasPerformanceNow =
  typeof performance !== 'undefined' && typeof performance.now === 'function';

const now = () => (hasPerformanceNow ? performance.now() : Date.now());

const shouldLogExportMetrics = () => {
  if (typeof process !== 'undefined' && process?.env?.CLIPFORGE_EXPORT_METRICS === '1') {
    return true;
  }

  if (typeof window !== 'undefined' && window?.__CLIPFORGE_EXPORT_METRICS__ === true) {
    return true;
  }

  if (typeof import.meta !== 'undefined') {
    const env = import.meta?.env;
    if (env) {
      if (env.VITE_EXPORT_METRICS === 'true') {
        return true;
      }
      if (env.MODE === 'development' && env.VITE_EXPORT_METRICS !== 'false') {
        return true;
      }
    }
  }

  return false;
};

const emitExportMetric = (name, detail) => {
  if (!shouldLogExportMetrics()) {
    return;
  }

  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(`[metrics:${name}]`, detail);
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // Ignore CustomEvent dispatch failures (e.g. test env)
    }
  }
};

export class ExportService {
  constructor() {
    this.isExporting = false;
    this.currentProgress = 0;
    this.onProgressCallback = null;
    this.currentStage = null;
    this.activeNativeJobId = null;

    if (typeof window !== 'undefined') {
      this._ffmpegProgressListener = (event) => {
        const value = event?.detail?.progress ?? 0;
        this.handleFFmpegProgress(value);
      };
      window.addEventListener('ffmpeg-progress', this._ffmpegProgressListener);

      if (window.electronAPI?.onNativeExportProgress) {
        this._nativeProgressDispose = window.electronAPI.onNativeExportProgress((payload) => {
          if (!payload || !payload.jobId || payload.jobId !== this.activeNativeJobId) {
            return;
          }
          const ratio = payload.progress?.ratio;
          if (typeof ratio === 'number' && Number.isFinite(ratio)) {
            this.handleFFmpegProgress(Math.max(0, Math.min(1, ratio)));
          }
        });
      }
    }
  }

  handleFFmpegProgress(progressValue) {
    if (!this.isExporting || this.currentStage == null) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, progressValue));
    let mapped = this.currentProgress;

    if (this.currentStage === 'merge') {
      mapped = 10 + clamped * 40; // 10% -> 50%
    } else if (this.currentStage === 'encode') {
      mapped = 50 + clamped * 40; // 50% -> 90%
    }

    this.updateProgress(Math.floor(mapped));
  }
  
  /**
   * Set progress callback
   */
  onProgress(callback) {
    this.onProgressCallback = callback;
  }
  
  /**
   * Export timeline to video file
   */
  async exportTimeline(options = {}) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }
    
    this.isExporting = true;
    this.currentProgress = 0;
    const metricsEnabled = shouldLogExportMetrics();
    const metrics = metricsEnabled
      ? {
          startedAt: Date.now(),
          startHighRes: now(),
          clipCount: 0,
          stages: [],
          success: false,
        }
      : null;
    let metricsEmitted = false;
    
    try {
      // Get timeline clips
      const timelineStore = useTimelineStore.getState();
      const mediaStore = useMediaStore.getState();
      const { clips } = timelineStore;
      
      if (clips.length === 0) {
        throw new Error('No clips to export');
      }

      if (metrics) {
        metrics.clipCount = clips.length;
      }

      const initResult = await initVideoService();
      const ffmpegReady =
        initResult === true || initResult?.success === true;

      if (!ffmpegReady) {
        const initError = initResult?.error;
        const pipelineError = new Error('Unable to initialize export pipeline');
        if (initError) {
          pipelineError.cause = initError;
          pipelineError.details = initError.message || String(initError);
        }
        throw pipelineError;
      }
      
      // Prepare clip data with file paths
      const clipData = [...clips]
        .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
        .map((clip) => {
          const mediaFile = mediaStore.files.find((f) => f.id === clip.mediaFileId);
          if (!mediaFile) return null;

          const recordingMeta = mediaFile.recordingMeta || clip.recordingMeta || {};
          const fileSystemPath = resolveFileSystemPath(mediaFile);

          const baseSource =
            recordingMeta.baseFile ||
            mediaFile.originalFile ||
            recordingMeta.basePath ||
            fileSystemPath ||
            mediaStore.fileBlobUrls?.[mediaFile.id] ||
            mediaFile.path;

          if (!baseSource) return null;

          const duration =
            clip.duration ??
            mediaFile.durationSeconds ??
            Math.max(0, (clip.end ?? 0) - (clip.start ?? 0));

          const sourceIn = clip.sourceIn ?? 0;
          const sourceOut =
            clip.sourceOut ??
            (clip.sourceIn != null ? clip.sourceIn + duration : duration);

          return {
            id: clip.id,
            source: baseSource,
            overlaySource: recordingMeta.cameraFile || recordingMeta.cameraPath || null,
            overlayKeyframes: recordingMeta.overlayKeyframes || null,
            overlayDefaults: recordingMeta.overlay || recordingMeta.overlayDefaults || null,
            overlayMargin: recordingMeta.overlayMargin,
            screenResolution:
              recordingMeta.screenResolution || {
                width: mediaFile.width,
                height: mediaFile.height,
              },
            cameraResolution: recordingMeta.cameraResolution || null,
            previewSource:
              recordingMeta.previewFile ||
              mediaFile.originalFile ||
              recordingMeta.previewPath ||
              fileSystemPath,
            duration,
            sourceIn,
            sourceOut,
            name: mediaFile.name,
            sourceType: mediaFile.sourceType,
            recordingMeta,
          };
        })
        .filter(Boolean);
      
      if (clipData.length === 0) {
        throw new Error('No valid clips found');
      }
      
      // Update progress
      this.updateProgress(10);

      this.currentStage = 'merge';
      
      // Merge all clips
      const mergeStart = metrics ? now() : 0;
      const mergedData = await mergeClips(clipData);
      if (metrics) {
        metrics.stages.push({
          name: 'mergeClips',
          durationMs: Math.max(0, now() - mergeStart),
          clipCount: clipData.length,
        });
      }
      
      this.updateProgress(50);
      this.currentStage = 'encode';
      
      // Normalize to Uint8Array
      const mergedBuffer =
        mergedData instanceof Uint8Array
          ? mergedData
          : new Uint8Array(await mergedData.arrayBuffer());
      
      this.updateProgress(70);
      
      // Apply export settings: merge modal options with Settings defaults
      const settings = useSettingsStore.getState()?.export || {};
      const effectiveOptions = {
        resolution: options?.resolution ?? settings.resolution ?? null,
        fps: options?.fps ?? settings.fps ?? null,
        bitrate: options?.bitrate ?? settings.bitrate ?? null,
        codec: options?.codec ?? settings.codec ?? null,
        crf: options?.crf ?? settings.crf ?? null,
        preset: options?.preset ?? settings.preset ?? null,
        format: options?.format ?? settings.format ?? 'mp4',
        hardware: options?.hardware ?? settings.hardware ?? 'auto',
        engine: options?.engine ?? settings.engine ?? 'wasm',
        durationSeconds: this.calculateTotalDuration(clipData),
      };

      const encodeStart = metrics ? now() : 0;
      const exportedBuffer = await this.applyExportSettings(mergedBuffer, effectiveOptions);
      if (metrics) {
        metrics.stages.push({
          name: 'encode',
          durationMs: Math.max(0, now() - encodeStart),
          options: {
            resolution: effectiveOptions.resolution ?? null,
            fps: effectiveOptions.fps ?? null,
            bitrate: effectiveOptions.bitrate ?? null,
            codec: effectiveOptions.codec ?? null,
            crf: effectiveOptions.crf ?? null,
            preset: effectiveOptions.preset ?? null,
          },
          outputBytes: exportedBuffer?.byteLength ?? null,
        });
      }
      
      this.updateProgress(90);
      
      // Save to file
      const filePath =
        options.outputPath || (await this.getDefaultExportPath());

      if (!filePath) {
        throw new Error('Export cancelled');
      }

      const saveStart = metrics ? now() : 0;
      await this.saveExport(filePath, exportedBuffer);
      if (metrics) {
        metrics.stages.push({
          name: 'save',
          durationMs: Math.max(0, now() - saveStart),
          outputPathProvided: Boolean(options.outputPath),
        });
      }
      
      this.updateProgress(100);
      this.currentStage = null;

      if (metrics) {
        metrics.success = true;
        metrics.outputPath = filePath;
        metrics.timelineDurationSeconds = this.calculateTotalDuration(clipData);
        metrics.outputBytes = exportedBuffer?.byteLength ?? null;
        metrics.totalDurationMs = Math.max(0, now() - metrics.startHighRes);
        emitExportMetric('export:pipeline', metrics);
        metricsEmitted = true;
      }
      
      return {
        filePath,
        size: exportedBuffer.byteLength,
        duration: this.calculateTotalDuration(clipData)
      };
    } catch (error) {
      if (metrics) {
        metrics.success = false;
        metrics.error = {
          name: error?.name || 'Error',
          message: error?.message || String(error),
        };
      }
      console.error('Export error:', error);
      throw error;
    } finally {
      this.isExporting = false;
      this.currentStage = null;
      if (metrics && !metricsEmitted) {
        metrics.totalDurationMs = Math.max(0, now() - metrics.startHighRes);
        emitExportMetric('export:pipeline', metrics);
      }
    }
  }
  
  /**
   * Apply export settings to video
   */
  async applyExportSettings(buffer, options) {
    try {
      const initResult = await initVideoService();
      const ffmpegReady = initResult === true || initResult?.success === true;
      if (!ffmpegReady) {
        return buffer;
      }

      const enginePreference = options?.engine || 'wasm';
      if (enginePreference !== 'wasm' && window.electronAPI?.exportVideoNative) {
        const nativeJobId = `native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.activeNativeJobId = nativeJobId;
        try {
          const nativeResult = await window.electronAPI.exportVideoNative({
            source: buffer,
            options: {
              resolution: options?.resolution ?? null,
              fps: options?.fps ?? null,
              bitrate: options?.bitrate ?? null,
              crf: options?.crf ?? null,
              preset: options?.preset ?? null,
              hardware: options?.hardware ?? 'auto',
              audioBitrate: options?.audioBitrate ?? '192k',
            },
            durationSeconds: options?.durationSeconds ?? null,
            returnBuffer: true,
            jobId: nativeJobId,
          });

          if (nativeResult?.success && nativeResult?.buffer) {
            const nativeBuffer = nativeResult.buffer instanceof Uint8Array
              ? nativeResult.buffer
              : new Uint8Array(nativeResult.buffer);
            this.activeNativeJobId = null;
            return nativeBuffer;
          }
        } catch (error) {
          console.warn('Native export failed, falling back to WASM pipeline:', error);
        } finally {
          this.activeNativeJobId = null;
        }
      }

      const module = (initResult?.module) || (await ensureInitialized?.());
      const worker = module || (await import('../../media/ffmpegWorker.js'));

      const exported = await worker.exportVideo(buffer, 'final-export.mp4', {
        resolution: options?.resolution ?? null,
        fps: options?.fps ?? null,
        bitrate: options?.bitrate ?? null,
        codec: options?.codec ?? null,
        crf: options?.crf ?? null,
        preset: options?.preset ?? null,
        format: options?.format ?? 'mp4',
        hardware: options?.hardware ?? 'auto',
      });

      return exported instanceof Uint8Array
        ? exported
        : new Uint8Array(await exported.arrayBuffer());
    } catch (_) {
      // Fall back to original buffer if export transform fails
      return buffer;
    }
  }
  
  /**
   * Save exported video to file
   */
  async saveExport(filePath, buffer) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    
    await window.electronAPI.saveFile(filePath, buffer);
  }
  
  /**
   * Get default export path
   */
  async getDefaultExportPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `ClipForge-${timestamp}.mp4`;

    if (window.electronAPI?.chooseExportPath) {
      return await window.electronAPI.chooseExportPath(defaultName);
    }

    return null;
  }
  
  /**
   * Calculate total duration of timeline
   */
  calculateTotalDuration(clipData) {
    return clipData.reduce((total, clip) => {
      return total + (clip.duration ?? 0);
    }, 0);
  }
  
  /**
   * Update export progress
   */
  updateProgress(percent) {
    this.currentProgress = percent;
    if (this.onProgressCallback) {
      this.onProgressCallback(percent);
    }
  }
  
  /**
   * Cancel export
   */
  cancelExport() {
    this.isExporting = false;
    this.currentProgress = 0;
  }
  
  /**
   * Get export options based on quality preset
   */
  getExportPreset(preset) {
    const presets = {
      '720p': {
        resolution: '1280x720',
        bitrate: '5000k',
        crf: 23,
        preset: 'veryfast',
      },
      '1080p': {
        resolution: '1920x1080',
        bitrate: '8000k',
        crf: 23,
        preset: 'veryfast',
      },
      '4k': {
        resolution: '3840x2160',
        bitrate: '25000k',
        crf: 23,
        preset: 'faster',
      },
      'source': {
        resolution: null,
        bitrate: null,
        crf: 23,
        preset: 'veryfast',
      }
    };
    
    return presets[preset] || presets['1080p'];
  }
}

export const exportService = new ExportService();
