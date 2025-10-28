import React, { useState, useRef, useEffect } from 'react';
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

  // Auto-select clip media when the playhead moves across the timeline (timeline mode only)
  useEffect(() => {
    if (!clips?.length) return;
    if (playbackSource !== 'timeline') return;

    const clipAtPlayhead = clips.find(
      (clip) => playheadPosition >= clip.start && playheadPosition <= clip.end
    );

    // Only switch if we're actually on a different clip's media
    if (clipAtPlayhead?.mediaFileId && clipAtPlayhead.mediaFileId !== selectedFile) {
      selectFile(clipAtPlayhead.mediaFileId);
    }
  }, [clips, playheadPosition, selectFile, selectedFile, playbackSource]);
  
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
      
      // Throttle to ~60fps (16.67ms between updates)
      if (now - lastUpdateTimeRef.current >= 16.67) {
        lastUpdateTimeRef.current = now;
        
        // Cancel any pending RAF
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        
        rafRef.current = requestAnimationFrame(() => {
          seek(current);
          if (playbackSource === 'timeline') {
            setPlayheadPosition(current);
            // Stop playback at end of timeline clips
            if (clips && clips.length > 0) {
              const timelineEnd = Math.max(
                ...clips.map((clip) =>
                  (clip.end != null)
                    ? clip.end
                    : (clip.start ?? 0) + (clip.duration ?? 0)
                )
              );
              if (Number.isFinite(timelineEnd) && current >= (timelineEnd - 0.01)) {
                // Clamp to end and pause
                video.pause();
                pause();
                const endTime = Math.max(0, timelineEnd);
                if (Math.abs(current - endTime) > 0.01) {
                  seek(endTime);
                  setPlayheadPosition(endTime);
                }
              }
            }
          }
        });
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
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
  }, [seek, setPlayheadPosition, setDuration, playbackSource]);
  
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
