import { create } from 'zustand';

const EPSILON = 0.0001;

const withDefaultTrackState = (track, index = 0) => ({
  id: track.id ?? `${track.type ?? 'video'}-${Date.now()}`,
  type: track.type ?? 'video',
  name: track.name ?? `Track ${index + 1}`,
  order: track.order ?? index,
  isVisible: track.isVisible ?? true,
  isLocked: track.isLocked ?? false,
  isMuted: track.isMuted ?? false,
  isSolo: track.isSolo ?? false,
  volume: Math.max(0, Math.min(100, track.volume ?? 100)),
  height: track.height ?? 1,
});

export const DEFAULT_TRACKS = [
  withDefaultTrackState({ id: 'video-1', type: 'video', name: 'Video Track 1', order: 0 }, 0),
  withDefaultTrackState({ id: 'overlay-1', type: 'overlay', name: 'Overlay Track', order: 1 }, 1),
  withDefaultTrackState({ id: 'video-2', type: 'video', name: 'Video Track 2', order: 2 }, 2),
  withDefaultTrackState({ id: 'audio-1', type: 'audio', name: 'Audio Track 1', order: 3 }, 3),
];

const cloneClip = (clip) => ({ ...clip });

const normalizeClipTiming = (clip) => {
  const start = Number.isFinite(clip.start) ? clip.start : 0;
  const end = Number.isFinite(clip.end)
    ? clip.end
    : start + (Number.isFinite(clip.duration) ? clip.duration : 0);
  const duration = Math.max(0, Number.isFinite(clip.duration) ? clip.duration : end - start);
  return { start, end, duration };
};

const collapseClipsForTrack = (clips, trackId, fromTime = 0) => {
  const working = clips.map(cloneClip);
  const trackClips = working
    .filter((clip) => clip.trackId === trackId)
    .sort((a, b) => normalizeClipTiming(a).start - normalizeClipTiming(b).start);

  if (!trackClips.length) {
    return working;
  }

  let cursor = Math.max(0, fromTime);

  for (const clip of trackClips) {
    const { start, end, duration } = normalizeClipTiming(clip);

    if (end <= Math.max(cursor, fromTime) + EPSILON) {
      cursor = Math.max(cursor, end);
      continue;
    }

    const nextStart = cursor;
    const nextEnd = nextStart + duration;

    clip.start = Number.parseFloat(nextStart.toFixed(4));
    clip.end = Number.parseFloat(nextEnd.toFixed(4));
    clip.duration = duration;

    if (Number.isFinite(clip.endTrim)) {
      clip.endTrim = Math.min(clip.duration, Math.max(0, clip.endTrim));
    }

    cursor = nextEnd;
  }

  return working;
};

/**
 * Timeline Store - Manages timeline clips, playhead position, and zoom
 */
