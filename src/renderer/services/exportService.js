/**
 * Export Service - Handles video export pipeline, queue management, and telemetry
 */

import { mergeClips, initVideoService } from './videoService';
import { useSettingsStore } from '@/store/settingsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { useExportQueueStore, getJobById } from '@/store/exportQueueStore';

const STAGE_ORDER = ['preparing', 'merging', 'encoding', 'saving', 'validating'];
const STAGE_WEIGHTS = {
  preparing: 5,
  merging: 40,
  encoding: 40,
  saving: 10,
  validating: 5,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const deepClone = (value) => {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (_) {
      // Fallthrough to JSON stringify clone if structured clone fails (e.g. Blob)
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
};

const generateJobId = () => `export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

class ExportCancelledError extends Error {
  constructor(message = 'Export cancelled') {
    super(message);
    this.name = 'ExportCancelledError';
  }
}

const sanitizeFileComponent = (value) =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export class ExportService {
  constructor() {
    this.isExporting = false;
    this.currentProgress = 0;
    this.currentStage = null;
    this.currentJobId = null;
    this.currentJobCancelRequested = false;
    this.exportStartTime = null;
    this.currentStageStart = null;
    this.queuePaused = false;

    this.jobDeferreds = new Map();
    this.runtimeJobState = new Map();
    this.progressSubscribers = new Set();
    this.legacyProgressCallback = null;

    if (typeof window !== 'undefined') {
      this._ffmpegProgressListener = (event) => {
        const value = event?.detail?.progress ?? 0;
        this.handleFFmpegProgress(value);
      };
      this._ffmpegLogListener = (event) => {
        this.handleFFmpegLog(event?.detail);
      };
      window.addEventListener('ffmpeg-progress', this._ffmpegProgressListener);
      window.addEventListener('ffmpeg-log', this._ffmpegLogListener);
    }
  }

  /**
   * Subscribe to progress updates (percent, ETA, stage)
   */
  onProgress(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
    this.legacyProgressCallback = callback;
    return () => {
      if (this.legacyProgressCallback === callback) {
        this.legacyProgressCallback = null;
      }
    };
  }

  subscribeProgress(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
    this.progressSubscribers.add(callback);
    return () => {
      this.progressSubscribers.delete(callback);
    };
  }

  _emitProgress(payload) {
    if (typeof this.legacyProgressCallback === 'function') {
      try {
        this.legacyProgressCallback(payload.percent, payload);
      } catch (error) {
        console.error('Export progress listener error:', error);
      }
    }

    this.progressSubscribers.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Export progress listener error:', error);
      }
    });
  }

  /**
   * Queue an export job (returns job descriptor; call awaitJob for completion)
   */
  enqueueExport(request = {}) {
    const job = this._createJob(request);
    const deferred = createDeferred();
    this.jobDeferreds.set(job.id, deferred);
    this.runtimeJobState.set(job.id, { cancelRequested: false });
    useExportQueueStore.getState().addJob(job);
    this.processQueue();
    return job;
  }

  /**
   * Await the completion of a previously queued job
   */
  awaitJob(jobId) {
    const deferred = this.jobDeferreds.get(jobId);
    if (deferred) {
      return deferred.promise;
    }
    return Promise.reject(new Error(`Unknown export job: ${jobId}`));
  }

  /**
   * Legacy API - immediately queue and await export
   */
  exportTimeline(options = {}) {
    const job = this.enqueueExport({ options });
    return this.awaitJob(job.id);
  }

  pauseQueue() {
    this.queuePaused = true;
    useExportQueueStore.getState().setPaused(true);
  }

  resumeQueue() {
    this.queuePaused = false;
    useExportQueueStore.getState().setPaused(false);
    this.processQueue();
  }

  cancelJob(jobId) {
    const state = useExportQueueStore.getState();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      useExportQueueStore.getState().updateJob(jobId, {
        status: 'cancelled',
        finishedAt: Date.now(),
        stage: 'cancelled',
        etaSeconds: null,
        progress: 0,
      });
      this._rejectJob(jobId, new ExportCancelledError());
      return true;
    }

    if (jobId === this.currentJobId && this.isExporting) {
      const runtime = this.runtimeJobState.get(jobId) || { cancelRequested: false };
      runtime.cancelRequested = true;
      this.runtimeJobState.set(jobId, runtime);
      useExportQueueStore.getState().updateJob(jobId, {
        status: 'cancelling',
        stage: 'cancelling',
      });
      return true;
    }

    return false;
  }

  retryJob(jobId) {
    const job = getJobById(jobId);
    if (!job) return null;
    return this.enqueueExport({
      options: job.options,
      metadata: job.metadata,
      outputPath: null,
      timelineSnapshot: job.timelineSnapshot,
      mediaSnapshot: job.mediaSnapshot,
      mediaBlobUrls: job.mediaBlobUrls,
    });
  }

  processQueue() {
    if (this.isExporting) return;
    if (this.queuePaused || useExportQueueStore.getState().paused) return;

    const state = useExportQueueStore.getState();
    const nextJob = state.jobs.find((job) => job.status === 'pending');
    if (!nextJob) return;

    this.isExporting = true;
    this.currentJobId = nextJob.id;
    this.currentJobCancelRequested = false;
    this.exportStartTime = Date.now();
    this.currentStageStart = Date.now();
    this.currentStage = 'preparing';

    useExportQueueStore.getState().setActiveJob(nextJob.id);
    useExportQueueStore.getState().updateJob(nextJob.id, {
      status: 'processing',
      startedAt: this.exportStartTime,
      stage: 'preparing',
      progress: 0,
      etaSeconds: null,
    });

    this.updateProgress(this._stageBase('preparing'));

    this._runJob(nextJob.id)
      .then((result) => {
        useExportQueueStore.getState().updateJob(nextJob.id, {
          status: 'completed',
          finishedAt: Date.now(),
          stage: 'completed',
          progress: 100,
          etaSeconds: 0,
          result,
        });
        this._resolveJob(nextJob.id, result);
      })
      .catch((error) => {
        const status = error instanceof ExportCancelledError ? 'cancelled' : 'failed';
        useExportQueueStore.getState().updateJob(nextJob.id, {
          status,
          finishedAt: Date.now(),
          stage: status,
          etaSeconds: null,
          error: {
            message: error.message,
            details: error.details || error.cause?.message || null,
          },
        });
        this._rejectJob(nextJob.id, error);
      })
      .finally(() => {
        this.isExporting = false;
        this.currentJobId = null;
        this.currentStage = null;
        this.exportStartTime = null;
        this.currentStageStart = null;
        this.processQueue();
      });
  }

  async _runJob(jobId) {
    const job = getJobById(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    const runtime = this.runtimeJobState.get(jobId) || { cancelRequested: false };
    this.runtimeJobState.set(jobId, runtime);

    const result = await this._executeJob(job, runtime);
    return result;
  }

  async _executeJob(job, runtimeState) {
    const timelineClips = Array.isArray(job.timelineSnapshot) ? job.timelineSnapshot : [];
    if (!timelineClips.length) {
      throw new Error('No clips to export');
    }

    const initResult = await initVideoService();
    const ffmpegReady = initResult === true || initResult?.success === true;
    if (!ffmpegReady) {
      const initError = initResult?.error;
      const pipelineError = new Error('Unable to initialize export pipeline');
      if (initError) {
        pipelineError.cause = initError;
        pipelineError.details = initError.message || String(initError);
      }
      throw pipelineError;
    }

    this._ensureNotCancelled(runtimeState);

    this._setStage('merging');
    const clipData = this._buildClipData(job);
    if (!clipData.length) {
      throw new Error('No valid clips found');
    }

    this._ensureNotCancelled(runtimeState);
    const mergedData = await mergeClips(clipData);

    this._ensureNotCancelled(runtimeState);
    this._setStage('encoding');

    const mergedBuffer =
      mergedData instanceof Uint8Array
        ? mergedData
        : new Uint8Array(await mergedData.arrayBuffer());

    const exportedBuffer = await this.applyExportSettings(mergedBuffer, job.options, initResult?.module);

    this._ensureNotCancelled(runtimeState);
    this._setStage('saving');

    const filePath = await this._resolveOutputPath(job);
    if (!filePath) {
      throw new ExportCancelledError('Export cancelled');
    }

    await this._ensureDiskSpace(filePath, exportedBuffer.byteLength);

    this._ensureNotCancelled(runtimeState);
    await this.saveExport(filePath, exportedBuffer);

    this._ensureNotCancelled(runtimeState);
    this._setStage('validating');

    const validation = await this.validateExport(filePath, exportedBuffer, job, initResult?.module);

    this.updateProgress(100);

    const latestJob = getJobById(job.id);

    return {
      filePath,
      size: exportedBuffer.byteLength,
      duration: this.calculateTotalDuration(clipData),
      validation,
      metadata: job.metadata,
      options: job.options,
      logs: latestJob?.logs || [],
    };
  }

  _createJob(request = {}) {
    const settingsState = useSettingsStore.getState();
    const timelineState = useTimelineStore.getState();
    const mediaState = useMediaStore.getState();

    const options = this._resolveOptions(request.options || {}, settingsState);
    const metadata = this._resolveMetadata(request.metadata || {});

    const timelineSnapshot = deepClone(
      request.timelineSnapshot != null ? request.timelineSnapshot : timelineState.clips || []
    );
    const mediaSnapshot = deepClone(
      request.mediaSnapshot != null ? request.mediaSnapshot : mediaState.files || []
    );
    const mediaBlobUrls = deepClone(
      request.mediaBlobUrls != null ? request.mediaBlobUrls : mediaState.fileBlobUrls || {}
    );

    const durationSeconds = Array.isArray(timelineSnapshot)
      ? timelineSnapshot.reduce((total, clip) => total + (Number(clip.duration) || 0), 0)
      : 0;

    return {
      id: generateJobId(),
      status: 'pending',
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      progress: 0,
      stage: 'queued',
      etaSeconds: null,
      options,
      metadata,
      outputPath: request.outputPath || null,
      timelineSnapshot,
      mediaSnapshot,
      mediaBlobUrls,
      summary: {
        clipCount: Array.isArray(timelineSnapshot) ? timelineSnapshot.length : 0,
        durationSeconds,
      },
      logs: [],
    };
  }

  _resolveOptions(options, settingsState) {
    const defaults = settingsState?.export || {};
    const format = options?.format || defaults.format || 'mp4';
    const resolved = {
      resolution: options?.resolution || defaults.resolution || '1920x1080',
      fps: options?.fps ?? defaults.fps ?? 60,
      format,
      bitrate: options?.bitrate || defaults.bitrate || '8000k',
      crf: options?.crf ?? defaults.crf ?? 23,
      preset: options?.preset || defaults.preset || 'veryfast',
      codec: options?.codec || defaults.codec || this._codecForFormat(format),
    };
    return resolved;
  }

  _codecForFormat(format = 'mp4') {
    const lower = String(format).toLowerCase();
    if (lower === 'webm') return 'libvpx-vp9';
    if (lower === 'mov') return 'prores_ks';
    return 'libx264';
  }

  _resolveMetadata(metadata = {}) {
    const fallback = `ClipForge Export ${new Date().toLocaleString()}`;
    return {
      title: metadata.title?.trim() || fallback,
      notes: metadata.notes || '',
    };
  }

  _buildClipData(job) {
    const mediaFiles = Array.isArray(job.mediaSnapshot) ? job.mediaSnapshot : [];
    const blobUrls = job.mediaBlobUrls || {};
    const timelineClips = Array.isArray(job.timelineSnapshot) ? job.timelineSnapshot : [];

    return timelineClips
      .slice()
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
      .map((clip) => {
        const mediaFile = mediaFiles.find((file) => file.id === clip.mediaFileId);
        if (!mediaFile) return null;

        const recordingMeta = clip.recordingMeta || mediaFile.recordingMeta || {};
        const baseSource =
          recordingMeta.baseFile ||
          mediaFile.originalFile ||
          recordingMeta.basePath ||
          blobUrls?.[mediaFile.id] ||
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

        const baseOverlayDefaults = recordingMeta.overlay || recordingMeta.overlayDefaults || null;
        const overlayTransform = clip.overlayTransform;
        const overlayDefaults = overlayTransform
          ? {
              ...(baseOverlayDefaults || {}),
              ...overlayTransform,
            }
          : baseOverlayDefaults;

        const volumeScalar = Math.max(0, Number(clip.volume ?? recordingMeta.volume ?? 100) / 100);

        return {
          id: clip.id,
          source: baseSource,
          overlaySource: recordingMeta.cameraFile || recordingMeta.cameraPath || null,
          overlayKeyframes: clip.overlayKeyframes || recordingMeta.overlayKeyframes || null,
          overlayDefaults,
          overlayMargin: recordingMeta.overlayMargin,
          screenResolution:
            recordingMeta.screenResolution || {
              width: mediaFile.width,
              height: mediaFile.height,
            },
          cameraResolution: recordingMeta.cameraResolution || null,
          previewSource:
            recordingMeta.previewFile || mediaFile.originalFile || mediaFile.path,
          duration,
          sourceIn,
          sourceOut,
          name: mediaFile.name,
          sourceType: mediaFile.sourceType,
          recordingMeta,
          volume: volumeScalar,
        };
      })
      .filter(Boolean);
  }

  async applyExportSettings(buffer, options, moduleFromInit) {
    try {
      const initModule = moduleFromInit || (await initVideoService())?.module;
      const module = initModule || (await import('../../media/ffmpegWorker.js'));
      const exportName = this._tempOutputName(options?.format);
      const exported = await module.exportVideo(buffer, exportName, {
        resolution: options?.resolution || '1920x1080',
        fps: options?.fps ?? 60,
        bitrate: options?.bitrate || '8000k',
        codec: options?.codec || this._codecForFormat(options?.format),
        crf: options?.crf ?? 23,
        preset: options?.preset || 'veryfast',
        format: options?.format || 'mp4',
      });

      return exported instanceof Uint8Array
        ? exported
        : new Uint8Array(await exported.arrayBuffer());
    } catch (error) {
      console.warn('applyExportSettings failed, returning original buffer', error);
      return buffer;
    }
  }

  async saveExport(filePath, buffer) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    await window.electronAPI.saveFile(filePath, buffer);
  }

  async getDefaultExportPath(job) {
    const extension = this._extensionForFormat(job?.options?.format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fallbackTitle = `ClipForge-${timestamp}`;
    const rawTitle = job?.metadata?.title || fallbackTitle;
    const baseTitle = sanitizeFileComponent(rawTitle) || fallbackTitle;
    const defaultName = baseTitle.endsWith(extension) ? baseTitle : `${baseTitle}${extension}`;

    if (window.electronAPI?.chooseExportPath) {
      return window.electronAPI.chooseExportPath(defaultName);
    }

    return null;
  }

  calculateTotalDuration(clipData) {
    return clipData.reduce((total, clip) => total + (clip.duration ?? 0), 0);
  }

  handleFFmpegProgress(progressValue) {
    if (!this.isExporting || !this.currentStage) return;
    const stage = this.currentStage;
    const weight = STAGE_WEIGHTS[stage] || 0;
    if (weight === 0) return;
    const base = this._stageBase(stage);
    const clamped = clamp(Number(progressValue) || 0, 0, 1);
    const mapped = base + clamped * weight;
    this.updateProgress(mapped);
  }

  handleFFmpegLog(detail) {
    if (!detail || !this.currentJobId) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level: detail.level || detail.type || 'info',
      message: detail.message || '',
      stage: this.currentStage,
    };

    try {
      useExportQueueStore.getState().appendJobLog(this.currentJobId, entry);
    } catch (error) {
      console.error('Failed to append export log entry', error);
    }
  }

  updateProgress(percent, extra = {}) {
    const clampedPercent = clamp(Math.round(Number(percent) || 0), 0, 100);
    this.currentProgress = clampedPercent;
    const now = Date.now();
    const elapsedMs = this.exportStartTime ? now - this.exportStartTime : null;
    const fraction = clampedPercent / 100;
    const etaSeconds =
      fraction > 0 && fraction < 1 && elapsedMs != null
        ? Math.max(0, (elapsedMs / fraction - elapsedMs) / 1000)
        : fraction >= 1
          ? 0
          : null;

    const payload = {
      percent: clampedPercent,
      stage: this.currentStage,
      etaSeconds,
      jobId: this.currentJobId,
      ...extra,
    };

    if (this.currentJobId) {
      useExportQueueStore.getState().updateJob(this.currentJobId, {
        progress: clampedPercent,
        stage: this.currentStage,
        etaSeconds,
        lastUpdatedAt: now,
      });
    }

    this._emitProgress(payload);
  }

  _stageBase(stage) {
    const index = STAGE_ORDER.indexOf(stage);
    if (index <= 0) return 0;
    let total = 0;
    for (let i = 0; i < index; i += 1) {
      const key = STAGE_ORDER[i];
      total += STAGE_WEIGHTS[key] || 0;
    }
    return total;
  }

  _setStage(stage) {
    this.currentStage = stage;
    this.currentStageStart = Date.now();
    if (this.currentJobId) {
      useExportQueueStore.getState().updateJob(this.currentJobId, {
        stage,
      });
    }
    this.updateProgress(this._stageBase(stage));
  }

  _resolveOutputPath(job) {
    if (job.outputPath) return job.outputPath;
    return this.getDefaultExportPath(job);
  }

  async _ensureDiskSpace(filePath, bytes) {
    if (!window.electronAPI?.getDiskFree) return;
    const info = await window.electronAPI.getDiskFree(filePath);
    const freeBytes = info?.bytes != null ? Number(info.bytes) : null;
    if (!Number.isFinite(freeBytes)) return;

    const needed = bytes + 200 * 1024 * 1024; // add 200MB safety margin
    if (freeBytes < needed) {
      const err = new Error('Insufficient disk space for export');
      err.details = `Free: ${Math.round(freeBytes / (1024 * 1024))} MB, Needed: ${Math.round(needed / (1024 * 1024))} MB`;
      throw err;
    }
  }

  async validateExport(filePath, buffer, job, ffmpegModule) {
    const summary = {
      ok: true,
      filePath,
      expectedSize: buffer?.byteLength ?? null,
      fsSize: null,
      fileExists: null,
      probe: null,
    };

    try {
      if (window.electronAPI?.fileExists) {
        const existsInfo = await window.electronAPI.fileExists(filePath);
        summary.fileExists = !!existsInfo?.exists;
        summary.fsSize = existsInfo?.size ?? null;
        if (!summary.fileExists) {
          summary.ok = false;
        }
      }
    } catch (error) {
      summary.fileExists = false;
      summary.ok = false;
      summary.error = error.message;
    }

    try {
      const module = ffmpegModule || (await import('../../media/ffmpegWorker.js'));
      if (module?.probeMedia) {
        const probeData = await module.probeMedia(buffer);
        summary.probe = probeData;
        const duration = Number(probeData?.format?.duration);
        if (Number.isFinite(duration) && job?.summary?.durationSeconds) {
          const delta = Math.abs(duration - job.summary.durationSeconds);
          summary.durationMatch = delta < 0.5;
          if (!summary.durationMatch) {
            summary.ok = false;
          }
        }
      }
    } catch (error) {
      summary.probeError = error.message;
    }

    return summary;
  }

  _ensureNotCancelled(runtimeState) {
    if (runtimeState?.cancelRequested) {
      throw new ExportCancelledError('Export cancelled');
    }
  }

  _tempOutputName(format = 'mp4') {
    const extension = this._extensionForFormat(format);
    return `final-export${extension}`;
  }

  _extensionForFormat(format = 'mp4') {
    const lower = String(format || 'mp4').toLowerCase();
    if (lower === 'webm') return '.webm';
    if (lower === 'mov') return '.mov';
    return '.mp4';
  }

  _resolveJob(jobId, result) {
    const deferred = this.jobDeferreds.get(jobId);
    if (deferred) {
      deferred.resolve(result);
      this.jobDeferreds.delete(jobId);
    }
    this.runtimeJobState.delete(jobId);
  }

  _rejectJob(jobId, error) {
    const deferred = this.jobDeferreds.get(jobId);
    if (deferred) {
      deferred.reject(error);
      this.jobDeferreds.delete(jobId);
    }
    this.runtimeJobState.delete(jobId);
  }

  /**
   * Provide legacy presets (will be expanded in upcoming UI work)
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
      source: {
        resolution: null,
        bitrate: null,
        crf: 23,
        preset: 'veryfast',
      },
    };

    return presets[preset] || presets['1080p'];
  }
}

export const exportService = new ExportService();

