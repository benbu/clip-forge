import { create } from 'zustand';

const EPSILON = 0.0001;
const MIN_TRANSITION_DURATION = 0.1;
const MAX_TRANSITION_DURATION = 10;
const TRANSITION_TYPES = new Set(['crossfade', 'dip-to-black', 'slide']);
const TRANSITION_EASING = new Set(['linear', 'ease-in', 'ease-out', 'ease-in-out']);

const createTransitionId = () =>
  `transition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const getClipDuration = (clip) => {
  if (!clip) return 0;
  if (Number.isFinite(clip.duration)) return Math.max(0, clip.duration);
  const start = Number.isFinite(clip.start) ? clip.start : 0;
  const end = Number.isFinite(clip.end) ? clip.end : start;
  return Math.max(0, end - start);
};

const sanitizeTransitionConfig = (config = {}, options = {}) => {
  const fallbackType = options.fallbackType || 'crossfade';
  const fallbackEasing = options.fallbackEasing || 'ease-in-out';
  const maxDuration = Number.isFinite(options.maxDuration) ? options.maxDuration : MAX_TRANSITION_DURATION;
  const minDuration = Number.isFinite(options.minDuration) ? options.minDuration : MIN_TRANSITION_DURATION;

  const type = TRANSITION_TYPES.has(config.type) ? config.type : fallbackType;
  const easing = TRANSITION_EASING.has(config.easing) ? config.easing : fallbackEasing;
  const rawDuration = Number(config.duration);
  const duration = Number.isFinite(rawDuration)
    ? Math.max(minDuration, Math.min(rawDuration, maxDuration))
    : Math.max(minDuration, Math.min(0.5, maxDuration));

  return { type, easing, duration };
};

const sanitizeTransitionList = (transitions, clips) => {
  if (!Array.isArray(transitions) || !Array.isArray(clips)) {
    return [];
  }

  const clipMap = new Map(clips.map((clip) => [clip.id, clip]));
  const adjacency = new Set();
  const tracksById = new Map();

  clips.forEach((clip) => {
    if (!clip?.trackId) return;
    if (!tracksById.has(clip.trackId)) {
      tracksById.set(clip.trackId, []);
    }
    tracksById.get(clip.trackId).push(cloneClip(clip));
  });

  tracksById.forEach((trackClips) => {
    trackClips
      .sort((a, b) => {
        const { start: startA } = normalizeClipTiming(a);
        const { start: startB } = normalizeClipTiming(b);
        return startA - startB;
      })
      .forEach((clip, index, array) => {
        if (index < array.length - 1) {
          const nextClip = array[index + 1];
          adjacency.add(`${clip.id}->${nextClip.id}`);
        }
      });
  });

  return transitions
    .map((transition) => {
      if (!transition?.fromClipId || !transition?.toClipId) {
        return null;
      }

      const fromClip = clipMap.get(transition.fromClipId);
      const toClip = clipMap.get(transition.toClipId);

      if (!fromClip || !toClip) {
        return null;
      }

      if (fromClip.trackId !== toClip.trackId) {
        return null;
      }

      if (!adjacency.has(`${fromClip.id}->${toClip.id}`)) {
        return null;
      }

      const maxDuration = Math.max(
        MIN_TRANSITION_DURATION,
        Math.min(getClipDuration(fromClip), getClipDuration(toClip))
      );

      const sanitized = sanitizeTransitionConfig(transition, { maxDuration });

      return {
        id: transition.id || createTransitionId(),
        trackId: fromClip.trackId,
        fromClipId: transition.fromClipId,
        toClipId: transition.toClipId,
        type: sanitized.type,
        easing: sanitized.easing,
        duration: Math.min(sanitized.duration, maxDuration),
        createdAt: transition.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .filter(Boolean);
};

export const sanitizeTransitionsForClips = (transitions, clips) =>
  sanitizeTransitionList(transitions, clips);

/**
 * Timeline Store - Manages timeline clips, playhead position, and zoom
 */
export const useTimelineStore = create((set, get) => ({
  // State
  tracks: DEFAULT_TRACKS,
  clips: [],
  transitions: [],
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

      const nextClips = [...state.clips, normalizedClip];
      const nextTransitions = sanitizeTransitionList(state.transitions, nextClips);

      return {
        clips: nextClips,
        selectedClipId: normalizedClip.id,
        transitions: nextTransitions,
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

      const nextClips = state.clips.map((clip) =>
          clip.id === clipId ? normalizeUpdates(clip) : clip
        );
      const nextTransitions = sanitizeTransitionList(state.transitions, nextClips);

      return {
        clips: nextClips,
        transitions: nextTransitions,
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
      const nextClips = state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, trackId } : clip
      );
      const nextTransitions = sanitizeTransitionList(state.transitions, nextClips);
      return {
        clips: nextClips,
        transitions: nextTransitions,
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
      const remainingTransitions = state.transitions.filter(
        (transition) =>
          transition.fromClipId !== clipId && transition.toClipId !== clipId
      );
      const nextTransitions = sanitizeTransitionList(remainingTransitions, collapsed);
      return {
        clips: collapsed,
        selectedClipId: nextSelected,
        transitions: nextTransitions,
      };
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

      const nextTransitions = sanitizeTransitionList(state.transitions, mergedClips);

      return { clips: mergedClips, transitions: nextTransitions };
    }),

  setPlayheadPosition: (position) => set({ playheadPosition: position }),

  setZoom: (nextZoom) => {
    const clamped = Math.max(0.1, Math.min(10, Number(nextZoom) || 0));
    set({ zoom: clamped });
    return clamped;
  },

  nudgeZoom: (delta) => {
    const current = get().zoom ?? 1;
    const next = Math.max(0.1, Math.min(10, Number(current) + Number(delta || 0)));
    set({ zoom: next });
    return next;
  },


  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),

  setIsScrubbing: (isScrubbing) => set({ isScrubbing }),

  setMediaWaveform: (mediaId, waveform) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.mediaFileId === mediaId ? { ...clip, waveform } : clip
      ),
    })),

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

      const nextTransitions = sanitizeTransitionList(state.transitions, collapsed);

      return { clips: collapsed, transitions: nextTransitions };
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

    const filteredTransitions = state.transitions.filter(
      (transition) => transition.fromClipId !== clipId
    );
    const nextTransitions = sanitizeTransitionList(filteredTransitions, nextClips);

    return { clips: nextClips, selectedClipId, transitions: nextTransitions };
  }),

  setTransitionBetween: (fromClipId, toClipId, config = {}) =>
    set((state) => {
      if (!fromClipId || !toClipId || fromClipId === toClipId) {
        return state;
      }

      const fromClip = state.clips.find((clip) => clip.id === fromClipId);
      const toClip = state.clips.find((clip) => clip.id === toClipId);
      if (!fromClip || !toClip) {
        return state;
      }

      if (fromClip.trackId !== toClip.trackId) {
        console.warn('Transitions must connect clips on the same track.');
        return state;
      }

      const track = state.tracks.find((t) => t.id === fromClip.trackId);
      if (track?.isLocked) {
        console.warn(`Track "${track.name}" is locked; transition update cancelled.`);
        return state;
      }

      const sortedTrackClips = state.clips
        .filter((clip) => clip.trackId === fromClip.trackId)
        .slice()
        .sort((a, b) => {
          const { start: startA } = normalizeClipTiming(a);
          const { start: startB } = normalizeClipTiming(b);
          return startA - startB;
        });

      const fromIndex = sortedTrackClips.findIndex((clip) => clip.id === fromClipId);
      if (fromIndex === -1 || sortedTrackClips[fromIndex + 1]?.id !== toClipId) {
        console.warn('Transitions can only be set between adjacent clips.');
        return state;
      }

      const maxDuration = Math.max(
        MIN_TRANSITION_DURATION,
        Math.min(getClipDuration(fromClip), getClipDuration(toClip))
      );

      if (maxDuration <= 0) {
        console.warn('Clips are too short to support a transition.');
        return state;
      }

      const sanitizedConfig = sanitizeTransitionConfig(config, { maxDuration });
      const duration = Math.min(sanitizedConfig.duration, maxDuration);
      const timestamp = new Date().toISOString();

      const existingIndex = state.transitions.findIndex(
        (transition) =>
          transition.fromClipId === fromClipId && transition.toClipId === toClipId
      );

      if (existingIndex >= 0) {
        const existing = state.transitions[existingIndex];
        const nextTransitions = [...state.transitions];
        nextTransitions[existingIndex] = {
          ...existing,
          type: sanitizedConfig.type,
          easing: sanitizedConfig.easing,
          duration,
          trackId: fromClip.trackId,
          updatedAt: timestamp,
        };
        return {
          transitions: sanitizeTransitionList(nextTransitions, state.clips),
        };
      }

      const nextTransitions = [
        ...state.transitions,
        {
          id: createTransitionId(),
          trackId: fromClip.trackId,
          fromClipId,
          toClipId,
          type: sanitizedConfig.type,
          easing: sanitizedConfig.easing,
          duration,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];

      return {
        transitions: sanitizeTransitionList(nextTransitions, state.clips),
      };
    }),

  updateTransition: (transitionId, updates = {}) =>
    set((state) => {
      if (!transitionId) return state;
      const index = state.transitions.findIndex((transition) => transition.id === transitionId);
      if (index === -1) return state;

      const transition = state.transitions[index];
      const fromClip = state.clips.find((clip) => clip.id === transition.fromClipId);
      const toClip = state.clips.find((clip) => clip.id === transition.toClipId);
      if (!fromClip || !toClip) {
        const filtered = state.transitions.filter((t) => t.id !== transitionId);
        return {
          transitions: sanitizeTransitionList(filtered, state.clips),
        };
      }

      const track = state.tracks.find((t) => t.id === fromClip.trackId);
      if (track?.isLocked) {
        console.warn(`Track "${track.name}" is locked; transition update cancelled.`);
        return state;
      }

      const maxDuration = Math.max(
        MIN_TRANSITION_DURATION,
        Math.min(getClipDuration(fromClip), getClipDuration(toClip))
      );

      if (maxDuration <= 0) {
        const filtered = state.transitions.filter((t) => t.id !== transitionId);
        return {
          transitions: sanitizeTransitionList(filtered, state.clips),
        };
      }

      const sanitizedConfig = sanitizeTransitionConfig(
        {
          type: updates.type ?? transition.type,
          easing: updates.easing ?? transition.easing,
          duration: updates.duration ?? transition.duration,
        },
        { maxDuration }
      );

      const nextTransitions = [...state.transitions];
      nextTransitions[index] = {
        ...transition,
        type: sanitizedConfig.type,
        easing: sanitizedConfig.easing,
        duration: Math.min(sanitizedConfig.duration, maxDuration),
        trackId: fromClip.trackId,
        updatedAt: new Date().toISOString(),
      };

      return {
        transitions: sanitizeTransitionList(nextTransitions, state.clips),
      };
    }),

  removeTransition: (transitionId) =>
    set((state) => {
      if (!transitionId) return state;
      const filtered = state.transitions.filter((transition) => transition.id !== transitionId);
      if (filtered.length === state.transitions.length) {
        return state;
      }
      return {
        transitions: sanitizeTransitionList(filtered, state.clips),
      };
    }),

  removeTransitionBetween: (fromClipId, toClipId) =>
    set((state) => {
      if (!fromClipId || !toClipId) return state;
      const filtered = state.transitions.filter(
        (transition) =>
          !(
            transition.fromClipId === fromClipId &&
            transition.toClipId === toClipId
          )
      );
      if (filtered.length === state.transitions.length) {
        return state;
      }
      return {
        transitions: sanitizeTransitionList(filtered, state.clips),
      };
    }),
}));
