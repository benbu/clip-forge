import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/store/timelineStore';

const SNAP_THRESHOLD = 0.5; // seconds

export function Clip({ clip, zoom, onSelect }) {
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [snapGuide, setSnapGuide] = useState(null);
  const clipRef = useRef(null);
  
  const { updateClip, removeClip, trimClip, clips, snapToGrid } = useTimelineStore();
  
  // Calculate position and width based on zoom
  const left = (clip.start / 120) * 100; // Assuming 120s timeline
  const width = (clip.duration / 120) * 100;
  
  // Find snap points from other clips
  const findSnapPoints = () => {
    const snapPoints = [];
    
    clips.forEach(otherClip => {
      if (otherClip.id === clip.id) return;
      
      // Add start and end of other clips as snap points
      snapPoints.push({ position: otherClip.start, type: 'start' });
      snapPoints.push({ position: otherClip.start + otherClip.duration, type: 'end' });
    });
    
    // Add grid snap points if enabled
    if (snapToGrid) {
      const gridSize = 1; // 1 second grid
      for (let i = 0; i <= 120; i += gridSize) {
        snapPoints.push({ position: i, type: 'grid' });
      }
    }
    
    return snapPoints;
  };
  
  // Check for snapping and return adjusted position
  const getSnapPosition = (targetPosition) => {
    if (!snapToGrid && clips.length === 1) return targetPosition;
    
    const snapPoints = findSnapPoints();
    const threshold = SNAP_THRESHOLD;
    
    for (const snapPoint of snapPoints) {
      const distance = Math.abs(targetPosition - snapPoint.position);
      
      if (distance < threshold) {
        setSnapGuide({ 
          position: snapPoint.position, 
          type: snapPoint.type 
        });
        return snapPoint.position;
      }
    }
    
    setSnapGuide(null);
    return targetPosition;
  };
  
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('trim-handle')) return;
    
    setIsSelected(true);
    setIsDragging(true);
    
    const startX = e.clientX;
    const startLeft = left;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / clipRef.current.parentElement.offsetWidth) * 100;
      const rawStart = ((deltaPercent + startLeft) / 100) * 120;
      
      // Apply snapping if enabled
      const newStart = snapToGrid ? getSnapPosition(rawStart) : rawStart;
      
      updateClip(clip.id, { start: Math.max(0, newStart) });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setSnapGuide(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleTrim = (side, e) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = width;
    const startLeft = left;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / clipRef.current.parentElement.offsetWidth) * 100;
      
      if (side === 'left') {
        const rawStart = ((deltaPercent + startLeft) / 100) * 120;
        const newStart = snapToGrid ? getSnapPosition(rawStart) : rawStart;
        const newDuration = clip.duration + (clip.start - newStart);
        
        if (newDuration > 1 && newStart >= 0) {
          trimClip(clip.id, newStart, clip.end);
        }
      } else {
        const rawEnd = clip.start + ((deltaPercent + startWidth) / 100) * 120;
        const newEnd = snapToGrid ? getSnapPosition(rawEnd) : rawEnd;
        const newDuration = newEnd - clip.start;
        
        if (newDuration > 1) {
          trimClip(clip.id, clip.start, newEnd);
        }
      }
    };
    
    const handleMouseUp = () => {
      setSnapGuide(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    removeClip(clip.id);
  };
  
  return (
    <>
      {/* Snap Guide Line */}
      {snapGuide && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 pointer-events-none z-30"
          style={{
            left: `${(snapGuide.position / 120) * 100}%`
          }}
        />
      )}
      
      <div
        ref={clipRef}
        className={cn(
          'absolute top-2 bottom-2 rounded-md border-2 cursor-move transition-all group',
          'bg-gradient-to-r from-blue-600/80 to-purple-600/80',
          isSelected && 'ring-2 ring-indigo-400 border-indigo-400 z-10',
          !isSelected && 'border-transparent',
          isHovered && 'shadow-lg',
          isDragging && 'scale-105 z-20',
          snapGuide && 'ring-1 ring-yellow-400'
        )}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: clip.color ? `linear-gradient(to right, ${clip.color}80, ${clip.color}60)` : undefined
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onClick={() => {
          setIsSelected(!isSelected);
          if (onSelect) onSelect(clip);
        }}
      >
        {/* Clip Thumbnail */}
        <div className="w-12 h-full bg-black/30 rounded-l-md flex items-center justify-center">
          <span className="text-2xl">🎬</span>
        </div>
        
        {/* Clip Info */}
        <div className="absolute left-12 top-1 right-1 text-xs text-white font-medium truncate">
          {clip.name}
        </div>
        
        {/* Trim Handles */}
        {(isSelected || isHovered) && (
          <>
            <div 
              className="trim-handle absolute left-0 top-0 bottom-0 w-2 bg-indigo-500/50 cursor-ew-resize opacity-0 group-hover:opacity-100 rounded-l-md transition-opacity"
              onMouseDown={(e) => handleTrim('left', e)}
            />
            <div 
              className="trim-handle absolute right-0 top-0 bottom-0 w-2 bg-indigo-500/50 cursor-ew-resize opacity-0 group-hover:opacity-100 rounded-r-md transition-opacity"
              onMouseDown={(e) => handleTrim('right', e)}
            />
            
            {/* Delete Button */}
            {isSelected && (
              <button
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm font-bold transition-colors z-10"
                onClick={handleDelete}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
