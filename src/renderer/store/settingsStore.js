import { create } from 'zustand';

/**
 * Settings Store - Holds user preferences including export defaults
 */
export const useSettingsStore = create((set) => ({
  export: {
    resolution: '1920x1080', // null | '1920x1080' | '1280x720' | '3840x2160'
    fps: 60,                 // null uses source
    format: 'mp4',           // 'mp4' | 'mov' | 'webm' | 'avi'
    bitrate: '8000k',
    crf: 23,
    preset: 'veryfast',
  },

  setExportSetting: (key, value) => set((state) => ({
    export: { ...state.export, [key]: value },
  })),

  setExportSettings: (updates) => set((state) => ({
    export: { ...state.export, ...(updates || {}) },
  })),
}));


