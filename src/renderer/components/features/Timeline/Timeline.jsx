import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Scissors, Grid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { TimeRuler } from './TimeRuler';
import { useTimelineStore } from '@/store/timelineStore';

export function Timeline() {
  const { 
    clips, 
    playheadPosition, 
    zoom, 
    snapToGrid,
    setPlayheadPosition,
    setZoom,
    toggleSnapToGrid,
    splitClipAtPlayhead,
    addClip,
    selectedClipId,
    removeClip,
  } = useTimelineStore();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoomInput, setZoomInput] = useState(zoom.toFixed(2));
  const zoomInputRef = useRef(null);
  const timelineRef = useRef(null);

  const focusTimeline = useCallback(() => {
    timelineRef.current?.focus();
  }, []);
  
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
  
  const tracks = [
    { id: 0, name: 'Video Track 1' },
    { id: 1, name: 'Overlay' },
  ];
  
  const handleSplitClick = () => {
    // Find clip at playhead and split it
    const clipAtPlayhead = clips.find(clip => 
      playheadPosition >= clip.start && playheadPosition <= clip.end
    );
    
    if (clipAtPlayhead) {
      splitClipAtPlayhead(clipAtPlayhead.id);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      // Check if there's any data to parse
      const dataString = e.dataTransfer.getData('application/json');
      if (!dataString || dataString.trim() === '') {
        console.warn('No data available in drop event');
        return;
      }
      
      const data = JSON.parse(dataString);
      
      if (data && data.type === 'media-file' && data.file) {
        // Convert media file to timeline clip
        const duration = parseDurationToSeconds(data.file.duration);
        
        const newClip = {
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mediaFileId: data.file.id,
          name: data.file.name,
          start: playheadPosition,
          end: playheadPosition + duration,
          track: 0, // Default to first track
          startTrim: 0,
          endTrim: 0,
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
  
  return (
    <div 
      ref={timelineRef}
      className={`h-full flex flex-col bg-zinc-900/60 border border-white/10 rounded-lg overflow-hidden ${isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-900/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (selectedClipId) {
            removeClip(selectedClipId);
          }
        }
      }}
      onMouseDown={focusTimeline}
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
                      clips={clips.filter(c => c.track === track.id)}
                      zoom={zoom}
                      visibleDuration={visibleDuration}
                      onSelectClip={focusTimeline}
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
