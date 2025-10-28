import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Scissors, Grid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { TimeRuler } from './TimeRuler';
import { useTimelineStore } from '@/store/timelineStore';
import { usePlayerStore } from '@/store/playerStore';
import { useMediaStore } from '@/store/mediaStore';

export function Timeline() {
  const { 
    clips, 
    playheadPosition,
    zoom,
    snapToGrid,
    setZoom,
    toggleSnapToGrid,
    splitClipAtPlayhead,
    addClip,
    selectedClipId,
    removeClip,
    tracks,
  } = useTimelineStore();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [zoomInput, setZoomInput] = useState(zoom.toFixed(2));
  const zoomInputRef = useRef(null);
  const timelineRef = useRef(null);
  const setPlaybackSource = usePlayerStore((s) => s.setPlaybackSource);
  const clearSelection = useMediaStore((s) => s.clearSelection);

  const focusTimeline = useCallback(() => {
    timelineRef.current?.focus();
  }, []);

  const switchToTimeline = useCallback(() => {
    setPlaybackSource('timeline');
    clearSelection();
  }, [setPlaybackSource, clearSelection]);
  
  const handleZoomInputChange = (value) => {
    setZoomInput(value);
  };
  
  const handleZoomInputBlur = () => {
    const numValue = parseFloat(zoomInput);
    if (isNaN(numValue)) {
      // Revert to current zoom if non-number
      setZoomInput(zoom.toFixed(2));
    } else {
      // Clamp to valid range
      const clampedValue = Math.max(0.1, Math.min(10, numValue));
      setZoomInput(clampedValue.toFixed(2));
      setZoom(clampedValue);
    }
  };
  
  const handleZoomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      zoomInputRef.current?.blur();
    }
  };
  
  // Sync input when zoom changes externally
  useEffect(() => {
    setZoomInput(zoom.toFixed(2));
  }, [zoom]);

  const handleSplitClick = () => {
    // Find clip at playhead and split it
    const clipAtPlayhead = clips.find(clip => 
      playheadPosition >= clip.start && playheadPosition <= clip.end
    );
    
    if (clipAtPlayhead) {
      splitClipAtPlayhead(clipAtPlayhead.id);
    }
  };
  
  const handleDropOnTrack = (event, trackId) => {
    event.preventDefault();
    setIsDragOver(false);
    setHoveredTrackId(null);

    try {
      // Check if there's any data to parse
      const dataString = event.dataTransfer.getData('application/json');
      if (!dataString || dataString.trim() === '') {
        console.warn('No data available in drop event');
        return;
      }
      
      const data = JSON.parse(dataString);
      
      if (data && data.type === 'media-file' && data.file) {
        // Convert media file to timeline clip
        const duration = parseDurationToSeconds(data.file.duration) || data.file.durationSeconds || 0;
        const mediaCategory = deriveMediaCategory(data.file);
        const targetTrack = tracks.find((track) => track.id === trackId);
        if (targetTrack?.isLocked) {
          console.warn(`Track "${targetTrack.name}" is locked; drop cancelled.`);
          return;
        }
        const isTrackCompatible =
          mediaCategory === 'audio'
            ? targetTrack?.type === 'audio'
            : targetTrack?.type !== 'audio';
        const fallbackTrack = tracks.find((track) =>
          mediaCategory === 'audio' ? track.type === 'audio' : track.type !== 'audio'
        );
        const resolvedTrackId = isTrackCompatible
          ? trackId
          : fallbackTrack?.id ?? trackId;
        
        const newClip = {
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mediaFileId: data.file.id,
          name: data.file.name,
          start: playheadPosition,
          end: playheadPosition + duration,
          duration,
          trackId: resolvedTrackId,
          mediaType: mediaCategory,
          startTrim: 0,
          endTrim: duration,
          volume: 100,
          createdAt: new Date().toISOString(),
        };
        
        addClip(newClip);
        focusTimeline();
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  };

  const handleTimelineDragEnter = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleTimelineDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
      setHoveredTrackId(null);
    }
  };

  const handleTimelineDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    setHoveredTrackId(null);
  };
  
  // Helper function to parse duration string to seconds
  const parseDurationToSeconds = (durationStr) => {
    if (!durationStr) return 0;
    
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return 0;
  };

  const deriveMediaCategory = (file) => {
    const typeHint = (
      file?.mediaType ||
      file?.type ||
      file?.mimeType ||
      ''
    )
      .toString()
      .toLowerCase();

    if (typeHint.includes('audio')) {
      return 'audio';
    }

    // If the file explicitly flags itself as audio via category property
    if (file?.category === 'audio' || file?.kind === 'audio') {
      return 'audio';
    }

    return 'video';
  };
  
  return (
    <div 
      ref={timelineRef}
      className={`h-full flex flex-col bg-zinc-900/60 border border-white/10 rounded-lg overflow-hidden ${isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-900/20' : ''}`}
      onDragEnter={handleTimelineDragEnter}
      onDragLeave={handleTimelineDragLeave}
      onDrop={handleTimelineDrop}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (!selectedClipId) return;
          const targetClip = clips.find((clip) => clip.id === selectedClipId);
          if (!targetClip) return;
          const track = tracks.find((t) => t.id === targetClip.trackId);
          if (track?.isLocked) {
            console.warn(`Track "${track.name}" is locked; clip deletion cancelled.`);
            return;
          }
          removeClip(selectedClipId);
        }
      }}
      onMouseDown={(e) => { focusTimeline(); switchToTimeline(); }}
    >
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <h3 className="text-xs uppercase font-semibold text-zinc-400">Timeline</h3>
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              icon={<ZoomOut className="h-3.5 w-3.5" />} 
              iconOnly 
              onClick={() => {
                const newZoom = Math.max(0.1, zoom - 0.25);
                setZoom(newZoom);
                setZoomInput(newZoom.toFixed(2));
              }} 
            />
            <Input
              ref={zoomInputRef}
              type="text"
              value={zoomInput}
              onChange={(e) => handleZoomInputChange(e.target.value)}
              onBlur={handleZoomInputBlur}
              onKeyDown={handleZoomInputKeyDown}
              className="w-16 h-8 text-xs text-center"
            />
            <span className="text-xs text-zinc-500">x</span>
            <Button 
              size="sm" 
              variant="ghost" 
              icon={<ZoomIn className="h-3.5 w-3.5" />} 
              iconOnly 
              onClick={() => {
                const newZoom = Math.min(10, zoom + 0.25);
                setZoom(newZoom);
                setZoomInput(newZoom.toFixed(2));
              }} 
            />
          </div>
          <Button 
            size="sm" 
            variant={snapToGrid ? "secondary" : "ghost"} 
            icon={<Grid className="h-3.5 w-3.5" />} 
            iconOnly
            onClick={toggleSnapToGrid}
          />
          <Button 
            size="sm" 
            variant="ghost" 
            icon={<Scissors className="h-3.5 w-3.5" />} 
            iconOnly
            onClick={handleSplitClick}
            disabled={clips.length === 0}
          />
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        {(() => {
          const MAX_DURATION = 120;
          const visibleDuration = MAX_DURATION / zoom;

          return (
            <>
              {/* Time Ruler */}
              <TimeRuler startTime={0} endTime={visibleDuration} zoom={zoom} playhead={playheadPosition} visibleDuration={visibleDuration} />
              
              {/* Tracks Container */}
              <div className="relative">
                {/* Playhead */}
                <Playhead position={playheadPosition} zoom={zoom} visibleDuration={visibleDuration} />
                
                {/* Tracks */}
                <div className="border-t border-white/10">
                  {tracks.map(track => (
                    <Track
                      key={track.id}
                      track={track}
                      clips={clips.filter(c => c.trackId === track.id)}
                      zoom={zoom}
                      visibleDuration={visibleDuration}
                      onSelectClip={focusTimeline}
                      onDragOverTrack={(event) => {
                        event.preventDefault();
                        setHoveredTrackId(track.id);
                        event.dataTransfer.dropEffect = 'copy';
                      }}
                      onDragLeaveTrack={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setHoveredTrackId((prev) => (prev === track.id ? null : prev));
                        }
                      }}
                      onDropClip={(event) => handleDropOnTrack(event, track.id)}
                      isActiveDropTarget={hoveredTrackId === track.id}
                    />
                  ))}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
