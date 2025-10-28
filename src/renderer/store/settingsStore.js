import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  // Autosave & backups
  autosaveEnabled: true,
  autosaveMinutes: 5,
  backupRetention: 10,

  // Export defaults
  export: {
    resolution: '1920x1080',
    fps: 60,
    format: 'mp4',
    bitrate: '8000k',
    crf: 23,
    preset: 'veryfast',
  },

  // Mutators
  setAutosaveEnabled: (v) => set({ autosaveEnabled: !!v }),
  setAutosaveMinutes: (m) => set({ autosaveMinutes: Math.min(60, Math.max(1, Number(m) || 5)) }),
  setBackupRetention: (n) => set({ backupRetention: Math.min(50, Math.max(1, Number(n) || 10)) }),
  setExportSetting: (key, value) => set((state) => ({ export: { ...state.export, [key]: value } })),
  setExportSettings: (updates) => set((state) => ({ export: { ...state.export, ...(updates || {}) } })),
}));