export const useTimelineStore = create((set, get) => ({
  // State
  tracks: DEFAULT_TRACKS,
  clips: [],
  playheadPosition: 0, // in seconds
  zoom: 1, // 0.1x to 10x
  snapToGrid: true,
  selectedClipId: null,
  isScrubbing: false,

  // Track helpers
  addTrack: (trackConfig) =>
    set((state) => {
      const nextOrder =
        trackConfig?.order ??
        (state.tracks.length > 0
          ? Math.max(...state.tracks.map((t) => t.order ?? 0)) + 1
          : 0);

      const newTrack = {
        id: trackConfig?.id ?? `${trackConfig?.type ?? 'video'}-${Date.now()}`,
        type: trackConfig?.type ?? 'video',
        name: trackConfig?.name ?? `Track ${nextOrder + 1}`,
        order: nextOrder,
        isVisible: trackConfig?.isVisible ?? true,
        isLocked: trackConfig?.isLocked ?? false,
        isMuted: trackConfig?.isMuted ?? false,
        isSolo: trackConfig?.isSolo ?? false,
        volume: Math.max(0, Math.min(100, trackConfig?.volume ?? 100)),
        height: trackConfig?.height ?? 1,
      };

      return {
        tracks: [...state.tracks, newTrack].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      };
    }),

  updateTrack: (trackId, updates) =>
    set((state) => ({
        tracks: state.tracks
        .map((track) =>
          track.id === trackId
            ? withDefaultTrackState(
                {
                  ...track,
                  ...updates,
                },
                track.order ?? 0
              )
            : track
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    })),

  removeTrack: (trackId) =>
    set((state) => {
      const hasClips = state.clips.some((clip) => clip.trackId === trackId);
      if (hasClips) {
        return state;
      }
      return {
        tracks: state.tracks.filter((track) => track.id !== trackId),
      };
    }),

  moveTrack: (trackId, newOrder) =>
    set((state) => {
      const tracks = state.tracks.map((track) =>
        track.id === trackId ? { ...track, order: newOrder } : track
      );
      return {
        tracks: tracks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      };
    }),

  setTrackVisibility: (trackId, isVisible) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, isVisible: Boolean(isVisible) } : track
      ),
    })),

  setTrackLocked: (trackId, isLocked) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, isLocked: Boolean(isLocked) } : track
      ),
    })),

  setTrackVolume: (trackId, volume) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(100, Number(volume) || 0));
      return {
        tracks: state.tracks.map((track) =>
          track.id === trackId ? { ...track, volume: clamped } : track
        ),
      };
    }),

  toggleTrackMute: (trackId, forceValue) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              isMuted:
                typeof forceValue === 'boolean' ? forceValue : !track.isMuted,
            }
          : track
      ),
    })),

  toggleTrackSolo: (trackId) =>
    set((state) => {
      const tracks = state.tracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }
        const nextSolo = !track.isSolo;
        return {
          ...track,
          isSolo: nextSolo,
          isMuted: track.type === 'audio' && nextSolo ? false : track.isMuted,
        };
      });

      return {
        tracks,
      };
    }),

  setTrackHeight: (trackId, height) =>
    set((state) => {
      const clamped = Math.max(0.5, Math.min(3, Number(height) || 1));
      return {
        tracks: state.tracks.map((track) =>
          track.id === trackId ? { ...track, height: clamped } : track
        ),
      };
    }),

  nudgeTrackHeight: (trackId, delta) =>
    set((state) => {
      const track = state.tracks.find((t) => t.id === trackId);
      if (!track) return state;
      const current = track.height ?? 1;
      const next = Math.max(0.5, Math.min(3, current + delta));
      return {
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, height: next } : t
        ),
      };
    }),

  // Actions
  addClip: (clip) =>
    set((state) => {
      const mediaTypeHint =
        typeof clip.mediaType === 'string' ? clip.mediaType.toLowerCase() : '';
      let normalizedMediaType = 'video';
      if (mediaTypeHint.includes('audio')) {
        normalizedMediaType = 'audio';
      } else if (mediaTypeHint.includes('overlay') || mediaTypeHint.includes('text')) {
        normalizedMediaType = 'overlay';
      }

      const getDefaultTrackId = (type = 'video') => {
        const tracks = get().tracks;
        const firstMatch = tracks.find((track) => track.type === type);
        if (firstMatch) return firstMatch.id;
        // Fall back to the first track if no type match exists
        return tracks[0]?.id ?? null;
      };

      const resolveTrackId = () => {
        if (clip.trackId) return clip.trackId;
        // Support legacy numeric track values
        if (clip.track != null) {
          const tracks = get().tracks;
          const numericIndex = Number(clip.track);
          if (!Number.isNaN(numericIndex) && tracks[numericIndex]) {
            return tracks[numericIndex].id;
          }
        }

        if (normalizedMediaType === 'audio') {
          return getDefaultTrackId('audio');
        }
        if (normalizedMediaType === 'overlay') {
          return getDefaultTrackId('overlay');
        }
        return getDefaultTrackId('video');
      };

      const normalizedClip = {
        ...clip,
        trackId: resolveTrackId(),
        mediaType: normalizedMediaType,
      };

      normalizedClip.volume = Math.max(0, Math.min(200, clip.volume ?? 100));
      if (clip.waveform && !normalizedClip.waveform) {
        normalizedClip.waveform = clip.waveform;
      }

      if (!normalizedClip.trackId) {
        throw new Error('No track available to place clip');
      }

      const currentTracks = get().tracks;
      let targetTrack = currentTracks.find((track) => track.id === normalizedClip.trackId);

      if (targetTrack?.isLocked) {
        const fallback = currentTracks.find(
          (track) =>
            track.type === targetTrack.type &&
            !track.isLocked &&
            track.id !== targetTrack.id
        );

        if (fallback) {
          normalizedClip.trackId = fallback.id;
          targetTrack = fallback;
        } else {
          console.warn(
            `Unable to add clip "${normalizedClip.name ?? normalizedClip.id}" because all ${targetTrack?.type ?? 'timeline'} tracks are locked.`
          );
          return state;
        }
      }
  
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
      normalizedClip.sourceOut =
        normalizedClip.sourceOut ?? normalizedClip.sourceIn + sourceDuration;

      return {
        clips: [...state.clips, normalizedClip],
        selectedClipId: normalizedClip.id,
      };
    }),

  updateClip: (clipId, updates) =>
    set((state) => {
      const targetClip = state.clips.find((clip) => clip.id === clipId);
      if (!targetClip) {
        return state;
      }
      const track = state.tracks.find((t) => t.id === targetClip.trackId);
      if (track?.isLocked) {
        return state;
      }

      const normalizeUpdates = (clip) => {
        const next = { ...clip, ...updates };
        if (updates.volume != null) {
          next.volume = Math.max(0, Math.min(200, Number(updates.volume) || 0));
        }
        if (updates.waveform) {
          next.waveform = updates.waveform;
        }
        if (updates.overlayTransform) {
          next.overlayTransform = updates.overlayTransform;
        }
        if (updates.recordingMeta) {
          next.recordingMeta = updates.recordingMeta;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'overlayKind')) {
          next.overlayKind = updates.overlayKind;
        }
        if (updates.textOverlay) {
          const prevOverlay = clip.textOverlay ?? {};
          const prevStyle = prevOverlay.style ?? {};
          const incoming = updates.textOverlay ?? {};
          const incomingStyle = incoming.style ?? {};
          next.textOverlay = {
            ...prevOverlay,
            ...incoming,
            style: Object.keys(incomingStyle).length
              ? {
                  ...prevStyle,
                  ...incomingStyle,
                }
              : prevStyle,
          };
        }
        if (updates.textOverlay === null) {
          next.textOverlay = null;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'textOverlayKeyframes')) {
          next.textOverlayKeyframes = updates.textOverlayKeyframes;
        }
        return next;
      };

      return {
        clips: state.clips.map((clip) =>
          clip.id === clipId ? normalizeUpdates(clip) : clip
        ),
      };
    }),

  moveClipToTrack: (clipId, trackId) =>
    set((state) => {
      const currentClip = state.clips.find((clip) => clip.id === clipId);
      if (!currentClip) return state;

      const sourceTrack = state.tracks.find((track) => track.id === currentClip.trackId);
      if (sourceTrack?.isLocked) {
        return state;
      }

      const targetTrack = state.tracks.find((track) => track.id === trackId);
      if (targetTrack?.isLocked) {
        return state;
      }

      const trackExists = state.tracks.some((track) => track.id === trackId);
      if (!trackExists) return state;
      return {
        clips: state.clips.map((clip) =>
          clip.id === clipId ? { ...clip, trackId } : clip
        ),
      };
    }),

  removeClip: (clipId) =>
    set((state) => {
      const targetClip = state.clips.find((clip) => clip.id === clipId);
      if (!targetClip) {
        return state;
      }
      const track = state.tracks.find((t) => t.id === targetClip.trackId);
      if (track?.isLocked) {
        return state;
      }

      const remaining = state.clips.filter((c) => c.id !== clipId);
      const nextSelected =
        state.selectedClipId === clipId ? null : state.selectedClipId;
      const collapsed = collapseClipsForTrack(
        remaining,
        targetClip.trackId,
        Number.isFinite(targetClip.start) ? targetClip.start : 0
      );
      return { clips: collapsed, selectedClipId: nextSelected };
    }),

  reorderClips: (clipId, newPosition, trackId) =>
    set((state) => {
      const targetTrackId =
        trackId ??
        state.clips.find((clip) => clip.id === clipId)?.trackId;
      if (!targetTrackId) return state;

      const track = state.tracks.find((t) => t.id === targetTrackId);
      if (track?.isLocked) {
        return state;
      }

      const sameTrackClips = state.clips.filter(
        (clip) => clip.trackId === targetTrackId
      );
      const movingClipIndex = sameTrackClips.findIndex(
        (clip) => clip.id === clipId
      );
      if (movingClipIndex === -1) return state;

      const clampedPosition = Math.max(
        0,
        Math.min(newPosition, sameTrackClips.length - 1)
      );

      const updatedTrackClips = [...sameTrackClips];
      const [movingClip] = updatedTrackClips.splice(movingClipIndex, 1);
      updatedTrackClips.splice(clampedPosition, 0, movingClip);

      const mergedClips = state.clips.map((clip) => {
        if (clip.trackId !== targetTrackId) {
          return clip;
        }
        const replacement = updatedTrackClips.find((c) => c.id === clip.id);
        return replacement ?? clip;
      });

      return { clips: mergedClips };
    }),

  setPlayheadPosition: (position) => set({ playheadPosition: position }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),

  setIsScrubbing: (isScrubbing) => set({ isScrubbing }),

  // Trim clip
  trimClip: (clipId, start, end) =>
    set((state) => {
      const targetClip = state.clips.find((clip) => clip.id === clipId);
      if (!targetClip) {
        return state;
      }

      const track = state.tracks.find((t) => t.id === targetClip.trackId);
      if (track?.isLocked) {
        return state;
      }

      const prevStart = targetClip.start ?? 0;
      const fromTime = Math.min(prevStart, Number.isFinite(start) ? start : prevStart);

      const nextClips = state.clips.map((clip) => {
        if (clip.id !== clipId) return clip;

        const prevSourceIn = clip.sourceIn ?? 0;
        const newStart = Math.max(0, start);
        const newEnd = Math.max(newStart, end);
        const duration = Math.max(0, newEnd - newStart);
        const deltaLeft = Math.max(0, newStart - prevStart);
        const newSourceIn = Math.max(0, prevSourceIn + deltaLeft);
        const newSourceOut = newSourceIn + duration;

        return {
          ...clip,
          start: Number.parseFloat(newStart.toFixed(4)),
          end: Number.parseFloat(newEnd.toFixed(4)),
          duration,
          sourceIn: newSourceIn,
          sourceOut: newSourceOut,
        };
      });

      const collapsed = collapseClipsForTrack(
        nextClips,
        targetClip.trackId,
        Number.isFinite(fromTime) ? fromTime : 0
      );

      return { clips: collapsed };
    }),

  // Split clip at current playhead
  splitClipAtPlayhead: (clipId) => set((state) => {
    const playhead = state.playheadPosition;
    let selectedClipId = state.selectedClipId;
    const nextClips = [];

    for (const clip of state.clips) {
      if (clip.id === clipId && clip.start <= playhead && playhead <= clip.end) {
        const track = state.tracks.find((t) => t.id === clip.trackId);
        if (track?.isLocked) {
          nextClips.push(clip);
          continue;
        }
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
          trackId: clip.trackId,
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
