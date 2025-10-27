import { create } from 'zustand';

/**
 * Timeline Store - Manages timeline clips, playhead position, and zoom
 */
export const useTimelineStore = create((set) => ({
  // State
  clips: [],
  playheadPosition: 0, // in seconds
  zoom: 1, // 0.1x to 10x
  snapToGrid: true,
  selectedClipId: null,
  
  // Actions
  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip],
    selectedClipId: clip.id,
  })),

  updateClip: (clipId, updates) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),

  removeClip: (clipId) => set((state) => {
    const remaining = state.clips.filter(c => c.id !== clipId);
    const nextSelected = state.selectedClipId === clipId ? null : state.selectedClipId;
    return { clips: remaining, selectedClipId: nextSelected };
  }),

  reorderClips: (clipId, newPosition) => set((state) => {
    const clips = [...state.clips];
    const index = clips.findIndex(c => c.id === clipId);
    if (index === -1) return state;
    
    const [clip] = clips.splice(index, 1);
    clips.splice(newPosition, 0, clip);
    
    return { clips };
  }),

  setPlayheadPosition: (position) => set({ playheadPosition: position }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),

  // Trim clip
  trimClip: (clipId, start, end) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === clipId ? { ...clip, start, end } : clip
    )
  })),

  // Split clip at current playhead
  splitClipAtPlayhead: (clipId) => set((state) => {
    const playhead = state.playheadPosition;
    let selectedClipId = state.selectedClipId;
    const nextClips = [];

    for (const clip of state.clips) {
      if (clip.id === clipId && clip.start <= playhead && playhead <= clip.end) {
        const rightClipId = `${clip.id}-split-${Date.now()}`;
        const leftClip = { ...clip, end: playhead };
        const rightClip = { ...clip, id: rightClipId, start: playhead };
        nextClips.push(leftClip, rightClip);
        selectedClipId = rightClipId;
      } else {
        nextClips.push(clip);
      }
    }

    return { clips: nextClips, selectedClipId };
  }),
}));
