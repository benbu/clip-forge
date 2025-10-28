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
  isScrubbing: false,
  
  // Actions
  addClip: (clip) => set((state) => {
    const normalizedClip = {
      ...clip,
    };

    if (normalizedClip.start == null) {
      normalizedClip.start = 0;
    }

    if (normalizedClip.end == null) {
      const fallbackDuration =
        normalizedClip.duration ??
        normalizedClip.endTrim ??
        normalizedClip.startTrim ??
        0;
      normalizedClip.end = normalizedClip.start + fallbackDuration;
    }

    if (normalizedClip.duration == null) {
      normalizedClip.duration = Math.max(
        0,
        (normalizedClip.end ?? 0) - (normalizedClip.start ?? 0)
      );
    }

    if (normalizedClip.endTrim == null) {
      normalizedClip.endTrim = normalizedClip.duration;
    }

    const sourceDuration =
      normalizedClip.sourceOut != null && normalizedClip.sourceIn != null
        ? normalizedClip.sourceOut - normalizedClip.sourceIn
        : normalizedClip.duration ?? 0;

    normalizedClip.sourceIn = normalizedClip.sourceIn ?? 0;
    normalizedClip.sourceOut = normalizedClip.sourceOut ?? (normalizedClip.sourceIn + sourceDuration);

    return {
      clips: [...state.clips, normalizedClip],
      selectedClipId: normalizedClip.id,
    };
  }),

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

  setIsScrubbing: (isScrubbing) => set({ isScrubbing }),

  // Trim clip
  trimClip: (clipId, start, end) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) return clip;

        const prevSourceIn = clip.sourceIn ?? 0;
        const prevStart = clip.start ?? 0;
        const prevEnd = clip.end ?? prevStart;
        const deltaLeft = start - prevStart;
        const duration = Math.max(0, end - start);
        const newSourceIn = Math.max(0, prevSourceIn + deltaLeft);
        const newSourceOut = newSourceIn + duration;

        return {
          ...clip,
          start,
          end,
          duration,
          sourceIn: newSourceIn,
          sourceOut: newSourceOut,
        };
      }),
    })),

  // Split clip at current playhead
  splitClipAtPlayhead: (clipId) => set((state) => {
    const playhead = state.playheadPosition;
    let selectedClipId = state.selectedClipId;
    const nextClips = [];

    for (const clip of state.clips) {
      if (clip.id === clipId && clip.start <= playhead && playhead <= clip.end) {
        const rightClipId = `${clip.id}-split-${Date.now()}`;
        const totalDuration = clip.duration ?? (clip.end - clip.start);
        const offset = Math.max(0, playhead - clip.start);
        const leftDuration = Math.max(0, offset);
        const rightDuration = Math.max(0, totalDuration - leftDuration);
        const sourceIn = clip.sourceIn ?? 0;
        const leftClip = {
          ...clip,
          end: playhead,
          duration: leftDuration,
          sourceOut: sourceIn + leftDuration,
        };
        const rightClip = {
          ...clip,
          id: rightClipId,
          start: playhead,
          duration: rightDuration,
          sourceIn: sourceIn + leftDuration,
          sourceOut: sourceIn + leftDuration + rightDuration,
        };
        nextClips.push(leftClip, rightClip);
        selectedClipId = rightClipId;
      } else {
        nextClips.push(clip);
      }
    }

    return { clips: nextClips, selectedClipId };
  }),
}));
