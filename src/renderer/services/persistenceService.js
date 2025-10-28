/**
 * Persistence Service - Handles saving and loading project state
 */

import { Buffer } from 'buffer';
import { useMediaStore } from '@/store/mediaStore';
import { DEFAULT_TRACKS, useTimelineStore } from '@/store/timelineStore';
import { usePlayerStore } from '@/store/playerStore';

export class PersistenceService {
  constructor() {
    this.storageKey = 'clipforge-project';
    this.autoSaveInterval = null;
    this.autoSaveEnabled = true;
    this.autoSaveDelay = 30000; // 30 seconds
  }
  
  /**
   * Save current project state
   */
  async saveProject(projectName = null) {
    try {
      const mediaState = useMediaStore.getState();
      const timelineState = useTimelineStore.getState();
      const playerState = usePlayerStore.getState();
      
      const projectData = {
        version: '1.0.0',
        name: projectName || 'Untitled Project',
        timestamp: new Date().toISOString(),
        media: {
          files: mediaState.files,
          selectedFile: mediaState.selectedFile,
        },
        timeline: {
          tracks: timelineState.tracks,
          clips: timelineState.clips,
          playheadPosition: timelineState.playheadPosition,
          zoom: timelineState.zoom,
          snapToGrid: timelineState.snapToGrid,
          selectedClipId: timelineState.selectedClipId,
        },
        player: {
          currentTime: playerState.currentTime,
          duration: playerState.duration,
          volume: playerState.volume,
          playbackRate: playerState.playbackRate,
        },
      };
      
      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(projectData));
      
      // Also save to file system if Electron API available
      if (window.electronAPI?.saveProject) {
        const filePath = await this.getProjectFilePath(projectName);
        const buffer = Buffer.from(JSON.stringify(projectData, null, 2));
        await window.electronAPI.saveProject(filePath, buffer);
        return filePath;
      }
      
      return projectData;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }
  
  /**
   * Load project state
   */
  async loadProject(source = 'local') {
    try {
      let projectData;
      
      if (source === 'local') {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
          throw new Error('No saved project found');
        }
        projectData = JSON.parse(stored);
      } else if (window.electronAPI?.loadProject) {
        // Load from file system
        const filePath = await this.selectProjectFile();
        const buffer = await window.electronAPI.loadProject(filePath);
        projectData = JSON.parse(buffer.toString());
      }
      
      if (!projectData) {
        throw new Error('Failed to load project');
      }
      
      // Restore state
      useMediaStore.setState({
        files: projectData.media?.files || [],
        selectedFile: projectData.media?.selectedFile || null,
      });
      
      useTimelineStore.setState({
        tracks:
          projectData.timeline?.tracks?.length
            ? projectData.timeline.tracks
            : DEFAULT_TRACKS.map((track) => ({ ...track })),
        clips: projectData.timeline?.clips || [],
        playheadPosition: projectData.timeline?.playheadPosition ?? 0,
        zoom: projectData.timeline?.zoom ?? 1,
        snapToGrid: projectData.timeline?.snapToGrid ?? true,
        selectedClipId: projectData.timeline?.selectedClipId ?? null,
      });
      
      usePlayerStore.setState({
        currentTime: projectData.player?.currentTime || 0,
        duration: projectData.player?.duration || 0,
        volume: projectData.player?.volume || 75,
        playbackRate: projectData.player?.playbackRate || 1,
      });
      
      return projectData;
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }
  
  /**
   * Enable/disable auto-save
   */
  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled;
    
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }
  
  /**
   * Start auto-save interval
   */
  startAutoSave() {
    this.stopAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(() => {
      this.saveProject().catch(err => {
        console.error('Auto-save failed:', err);
      });
    }, this.autoSaveDelay);
  }
  
  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
  
  /**
   * Clear current project
   */
  clearProject() {
    useMediaStore.setState({ files: [], selectedFile: null });
    useTimelineStore.setState({
      tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
      clips: [],
      playheadPosition: 0,
      zoom: 1,
      snapToGrid: true,
      selectedClipId: null,
      isScrubbing: false,
    });
    localStorage.removeItem(this.storageKey);
  }
  
  /**
   * Get project file path
   */
  async getProjectFilePath(projectName) {
    const appDataPath = window.electronAPI?.getAppDataPath?.() || '';
    const sanitizedName = (projectName || 'project').replace(/[^a-z0-9]/gi, '-');
    return `${appDataPath}/projects/${sanitizedName}.clipforge`;
  }
  
  /**
   * Select project file to load
   */
  async selectProjectFile() {
    if (window.electronAPI?.showOpenDialog) {
      return await window.electronAPI.showOpenDialog({
        filters: [{ name: 'ClipForge Projects', extensions: ['clipforge'] }],
      });
    }
    throw new Error('File dialog not available');
  }
  
  /**
   * Export project to file
   */
  async exportProject(filePath) {
    const projectData = await this.saveProject();
    const buffer = Buffer.from(JSON.stringify(projectData, null, 2));
    
    if (window.electronAPI?.saveFile) {
      await window.electronAPI.saveFile(filePath, buffer);
    }
    
    return filePath;
  }
}

export const persistenceService = new PersistenceService();
