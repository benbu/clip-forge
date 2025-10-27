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
  const { selectedFile, selectedFileData, fileBlobUrls, setFileBlobUrl } = useMediaStore();
  const { playheadPosition, setPlayheadPosition } = useTimelineStore();
  const { 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    playbackRate,
    togglePlayPause,
    seek,
    setDuration,
    setVolume,
    setPlaybackRate,
    toggleFullscreen
  } = usePlayerStore();
  
  const [showControls, setShowControls] = useState(true);
  const [videoSrc, setVideoSrc] = useState(null);
  
  // Load selected file's video source
  useEffect(() => {
    if (selectedFileData?.originalFile) {
      const blobUrl = URL.createObjectURL(selectedFileData.originalFile);
      setVideoSrc(blobUrl);
      setFileBlobUrl(selectedFileData.id, blobUrl);
      
      return () => {
        // Cleanup will be handled by the store
      };
    } else {
      setVideoSrc(null);
    }
  }, [selectedFileData, setFileBlobUrl]);
  
  // Update video element when state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
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
  
  // Sync playhead position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || Math.abs(video.currentTime - playheadPosition) < 0.1) return;
    
    video.currentTime = playheadPosition;
  }, [playheadPosition]);
  
  // Update currentTime from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setPlayheadPosition(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [setPlayheadPosition, setDuration]);
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleSeek = (value) => {
    const newTime = (value / 100) * duration;
    seek(newTime);
    setPlayheadPosition(newTime);
  };
  
  const skip = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
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
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        className="w-full h-full object-contain"
        preload="metadata"
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
