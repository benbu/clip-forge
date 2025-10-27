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
  
  // Actions
  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip] 
  })),

  updateClip: (clipId, updates) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),

  removeClip: (clipId) => set((state) => ({ 
    clips: state.clips.filter(c => c.id !== clipId) 
  })),

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

  // Trim clip
  trimClip: (clipId, start, end) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === clipId ? { ...clip, start, end } : clip
    )
  })),

  // Split clip at current playhead
  splitClipAtPlayhead: (clipId) => set((state) => {
    const playhead = state.playheadPosition;
    const nextClips = [];
    for (const clip of state.clips) {
      if (clip.id === clipId && clip.start <= playhead && playhead <= clip.end) {
        const leftClip = { ...clip, end: playhead };
        const rightClip = { ...clip, id: `${clip.id}-split-${Date.now()}`, start: playhead };
        nextClips.push(leftClip, rightClip);
      } else {
        nextClips.push(clip);
      }
    }
    return { clips: nextClips };
  }),
}));

