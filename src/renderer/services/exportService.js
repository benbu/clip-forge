/**
 * Export Service - Handles video export and rendering
 */

import { mergeClips, initVideoService } from './videoService';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';

export class ExportService {
  constructor() {
    this.isExporting = false;
    this.currentProgress = 0;
    this.onProgressCallback = null;
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
    
    try {
      // Get timeline clips
      const timelineStore = useTimelineStore.getState();
      const mediaStore = useMediaStore.getState();
      const { clips } = timelineStore;
      
      if (clips.length === 0) {
        throw new Error('No clips to export');
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

          const source =
            mediaFile.originalFile ||
            mediaStore.fileBlobUrls?.[mediaFile.id] ||
            mediaFile.path;

          if (!source) return null;

          const duration =
            clip.duration ??
            mediaFile.durationSeconds ??
            Math.max(0, (clip.end ?? 0) - (clip.start ?? 0));

          return {
            id: clip.id,
            source,
        duration,
            name: mediaFile.name,
          };
        })
        .filter(Boolean);
      
      if (clipData.length === 0) {
        throw new Error('No valid clips found');
      }
      
      // Update progress
      this.updateProgress(10);
      
      // Merge all clips
      const mergedData = await mergeClips(clipData);
      
      this.updateProgress(50);
      
      // Normalize to Uint8Array
      const mergedBuffer =
        mergedData instanceof Uint8Array
          ? mergedData
          : new Uint8Array(await mergedData.arrayBuffer());
      
      this.updateProgress(70);
      
      // Apply export settings (resolution, quality, etc.)
      const exportedBuffer = await this.applyExportSettings(mergedBuffer, options);
      
      this.updateProgress(90);
      
      // Save to file
      const filePath =
        options.outputPath || (await this.getDefaultExportPath());

      if (!filePath) {
        throw new Error('Export cancelled');
      }

      await this.saveExport(filePath, exportedBuffer);
      
      this.updateProgress(100);
      
      return {
        filePath,
        size: exportedBuffer.byteLength,
        duration: this.calculateTotalDuration(clipData)
      };
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    } finally {
      this.isExporting = false;
    }
  }
  
  /**
   * Apply export settings to video
   */
  async applyExportSettings(buffer, options) {
    // For now, return buffer as-is
    // In full implementation, this would use FFmpeg to:
    // - Resize to target resolution
    // - Adjust bitrate
    // - Apply codec settings
    // - Add filters/effects
    
    return buffer;
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
        crf: 23
      },
      '1080p': {
        resolution: '1920x1080',
        bitrate: '8000k',
        crf: 23
      },
      '4k': {
        resolution: '3840x2160',
        bitrate: '25000k',
        crf: 23
      },
      'source': {
        resolution: null,
        bitrate: null,
        crf: 23
      }
    };
    
    return presets[preset] || presets['1080p'];
  }
}

export const exportService = new ExportService();
