import { create } from 'zustand';

/**
 * Media Store - Manages imported media files and their metadata
 */
export const useMediaStore = create((set) => ({
  // State
  files: [],
  selectedFile: null,

  // Actions
  addFiles: (newFiles) => set((state) => ({ 
    files: [...state.files, ...newFiles] 
  })),

  removeFile: (fileId) => set((state) => ({ 
    files: state.files.filter(f => f.id !== fileId),
    selectedFile: state.selectedFile === fileId ? null : state.selectedFile
  })),

  selectFile: (fileId) => set({ selectedFile: fileId }),

  clearSelection: () => set({ selectedFile: null }),
}));

