import { create } from 'zustand';

/**
 * Media Store - Manages imported media files and their metadata
 */
export const useMediaStore = create((set) => ({
  // State
  files: [],
  selectedFile: null,
  selectedFileData: null, // Full file object for selected file
  fileBlobUrls: {}, // Map of fileId -> blob URL

  // Actions
  addFiles: (newFiles) => set((state) => ({ 
    files: [...state.files, ...newFiles] 
  })),

  removeFile: (fileId) => set((state) => {
    // Clean up blob URL if exists
    if (state.fileBlobUrls[fileId]) {
      URL.revokeObjectURL(state.fileBlobUrls[fileId]);
      delete state.fileBlobUrls[fileId];
    }
    
    return {
      files: state.files.filter(f => f.id !== fileId),
      selectedFile: state.selectedFile === fileId ? null : state.selectedFile,
      selectedFileData: state.selectedFile === fileId ? null : state.selectedFileData
    };
  }),

  selectFile: (fileId) => set((state) => {
    const file = state.files.find(f => f.id === fileId);
    return { 
      selectedFile: fileId,
      selectedFileData: file || null
    };
  }),

  clearSelection: () => set({ selectedFile: null, selectedFileData: null }),
  
  setFileBlobUrl: (fileId, blobUrl) => set((state) => ({
    fileBlobUrls: { ...state.fileBlobUrls, [fileId]: blobUrl }
  })),
}));

