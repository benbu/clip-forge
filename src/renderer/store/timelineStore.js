import { create } from 'zustand';

/**
 * Timeline Store - Manages timeline clips, playhead position, and zoom
 */
export const useTimelineStore = create((set) => ({
  // State
  clips: [],
  playheadPosition: 0, // in seconds
  zoom: 1, // 0.5x to 2x
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

  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(2, zoom)) }),

  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  // Trim clip
  trimClip: (clipId, startTime, endTime) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === clipId ? { ...clip, startTime, endTime } : clip
    )
  })),

  // Split clip at current playhead
  splitClipAtPlayhead: (clipId) => set((state) => {
    const playhead = state.playheadPosition;
    const clips = state.clips.map(clip => {
      if (clip.id === clipId && clip.start <= playhead && playhead <= clip.end) {
        // Split this clip
        const newEnd = clip.end;
        const newClip = {
          ...clip,
          id: `${clip.id}-split-${Date.now()}`,
          start: playhead,
          end: newEnd,
          startTrim: playhead - clip.start
        };
        
        return { ...clip, end: playhead, endTrim: 0 };
      }
      return clip;
    });

    return { clips };
  }),
}));

