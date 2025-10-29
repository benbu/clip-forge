import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePlayerStore } from '@/store/playerStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { formatDuration } from '@/lib/fileUtils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { shortcuts } from '@/lib/keyboardShortcuts';
import { sanitizeTextOverlay, interpolateTextOverlay } from '@/lib/textOverlay';

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

const applyEasing = (value, easing = 'ease-in-out') => {
  const t = clamp01(value);
  switch ((easing || '').toLowerCase()) {
    case 'ease-in':
    case 'ease_in':
      return t * t;
    case 'ease-out':
    case 'ease_out':
      return 1 - (1 - t) * (1 - t);
    case 'linear':
      return t;
    case 'ease-in-out':
    case 'ease_in_out':
    default:
      if (t < 0.5) {
        return 2 * t * t;
      }
      return 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
};

const buildTransitionVisual = ({ type, easing, progress }) => {
  const eased = applyEasing(progress, easing);
  const base = {
    active: true,
    primaryOpacity: 1,
    secondaryOpacity: 0,
    primaryTransform: 'translateX(0%)',
    secondaryTransform: 'translateX(0%)',
    blackOpacity: 0,
  };

  switch ((type || '').toLowerCase()) {
    case 'dip-to-black':
    case 'dip_to_black': {
      if (progress < 0.5) {
        const fadeOut = applyEasing(progress * 2, easing);
        return {
          ...base,
          primaryOpacity: 0,
          secondaryOpacity: 1 - fadeOut,
          blackOpacity: fadeOut,
        };
      }
      const fadeIn = applyEasing((progress - 0.5) * 2, easing);
      return {
        ...base,
        primaryOpacity: fadeIn,
        secondaryOpacity: 0,
        blackOpacity: 1 - fadeIn,
      };
    }
    case 'slide':
    case 'slide-left':
    case 'slideleft': {
      const slide = eased;
      return {
        ...base,
        primaryOpacity: 1,
        secondaryOpacity: 1,
        primaryTransform: `translateX(${(1 - slide) * 100}%)`,
        secondaryTransform: `translateX(${-slide * 100}%)`,
      };
    }
    case 'crossfade':
    case 'fade':
    default:
      return {
        ...base,
        primaryOpacity: eased,
        secondaryOpacity: 1 - eased,
      };
  }
};

export function VideoPlayer() {
  const primaryVideoRef = useRef(null);
  const transitionVideoRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const seekRafRef = useRef(null);
  const previousVideoSrcRef = useRef(null);
  const previousTransitionVideoSrcRef = useRef(null);
  const selectedFileData = useMediaStore((state) => state.selectedFileData);
  const setFileBlobUrl = useMediaStore((state) => state.setFileBlobUrl);
  const fileBlobUrls = useMediaStore((state) => state.fileBlobUrls);
  const playheadPosition = useTimelineStore((state) => state.playheadPosition);
  const setPlayheadPosition = useTimelineStore((state) => state.setPlayheadPosition);
  const isScrubbing = useTimelineStore((state) => state.isScrubbing);
  const clips = useTimelineStore((state) => state.clips);
  const tracks = useTimelineStore((state) => state.tracks);
  const transitions = useTimelineStore((state) => state.transitions);
  const mediaFiles = useMediaStore((state) => state.files);
  const { 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    playbackRate,
    pause,
    togglePlayPause,
    seek,
    setDuration,
    setVolume,
    setPlaybackRate,
    toggleFullscreen,
    playbackSource
  } = usePlayerStore();
  
  const [showControls, setShowControls] = useState(true);
  const [videoSrc, setVideoSrc] = useState(null);
  const [transitionVideoSrc, setTransitionVideoSrc] = useState(null);
  const [transitionVisual, setTransitionVisual] = useState({
    active: false,
    primaryOpacity: 1,
    secondaryOpacity: 0,
    primaryTransform: 'translateX(0%)',
    secondaryTransform: 'translateX(0%)',
    blackOpacity: 0,
  });

  const mediaFilesById = useMemo(() => {
    const map = new Map();
    for (const file of mediaFiles) {
      if (file?.id) {
        map.set(file.id, file);
      }
    }
    return map;
  }, [mediaFiles]);

  const sortedTimelineClips = useMemo(() => {
    if (!Array.isArray(clips)) return [];
    return [...clips].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  }, [clips]);

  const clipAtPlayhead = useMemo(() => {
    if (!sortedTimelineClips.length) return null;
    const match = sortedTimelineClips.find(
      (clip) =>
        playheadPosition >= (clip.start ?? 0) &&
        playheadPosition <= ((clip.end != null) ? clip.end : (clip.start ?? 0) + (clip.duration ?? 0))
    );
    if (match) return match;
    return sortedTimelineClips[sortedTimelineClips.length - 1] ?? null;
  }, [sortedTimelineClips, playheadPosition]);

  const previousClip = useMemo(() => {
    if (!clipAtPlayhead) return null;
    const index = sortedTimelineClips.findIndex((clip) => clip.id === clipAtPlayhead.id);
    if (index <= 0) return null;
    return sortedTimelineClips[index - 1] ?? null;
  }, [sortedTimelineClips, clipAtPlayhead]);

  const transitionsByPair = useMemo(() => {
    const map = new Map();
    if (Array.isArray(transitions)) {
      transitions.forEach((transition) => {
        if (transition?.fromClipId && transition?.toClipId) {
          map.set(`${transition.fromClipId}::${transition.toClipId}`, transition);
        }
      });
    }
    return map;
  }, [transitions]);

  const transitionBetweenClips = useMemo(() => {
    if (!previousClip || !clipAtPlayhead) return null;
    return (
      transitionsByPair.get(`${previousClip.id}::${clipAtPlayhead.id}`) ?? null
    );
  }, [previousClip, clipAtPlayhead, transitionsByPair]);

  const timelineDuration = useMemo(() => {
    if (!Array.isArray(clips) || clips.length === 0) {
      return 0;
    }
    return clips.reduce((maxEnd, clip) => {
      const start = Number(clip?.start) || 0;
      const end = Number.isFinite(clip?.end)
        ? Number(clip.end)
        : start + (Number(clip?.duration) || 0);
      if (!Number.isFinite(end)) {
        return maxEnd;
      }
      return Math.max(maxEnd, end);
    }, 0);
  }, [clips]);

  const convertTimelineToClipTime = useCallback((timelineTime, clip) => {
    if (!clip) return 0;
    const clipStart = Number(clip.start) || 0;
    const clipDuration = Number.isFinite(clip.duration)
      ? Math.max(0, Number(clip.duration))
      : Math.max(0, (Number(clip.end) || clipStart) - clipStart);
    const sourceIn = Number(clip.sourceIn) || 0;
    const offset = Math.max(0, Math.min(clipDuration, timelineTime - clipStart));
    return sourceIn + offset;
  }, []);

  const convertClipTimeToTimeline = useCallback((clip, clipTime) => {
    if (!clip) return clipTime;
    const clipStart = Number(clip.start) || 0;
    const clipDuration = Number.isFinite(clip.duration)
      ? Math.max(0, Number(clip.duration))
      : Math.max(0, (Number(clip.end) || clipStart) - clipStart);
    const sourceIn = Number(clip.sourceIn) || 0;
    const normalized = Math.max(0, clipTime - sourceIn);
    const clamped = Math.min(clipDuration, normalized);
    return clipStart + clamped;
  }, []);

  const transitionContext = useMemo(() => {
    if (playbackSource !== 'timeline') {
      return { active: false };
    }
    if (!previousClip || !clipAtPlayhead || !transitionBetweenClips) {
      return { active: false };
    }
    const duration = Math.max(0.1, Number(transitionBetweenClips.duration) || 0);
    if (!Number.isFinite(duration) || duration <= 0) {
      return { active: false };
    }
    const start = Number(clipAtPlayhead.start) || 0;
    const rawProgress = (playheadPosition - start) / duration;
    if (rawProgress < 0 || rawProgress > 1) {
      return { active: false };
    }

    return {
      active: true,
      type: transitionBetweenClips.type || 'crossfade',
      easing: transitionBetweenClips.easing || 'ease-in-out',
      duration,
      start,
      progress: clamp01(rawProgress),
      previousClip,
      currentClip: clipAtPlayhead,
    };
  }, [playbackSource, previousClip, clipAtPlayhead, transitionBetweenClips, playheadPosition]);

  const clipAtPlayheadRef = useRef(clipAtPlayhead);

  useEffect(() => {
    clipAtPlayheadRef.current = clipAtPlayhead;
  }, [clipAtPlayhead]);

  useEffect(() => {
    if (playbackSource === 'timeline') {
      setDuration(timelineDuration);
    }
  }, [playbackSource, timelineDuration, setDuration]);

  const ensureBlobUrlForFile = useCallback(
    (file) => {
      if (!file?.id) return null;
      const existing = fileBlobUrls[file.id];
      if (existing) {
        return existing;
      }
      if (file.originalFile instanceof Blob) {
        const url = URL.createObjectURL(file.originalFile);
        setFileBlobUrl(file.id, url);
        return url;
      }
      if (typeof file.path === 'string') {
        return file.path;
      }
      return null;
    },
    [fileBlobUrls, setFileBlobUrl]
  );

  // Resolve current primary video source based on playback mode
  useEffect(() => {
    // Clean up previous blob URL if it was a blob URL
    const prevSrc = previousVideoSrcRef.current;
    if (prevSrc && prevSrc.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevSrc);
      } catch (err) {
        // Ignore errors from already-revoked URLs
      }
    }

    let newSrc = null;
    if (playbackSource === 'timeline') {
      if (!clipAtPlayhead) {
        setVideoSrc(null);
        previousVideoSrcRef.current = null;
        return;
      }
      const mediaFile = mediaFilesById.get(clipAtPlayhead.mediaFileId);
      const url = ensureBlobUrlForFile(mediaFile);
      newSrc = url || null;
    } else {
      if (selectedFileData) {
        const url = ensureBlobUrlForFile(selectedFileData);
        newSrc = url || null;
      } else {
        newSrc = null;
      }
    }

    // Only update if different (avoid unnecessary re-renders)
    if (newSrc !== prevSrc) {
      setVideoSrc(newSrc);
      previousVideoSrcRef.current = newSrc;
    }

    // Cleanup on unmount
    return () => {
      if (previousVideoSrcRef.current && previousVideoSrcRef.current.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(previousVideoSrcRef.current);
        } catch (err) {
          // Ignore errors from already-revoked URLs
        }
      }
    };
  }, [
    playbackSource,
    clipAtPlayhead,
    mediaFilesById,
    ensureBlobUrlForFile,
    selectedFileData,
  ]);

  // Prepare secondary video source when a transition is active
  useEffect(() => {
    // Clean up previous transition blob URL if it was a blob URL
    const prevSrc = previousTransitionVideoSrcRef.current;
    if (prevSrc && prevSrc.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevSrc);
      } catch (err) {
        // Ignore errors from already-revoked URLs
      }
    }

    if (!transitionContext.active) {
      setTransitionVideoSrc(null);
      previousTransitionVideoSrcRef.current = null;
      return;
    }

    const mediaFile = mediaFilesById.get(transitionContext.previousClip?.mediaFileId);
    const url = ensureBlobUrlForFile(mediaFile);
    const newSrc = url || null;

    // Only update if different
    if (newSrc !== prevSrc) {
      setTransitionVideoSrc(newSrc);
      previousTransitionVideoSrcRef.current = newSrc;
    }

    // Cleanup on unmount
    return () => {
      if (previousTransitionVideoSrcRef.current && previousTransitionVideoSrcRef.current.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(previousTransitionVideoSrcRef.current);
        } catch (err) {
          // Ignore errors from already-revoked URLs
        }
      }
    };
  }, [transitionContext, mediaFilesById, ensureBlobUrlForFile]);
  
  // Update video element when state changes
  useEffect(() => {
    const primary = primaryVideoRef.current;
    const secondary = transitionVideoRef.current;
    if (primary) {
      primary.defaultMuted = false;
      primary.muted = false;
      primary.volume = volume / 100;
      primary.playbackRate = playbackRate;
    }
    if (secondary) {
      secondary.defaultMuted = false;
      secondary.muted = false;
      secondary.volume = volume / 100;
      secondary.playbackRate = playbackRate;
    }
  }, [volume, playbackRate]);
  
  // Handle play/pause
  useEffect(() => {
    const primary = primaryVideoRef.current;
    const secondary = transitionVideoRef.current;
    if (!primary) return;

    if (isPlaying) {
      primary.play().catch((err) => {
        console.error('Primary video play error:', err);
        if (window?.electronAPI?.logMessage) {
          window.electronAPI.logMessage({
            level: 'error',
            scope: 'player',
            message: 'Primary video play failed',
            stack: err?.stack || String(err),
          });
        }
      });
      if (secondary && transitionContext.active) {
        secondary.play().catch((err) => {
          console.error('Secondary video play error:', err);
          if (window?.electronAPI?.logMessage) {
            window.electronAPI.logMessage({
              level: 'error',
              scope: 'player',
              message: 'Secondary video play failed',
              stack: err?.stack || String(err),
            });
          }
        });
      } else if (secondary) {
        secondary.pause();
      }
    } else {
      primary.pause();
      if (secondary) {
        secondary.pause();
      }
    }
  }, [isPlaying, transitionContext.active]);
  
  // Sync playhead position with RAF-based seeking (timeline mode only)
  useEffect(() => {
    const video = primaryVideoRef.current;
    if (!video) return;
    if (playbackSource !== 'timeline') return;
    // While playing and not scrubbing, the video element is the source of truth.
    if (isPlaying && !isScrubbing) return;

    const targetClip = clipAtPlayhead;
    const targetTime = convertTimelineToClipTime(playheadPosition, targetClip);
    if (!Number.isFinite(targetTime)) return;

    if (Math.abs(video.currentTime - targetTime) < 0.01) {
      if (seekRafRef.current) {
        cancelAnimationFrame(seekRafRef.current);
        seekRafRef.current = null;
      }
      return;
    }
    
    // Cancel any pending seek
    if (seekRafRef.current) {
      cancelAnimationFrame(seekRafRef.current);
    }
    
    // Schedule seek for next frame
    seekRafRef.current = requestAnimationFrame(() => {
      try {
        video.currentTime = targetTime;
      } catch (error) {
        // Ignore seek errors while metadata is still loading
      }
      seek(playheadPosition);
      seekRafRef.current = null;
    });
  }, [playheadPosition, seek, playbackSource, isPlaying, isScrubbing, clipAtPlayhead, convertTimelineToClipTime]);
  
  // Update currentTime from video element with throttling
  useEffect(() => {
    const video = primaryVideoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const now = performance.now();
      
      // Throttle to ~60fps (16.67ms between updates)
      if (now - lastUpdateTimeRef.current >= 16.67) {
        lastUpdateTimeRef.current = now;
        
        // Cancel any pending RAF
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        
        rafRef.current = requestAnimationFrame(() => {
          if (playbackSource === 'timeline') {
            const activeClip = clipAtPlayheadRef.current;
            const timelineTime = convertClipTimeToTimeline(activeClip, current);
            const hasValidTimelineTime = Number.isFinite(timelineTime);

            if (hasValidTimelineTime) {
              seek(timelineTime);
              if (isPlaying && !isScrubbing) {
                setPlayheadPosition(timelineTime);
              }
            } else {
              seek(current);
            }

            if (
              isPlaying &&
              hasValidTimelineTime &&
              Number.isFinite(timelineDuration) &&
              timelineDuration > 0 &&
              timelineTime >= (timelineDuration - 0.01)
            ) {
              video.pause();
              pause();
              const endTime = Math.max(0, timelineDuration);
              if (Math.abs(timelineTime - endTime) > 0.01) {
                seek(endTime);
                setPlayheadPosition(endTime);
              }
            }
          } else {
            seek(current);
          }
        });
      }
    };
    
    const handleLoadedMetadata = () => {
      if (playbackSource !== 'timeline') {
        setDuration(video.duration);
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Clean up RAF on unmount
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (seekRafRef.current) {
        cancelAnimationFrame(seekRafRef.current);
      }
    };
  }, [seek, setPlayheadPosition, setDuration, playbackSource, isPlaying, isScrubbing, pause, convertClipTimeToTimeline, timelineDuration]);

  useEffect(() => {
    if (!transitionContext.active) {
      setTransitionVisual({
        active: false,
        primaryOpacity: 1,
        secondaryOpacity: 0,
        primaryTransform: 'translateX(0%)',
        secondaryTransform: 'translateX(0%)',
        blackOpacity: 0,
      });
      return;
    }

    const visual = buildTransitionVisual({
      type: transitionContext.type,
      easing: transitionContext.easing,
      progress: transitionContext.progress,
    });
    setTransitionVisual(visual);
  }, [transitionContext]);

  useEffect(() => {
    if (!transitionContext.active) {
      const primary = primaryVideoRef.current;
      const secondary = transitionVideoRef.current;
      const baseVolume = volume / 100;
      if (primary) {
        primary.volume = baseVolume;
      }
      if (secondary) {
        secondary.volume = baseVolume;
      }
      return;
    }
    const secondary = transitionVideoRef.current;
    if (!secondary) return;

    const previousClip = transitionContext.previousClip;
    const duration = transitionContext.duration;
    const transitionOffset = Math.max(0, playheadPosition - transitionContext.start);
    const clipDuration =
      Number(previousClip?.duration) ??
      Math.max(
        0,
        (previousClip?.end ?? 0) - (previousClip?.start ?? 0)
      );
    const sourceIn = Number(previousClip?.sourceIn) ?? 0;
    const sourceOut = Number(previousClip?.sourceOut);
    const sourceDuration = Number.isFinite(sourceOut) 
      ? sourceOut - sourceIn 
      : clipDuration;
    const transitionStartTime = Math.max(sourceIn, sourceIn + sourceDuration - duration);
    const targetTime = Math.max(sourceIn, transitionStartTime + transitionOffset);
    
    // Clamp to valid range
    const clampedTargetTime = Math.min(
      Number.isFinite(sourceOut) ? sourceOut : sourceIn + sourceDuration,
      Math.max(sourceIn, targetTime)
    );

    if (secondary.readyState >= 2 && Math.abs(secondary.currentTime - clampedTargetTime) > 0.05) {
      try {
        secondary.currentTime = clampedTargetTime;
      } catch {
        // Secondary clip may not be ready yet; ignore seek errors.
      }
    }

    if (isPlaying) {
      secondary.play().catch((err) => {
        console.error('Secondary video play error during transition:', err);
        if (window?.electronAPI?.logMessage) {
          window.electronAPI.logMessage({
            level: 'error',
            scope: 'player',
            message: 'Secondary video play failed during transition',
            stack: err?.stack || String(err),
          });
        }
      });
    }

    const primary = primaryVideoRef.current;
    const baseVolume = volume / 100;
    const eased = applyEasing(transitionContext.progress, transitionContext.easing);
    if (primary) {
      primary.volume = baseVolume * Math.max(0, eased);
    }
    secondary.volume = baseVolume * Math.max(0, 1 - eased);
  }, [transitionContext, playheadPosition, isPlaying, volume]);
  
  const activeTextOverlays = useMemo(() => {
    if (playbackSource !== 'timeline') return [];
    if (!Array.isArray(clips) || clips.length === 0) return [];

    const overlays = [];
    for (const clip of clips) {
      if (clip.mediaType !== 'overlay' || !(clip.overlayKind === 'text' || clip.textOverlay)) {
        continue;
      }

      const track = tracks?.find((t) => t.id === clip.trackId);
      if (track && track.isVisible === false) {
        continue;
      }

      const start = Number.isFinite(clip.start) ? clip.start : 0;
      const end = Number.isFinite(clip.end)
        ? clip.end
        : start + (Number.isFinite(clip.duration) ? clip.duration : 0);
      const durationSeconds = Math.max(
        0.1,
        Number.isFinite(clip.duration) ? clip.duration : Math.max(0, end - start)
      );

      if (playheadPosition < start || playheadPosition > start + durationSeconds) {
        continue;
      }

      const overlayData = sanitizeTextOverlay(clip.textOverlay ?? {});
      const progressRatio = (playheadPosition - start) / durationSeconds;
      const animatedState = interpolateTextOverlay(overlayData, progressRatio);

      overlays.push({
        clipId: clip.id,
        overlay: overlayData,
        state: animatedState,
        order: track?.order ?? 0,
      });
    }

    overlays.sort((a, b) => a.order - b.order);
    return overlays;
  }, [clips, playbackSource, playheadPosition, tracks]);

  const showTextOverlays = playbackSource === 'timeline' && activeTextOverlays.length > 0;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleSeek = (value) => {
    const newTime = (value / 100) * duration;
    seek(newTime);
    if (playbackSource === 'timeline') {
      setPlayheadPosition(newTime);
    }
  };
  
  const skip = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(newTime);
    if (playbackSource === 'timeline') {
      setPlayheadPosition(newTime);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    PLAY_PAUSE: togglePlayPause,
    SKIP_BACK_1S: () => skip(-1),
    SKIP_FORWARD_1S: () => skip(1),
    SKIP_BACK_5S: () => skip(-5),
    SKIP_FORWARD_5S: () => skip(5),
    VOLUME_UP: () => setVolume(Math.min(100, volume + 5)),
    VOLUME_DOWN: () => setVolume(Math.max(0, volume - 5)),
    MUTE: () => setVolume(volume === 0 ? 75 : 0),
    FULLSCREEN: toggleFullscreen,
  });

  const showTransitionVideo =
    Boolean(transitionContext.active && transitionVideoSrc);
  const primaryVideoStyle = transitionVisual.active
    ? {
        opacity: transitionVisual.primaryOpacity,
        transform: transitionVisual.primaryTransform,
      }
    : undefined;
  const secondaryVideoStyle = transitionVisual.active
    ? {
        opacity: transitionVisual.secondaryOpacity,
        transform: transitionVisual.secondaryTransform,
      }
    : { opacity: 0, transform: 'translateX(0%)' };
  const blackOverlayOpacity = transitionVisual.active
    ? transitionVisual.blackOpacity
    : 0;
  
  return (
    <div
      className="relative w-full h-full bg-zinc-900/40 rounded-lg border border-white/10 overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Playback Source Title */}
      <div className="absolute top-0 left-0 m-2 px-2 py-1 text-[10px] uppercase rounded bg-black/60 text-zinc-300">
        {playbackSource === 'timeline' ? 'Timeline' : `Preview: ${selectedFileData?.name ?? ''}`}
      </div>
      {/* Video Element */}
      <div className="relative w-full h-full">
        {showTransitionVideo && (
          <video
            ref={transitionVideoRef}
            src={transitionVideoSrc || undefined}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-all duration-150 ease-out z-0"
            style={secondaryVideoStyle}
            preload="auto"
            playsInline
          />
        )}
        <video
          ref={primaryVideoRef}
          src={videoSrc || undefined}
          className="absolute inset-0 w-full h-full object-contain transition-all duration-150 ease-out z-10"
          style={primaryVideoStyle}
          preload="auto"
          playsInline
        >
          Your browser does not support the video tag.
        </video>
        {blackOverlayOpacity > 0 && (
          <div
            className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-150 ease-out z-20"
            style={{ opacity: blackOverlayOpacity }}
          />
        )}
      </div>

      {showTextOverlays && (
        <div className="absolute inset-0 pointer-events-none">
          {activeTextOverlays.map(({ clipId, overlay, state }) => {
            const xPercent = overlay.position?.xPercent ?? 0.5;
            const yPercent = overlay.position?.yPercent ?? 0.75;
            const overlayStyle = overlay.style ?? {};
            const overlayText = (overlay.text ?? '').trim() || 'Text Overlay';
            const textStyle = {
              fontFamily: overlayStyle.fontFamily,
              fontWeight: overlayStyle.fontWeight,
              fontSize: `${overlayStyle.fontSize ?? 48}px`,
              color: overlayStyle.color ?? '#ffffff',
              backgroundColor: overlayStyle.backgroundColor ?? 'rgba(0, 0, 0, 0.45)',
              textAlign: overlayStyle.textAlign ?? 'center',
              letterSpacing: `${overlayStyle.letterSpacing ?? 0}px`,
              lineHeight: overlayStyle.lineHeight ?? 1.1,
              textTransform: overlayStyle.uppercase ? 'uppercase' : 'none',
              fontStyle: overlayStyle.italic ? 'italic' : 'normal',
              padding: `${overlayStyle.paddingY ?? 18}px ${overlayStyle.paddingX ?? 32}px`,
              borderRadius: `${overlayStyle.borderRadius ?? 12}px`,
              boxShadow: overlayStyle.shadow
                ? `${overlayStyle.shadow.offsetX ?? 0}px ${overlayStyle.shadow.offsetY ?? 2}px ${overlayStyle.shadow.blur ?? 24}px ${overlayStyle.shadow.color ?? 'rgba(0, 0, 0, 0.55)'}`
                : 'none',
              maxWidth: '80%',
              margin: '0 auto',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
            };

            return (
              <div
                key={clipId}
                className="absolute pointer-events-none"
                style={{
                  left: `${xPercent * 100}%`,
                  top: `${yPercent * 100}%`,
                }}
              >
                <div
                  className="pointer-events-none"
                  style={{
                    opacity: state.opacity ?? 1,
                    transform: `translate(-50%, -50%) translateY(${state.translateY ?? 0}px) scale(${state.scale ?? 1})`,
                    transition: 'opacity 0.12s linear, transform 0.12s ease-out',
                  }}
                >
                  <div style={textStyle}>{overlayText}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Placeholder */}
      {!videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-zinc-400 text-sm">Drop video here to begin editing</p>
          </div>
        </div>
      )}
      
      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 animate-in fade-in duration-200">
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={progress}
              onChange={handleSeek}
              min={0}
              max={100}
              showValue={false}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-zinc-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip content="Skip back 5s">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  icon={<SkipBack className="h-4 w-4" />} 
                  iconOnly
                  onClick={() => skip(-5)}
                />
              </Tooltip>
              <Tooltip content="Skip back 1s">
                <Button 
                  size="md" 
                  variant="ghost" 
                  icon={<ChevronLeft className="h-5 w-5" />} 
                  iconOnly 
                  onClick={() => skip(-1)}
                />
              </Tooltip>
              <Tooltip content="Play/Pause (Space)">
                <Button
                  size="lg"
                  variant="secondary"
                  icon={isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  iconOnly
                  onClick={togglePlayPause}
                />
              </Tooltip>
              <Tooltip content="Skip forward 1s">
                <Button 
                  size="md" 
                  variant="ghost" 
                  icon={<ChevronRight className="h-5 w-5" />} 
                  iconOnly 
                  onClick={() => skip(1)}
                />
              </Tooltip>
              <Tooltip content="Skip forward 5s">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  icon={<SkipForward className="h-4 w-4" />} 
                  iconOnly
                  onClick={() => skip(5)}
                />
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32">
                <Tooltip content={volume > 0 ? "Mute (M)" : "Unmute (M)"}>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    iconOnly
                    onClick={() => setVolume(volume === 0 ? 75 : 0)}
                  />
                </Tooltip>
                <Slider
                  value={volume}
                  onChange={setVolume}
                  min={0}
                  max={100}
                  showValue={false}
                  className="flex-1"
                />
              </div>
              <Tooltip content="Settings">
                <Button size="sm" variant="ghost" icon={<Settings className="h-4 w-4" />} iconOnly />
              </Tooltip>
              <Tooltip content="Fullscreen (F)">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  icon={<Maximize className="h-4 w-4" />} 
                  iconOnly
                  onClick={toggleFullscreen}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
