import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/store/playerStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { formatDuration } from '@/lib/fileUtils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { shortcuts } from '@/lib/keyboardShortcuts';

const EPSILON = 0.01;

export function VideoPlayer() {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const seekRafRef = useRef(null);
  const selectedFile = useMediaStore((state) => state.selectedFile);
  const selectedFileData = useMediaStore((state) => state.selectedFileData);
  const setFileBlobUrl = useMediaStore((state) => state.setFileBlobUrl);
  const selectFile = useMediaStore((state) => state.selectFile);
  const fileBlobUrls = useMediaStore((state) => state.fileBlobUrls);
  const playheadPosition = useTimelineStore((state) => state.playheadPosition);
  const setPlayheadPosition = useTimelineStore((state) => state.setPlayheadPosition);
  const isScrubbing = useTimelineStore((state) => state.isScrubbing);
  const clips = useTimelineStore((state) => state.clips);
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
  const [isGapActive, setIsGapActive] = useState(false);

  const gapRafRef = useRef(null);
  const gapStateRef = useRef(null);
  const pendingClipTransitionRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const playbackRateRef = useRef(playbackRate);
  const isScrubbingRef = useRef(isScrubbing);
  const currentTimelineClipRef = useRef(null);
  const currentClipStartRef = useRef(0);
  const currentClipSourceRef = useRef(0);
  const currentClipEndRef = useRef(0);

  const timelineClips = useMemo(() => {
    if (!Array.isArray(clips)) return [];
    return clips
      .map((clip) => {
        const rawStart = Number.isFinite(clip?.start) ? clip.start : 0;
        const hasEnd = Number.isFinite(clip?.end);
        const fallbackDuration = Number.isFinite(clip?.duration) ? Math.max(clip.duration, 0) : 0;
        const computedEnd = hasEnd ? clip.end : rawStart + fallbackDuration;
        const safeEnd = Number.isFinite(computedEnd) ? computedEnd : rawStart + fallbackDuration;
        const normalizedDuration = Math.max(0, safeEnd - rawStart);
        const mediaIn = Number.isFinite(clip?.sourceIn) ? clip.sourceIn : 0;
        return {
          ...clip,
          start: rawStart,
          end: safeEnd,
          duration: normalizedDuration,
          sourceIn: mediaIn,
        };
      })
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  }, [clips]);

  const timelineEnd = useMemo(() => {
    if (timelineClips.length === 0) return 0;
    const last = timelineClips[timelineClips.length - 1];
    return Number.isFinite(last.end) ? last.end : (last.start ?? 0) + (last.duration ?? 0);
  }, [timelineClips]);

  const findClipAtTime = useCallback(
    (time) =>
      timelineClips.find((clip) => {
        const start = clip.start ?? 0;
        const end = clip.end ?? start;
        return time >= start - EPSILON && time <= end - EPSILON;
      }),
    [timelineClips]
  );

  const findNextClipAfterTime = useCallback(
    (time) =>
      timelineClips.find((clip) => {
        const start = clip.start ?? 0;
        return start > time + EPSILON;
      }),
    [timelineClips]
  );

  const setCurrentClipContext = useCallback((clip) => {
    if (clip) {
      const start = Number.isFinite(clip.start) ? clip.start : 0;
      const sourceIn = Number.isFinite(clip.sourceIn) ? clip.sourceIn : 0;
      const duration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration) : Math.max(0, (clip.end ?? start) - start);
      const end = Number.isFinite(clip.end) ? clip.end : start + duration;

      currentTimelineClipRef.current = clip;
      currentClipStartRef.current = start;
      currentClipSourceRef.current = sourceIn;
      currentClipEndRef.current = end;
    } else {
      currentTimelineClipRef.current = null;
      currentClipStartRef.current = 0;
      currentClipSourceRef.current = 0;
      currentClipEndRef.current = 0;
    }
  }, []);

  const computeTimelineTime = useCallback(
    (videoTime) => {
      if (gapStateRef.current) {
        return gapStateRef.current.playhead;
      }

      const clip = currentTimelineClipRef.current;
      if (clip) {
        const start = currentClipStartRef.current;
        const sourceIn = currentClipSourceRef.current;
        const end = currentClipEndRef.current;

        const timelineTime = start + Math.max(0, videoTime - sourceIn);
        return Number.isFinite(end) ? Math.min(end, timelineTime) : timelineTime;
      }

      return playheadPosition;
    },
    [playheadPosition]
  );

  const syncVideoToTimelineTime = useCallback(
    (timelineTime, { maintainPlayback = false } = {}) => {
      const clip = findClipAtTime(timelineTime);
      setCurrentClipContext(clip ?? null);

      if (!Number.isFinite(timelineTime)) {
        return;
      }

      seek(timelineTime);
      setPlayheadPosition(timelineTime);

      if (clip) {
        const clipStart = clip.start ?? 0;
        const sourceIn = Number.isFinite(clip.sourceIn) ? clip.sourceIn : 0;
        const relative = Math.max(0, timelineTime - clipStart);
        const mediaTime = sourceIn + relative;

        pendingSeekRef.current = mediaTime;

        const video = videoRef.current;
        if (video) {
          try {
            video.currentTime = mediaTime;
            pendingSeekRef.current = null;
          } catch (_) {
            // Retry on loadedmetadata if needed
          }

          if (maintainPlayback && isPlayingRef.current && playbackSource === 'timeline') {
            video.play().catch(() => {});
          }
        }

        if (clip.mediaFileId && clip.mediaFileId !== selectedFile) {
          selectFile(clip.mediaFileId);
        }

        setIsGapActive(false);
      } else {
        const video = videoRef.current;
        if (video) {
          video.pause();
        }
        pendingSeekRef.current = null;
        setIsGapActive(true);
      }
    },
    [findClipAtTime, playbackSource, seek, selectFile, selectedFile, setCurrentClipContext, setPlayheadPosition]
  );

  const stopGapTicker = useCallback(() => {
    if (gapRafRef.current) {
      cancelAnimationFrame(gapRafRef.current);
      gapRafRef.current = null;
    }
  }, []);

  const clearGapState = useCallback(() => {
    gapStateRef.current = null;
    setIsGapActive(false);
    stopGapTicker();
    pendingClipTransitionRef.current = null;
  }, [stopGapTicker]);

  const startClipPlayback = useCallback(
    (clip) => {
      if (!clip) return;
      stopGapTicker();
      gapStateRef.current = null;
      pendingClipTransitionRef.current = clip.id ?? null;

      const currentVideo = videoRef.current;
      if (currentVideo) {
        currentVideo.pause();
      }

      setCurrentClipContext(clip);
      syncVideoToTimelineTime(Number.isFinite(clip.start) ? clip.start : 0, {
        maintainPlayback: true,
      });
    },
    [setCurrentClipContext, stopGapTicker, syncVideoToTimelineTime]
  );

  const startGapTicker = useCallback(
    ({ from, to, nextClip }) => {
      if (!Number.isFinite(to) || to <= from + EPSILON || !nextClip) {
        startClipPlayback(nextClip);
        return;
      }

      stopGapTicker();

      const video = videoRef.current;
      if (video) {
        video.pause();
      }

      setCurrentClipContext(null);
      pendingClipTransitionRef.current = null;

      gapStateRef.current = {
        playhead: from,
        from,
        to,
        lastTimestamp: null,
        nextClip,
      };

      setIsGapActive(true);

      const tick = (timestamp) => {
        if (!gapStateRef.current) return;
        const state = gapStateRef.current;

        if (!isPlayingRef.current || isScrubbingRef.current) {
          state.lastTimestamp = timestamp;
          gapRafRef.current = requestAnimationFrame(tick);
          return;
        }

        const lastTs = state.lastTimestamp ?? timestamp;
        const deltaSeconds = ((timestamp - lastTs) / 1000) * (playbackRateRef.current || 1);
        state.lastTimestamp = timestamp;

        const nextTime = Math.min(state.to, state.playhead + deltaSeconds);
        state.playhead = nextTime;

        seek(nextTime);
        setPlayheadPosition(nextTime);

        if (nextTime >= state.to - EPSILON) {
          const upcomingClip = state.nextClip;
          gapStateRef.current = null;
          gapRafRef.current = null;
          setIsGapActive(false);
          startClipPlayback(upcomingClip);
          return;
        }

        gapRafRef.current = requestAnimationFrame(tick);
      };

      gapRafRef.current = requestAnimationFrame((ts) => {
        if (gapStateRef.current) {
          gapStateRef.current.lastTimestamp = ts;
        }
        tick(ts);
      });
    },
    [seek, setPlayheadPosition, setCurrentClipContext, startClipPlayback, stopGapTicker]
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    if (playbackSource === 'timeline') {
      setDuration(timelineEnd);
    }
  }, [playbackSource, setDuration, timelineEnd]);

  useEffect(() => {
    if (playbackSource !== 'timeline') {
      clearGapState();
    }
  }, [playbackSource, clearGapState]);

  useEffect(() => {
    pendingClipTransitionRef.current = null;
    if (gapStateRef.current) {
      const state = gapStateRef.current;
      const nextClipExists = timelineClips.some((clip) => clip.id === state.nextClip?.id);
      if (!nextClipExists) {
        clearGapState();
      }
    }
  }, [timelineClips, clearGapState]);

  useEffect(() => () => {
    clearGapState();
  }, [clearGapState]);

  // Auto-select clip media when the playhead moves across the timeline (timeline mode only)
  useEffect(() => {
    if (playbackSource !== 'timeline') {
      setCurrentClipContext(null);
      return;
    }

    if (!timelineClips.length) {
      setCurrentClipContext(null);
      return;
    }

    const clipAtPlayhead = findClipAtTime(playheadPosition);

    setCurrentClipContext(clipAtPlayhead ?? null);

    if (clipAtPlayhead?.mediaFileId && clipAtPlayhead.mediaFileId !== selectedFile) {
      selectFile(clipAtPlayhead.mediaFileId);
    }
  }, [
    timelineClips,
    playbackSource,
    playheadPosition,
    findClipAtTime,
    selectFile,
    selectedFile,
    setCurrentClipContext,
  ]);
  
  // Load selected file's video source
  useEffect(() => {
    if (selectedFileData?.originalFile) {
      // Check if blob URL already exists in store
      const existingBlobUrl = fileBlobUrls[selectedFileData.id];
      
      if (existingBlobUrl) {
        setVideoSrc(existingBlobUrl);
      } else {
        const blobUrl = URL.createObjectURL(selectedFileData.originalFile);
        setVideoSrc(blobUrl);
        setFileBlobUrl(selectedFileData.id, blobUrl);
      }
      
      return () => {
        // Cleanup will be handled by the store
      };
    } else {
      setVideoSrc(null);
    }
  }, [selectedFileData, setFileBlobUrl, fileBlobUrls]);
  
  // Update video element when state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.defaultMuted = false;
    video.muted = false;
    video.volume = volume / 100;
    video.playbackRate = playbackRate;
  }, [volume, playbackRate]);
  
  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.play().catch(err => console.error('Play error:', err));
    } else {
      video.pause();
    }
  }, [isPlaying]);
  
  // Sync playhead position with RAF-based seeking (timeline mode only)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playbackSource !== 'timeline') return;
    // While playing and not scrubbing, the video element is the source of truth.
    if (isPlaying && !isScrubbing) return;

    if (Math.abs(video.currentTime - playheadPosition) < 0.01) return;
    
    // Cancel any pending seek
    if (seekRafRef.current) {
      cancelAnimationFrame(seekRafRef.current);
    }
    
    // Schedule seek for next frame
    seekRafRef.current = requestAnimationFrame(() => {
      video.currentTime = playheadPosition;
      seek(playheadPosition);
    });
  }, [playheadPosition, seek, playbackSource, isPlaying, isScrubbing]);
  
  // Update currentTime from video element with throttling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const now = performance.now();

      if (now - lastUpdateTimeRef.current >= 16.67) {
        lastUpdateTimeRef.current = now;

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          if (playbackSource !== 'timeline') {
            seek(current);
            setPlayheadPosition(current);
            return;
          }

          const timelineCurrent = computeTimelineTime(current);

          seek(timelineCurrent);

          if (!gapStateRef.current || !isPlayingRef.current || isScrubbingRef.current) {
            setPlayheadPosition(timelineCurrent);
          }

          const activeClip = findClipAtTime(timelineCurrent);

          if (activeClip) {
            if (currentTimelineClipRef.current?.id !== activeClip.id) {
              setCurrentClipContext(activeClip);
            }

            const clipEnd = activeClip.end ?? activeClip.start ?? timelineCurrent;

            if (timelineCurrent < clipEnd - EPSILON) {
              pendingClipTransitionRef.current = null;
            }

            if (
              isPlayingRef.current &&
              !isScrubbingRef.current &&
              timelineCurrent >= clipEnd - EPSILON &&
              !gapStateRef.current &&
              pendingClipTransitionRef.current !== activeClip.id
            ) {
              pendingClipTransitionRef.current = activeClip.id;

              const nextClip = findNextClipAfterTime(clipEnd - EPSILON);

              if (nextClip) {
                const gapStart = clipEnd;
                const gapEnd = nextClip.start ?? gapStart;

                if (gapEnd > gapStart + EPSILON) {
                  startGapTicker({ from: gapStart, to: gapEnd, nextClip });
                } else {
                  startClipPlayback(nextClip);
                }
              } else if (Number.isFinite(timelineEnd) && timelineCurrent >= timelineEnd - EPSILON) {
                clearGapState();
                video.pause();
                pause();
                const endTime = Math.max(0, timelineEnd);
                if (Math.abs(timelineCurrent - endTime) > EPSILON) {
                  seek(endTime);
                  setPlayheadPosition(endTime);
                }
              }
            }
          } else {
            if (!gapStateRef.current) {
              pendingClipTransitionRef.current = null;
              setCurrentClipContext(null);
            }

            if (
              isPlayingRef.current &&
              !isScrubbingRef.current &&
              !gapStateRef.current
            ) {
              const nextClip = findNextClipAfterTime(timelineCurrent);

              if (nextClip) {
                const gapEnd = nextClip.start ?? timelineCurrent;
                if (gapEnd > timelineCurrent + EPSILON) {
                  startGapTicker({ from: timelineCurrent, to: gapEnd, nextClip });
                } else {
                  startClipPlayback(nextClip);
                }
              }
            }
          }
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (playbackSource === 'timeline') {
        setDuration(timelineEnd);
        if (pendingSeekRef.current != null) {
          try {
            video.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          } catch (_) {
            // Ignore seek errors; playback loop will retry if needed
          }
        }
        if (isPlayingRef.current && !isGapActive) {
          video.play().catch(() => {});
        }
      } else {
        setDuration(video.duration);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (seekRafRef.current) {
        cancelAnimationFrame(seekRafRef.current);
      }
    };
  }, [
    seek,
    setPlayheadPosition,
    setDuration,
    playbackSource,
    computeTimelineTime,
    findClipAtTime,
    findNextClipAfterTime,
    setCurrentClipContext,
    startGapTicker,
    startClipPlayback,
    timelineEnd,
    clearGapState,
    pause,
    isGapActive,
  ]);
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleSeek = (value) => {
    const newTime = (value / 100) * duration;
    if (playbackSource === 'timeline') {
      clearGapState();
      syncVideoToTimelineTime(newTime);
      return;
    }
    seek(newTime);
    setPlayheadPosition(newTime);
  };
  
  const skip = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (playbackSource === 'timeline') {
      clearGapState();
      syncVideoToTimelineTime(newTime, { maintainPlayback: true });
      return;
    }
    seek(newTime);
    setPlayheadPosition(newTime);
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
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        className="w-full h-full object-contain"
        preload="auto"
        playsInline
      >
        Your browser does not support the video tag.
      </video>

      {playbackSource === 'timeline' && isGapActive && (
        <div className="absolute inset-0 bg-black pointer-events-none" />
      )}
      
      {/* Placeholder */}
      {!selectedFile && (
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
