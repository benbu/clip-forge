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
  // Library view state
  sortBy: 'name', // name | duration | resolution | size | createdAt
  sortDir: 'asc', // asc | desc
  filterType: 'all', // all | recording | external
  bulkSelectedIds: [],

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

  setSort: ({ sortBy, sortDir }) => set((state) => ({
    sortBy: sortBy || state.sortBy,
    sortDir: sortDir || state.sortDir,
  })),

  setFilterType: (filterType) => set(() => ({ filterType })),

  renameFile: (fileId, newName) => set((state) => ({
    files: state.files.map((f) => (f.id === fileId ? { ...f, name: newName } : f)),
    selectedFileData:
      state.selectedFileData && state.selectedFileData.id === fileId
        ? { ...state.selectedFileData, name: newName }
        : state.selectedFileData,
  })),

  updateFile: (fileId, updates) => set((state) => ({
    files: state.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    selectedFileData:
      state.selectedFileData && state.selectedFileData.id === fileId
        ? { ...state.selectedFileData, ...updates }
        : state.selectedFileData,
  })),

  bulkToggle: (fileId) => set((state) => {
    const setSelected = new Set(state.bulkSelectedIds);
    if (setSelected.has(fileId)) setSelected.delete(fileId); else setSelected.add(fileId);
    return { bulkSelectedIds: Array.from(setSelected) };
  }),

  bulkClear: () => set({ bulkSelectedIds: [] }),
}));

