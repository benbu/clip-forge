/**
 * Export Service - Handles video export and rendering
 */

import { exportVideo, mergeClips } from './videoService';
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
      
      // Prepare clip data with file paths
      const clipData = clips.map(clip => {
        const mediaFile = mediaStore.files.find(f => f.id === clip.mediaId);
        return {
          path: mediaFile?.path,
          start: clip.startTrim || 0,
          end: clip.endTrim || mediaFile?.duration,
        };
      }).filter(clip => clip.path);
      
      if (clipData.length === 0) {
        throw new Error('No valid clips found');
      }
      
      // Update progress
      this.updateProgress(10);
      
      // Merge all clips
      const mergedBlob = await mergeClips(clipData);
      
      this.updateProgress(50);
      
      // Convert to video buffer
      const buffer = await mergedBlob.arrayBuffer();
      
      this.updateProgress(70);
      
      // Apply export settings (resolution, quality, etc.)
      const exportedBuffer = await this.applyExportSettings(buffer, options);
      
      this.updateProgress(90);
      
      // Save to file
      const filePath = options.outputPath || await this.getDefaultExportPath();
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
    const appDataPath = window.electronAPI?.getAppDataPath?.() || '';
    return `${appDataPath}/exports/clipforge-${timestamp}.mp4`;
  }
  
  /**
   * Calculate total duration of timeline
   */
  calculateTotalDuration(clipData) {
    return clipData.reduce((total, clip) => {
      return total + (clip.end - clip.start);
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

