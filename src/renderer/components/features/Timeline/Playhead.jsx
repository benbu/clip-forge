import React, { useState, useRef, useEffect } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { TRACK_LABEL_WIDTH_PX } from '@/lib/timelineConstants';

export function Playhead({ position, zoom, visibleDuration }) {
  const trackLabelWidth = TRACK_LABEL_WIDTH_PX;
  const maxDuration = visibleDuration || 120;
  const percentage = (position / maxDuration) * 100;
  const { setPlayheadPosition } = useTimelineStore();
  const setIsScrubbing = useTimelineStore((s) => s.setIsScrubbing);
  
  const [isDragging, setIsDragging] = useState(false);
  const [cursorStyle, setCursorStyle] = useState('grab');
  const containerRef = useRef(null);
  
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setCursorStyle('grabbing');
    setIsScrubbing(true);
  };
  
  const getTimeFromMouseX = (clientX) => {
    if (!containerRef.current) return position;
    const timeline = containerRef.current.parentElement;
    if (!timeline) return position;
    const rect = timeline.getBoundingClientRect();
    const timelineWidth = rect.width - trackLabelWidth;
    const mouseX = clientX - rect.left - trackLabelWidth;
    const time = (mouseX / timelineWidth) * maxDuration;
    const result = Math.max(0, Math.min(maxDuration, time));
    return result;
  };
  
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const newTime = getTimeFromMouseX(e.clientX);
      setPlayheadPosition(newTime);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setCursorStyle('grab');
      setIsScrubbing(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPlayheadPosition]);
  
  const handleMouseEnter = () => {
    if (!isDragging) setCursorStyle('grab');
  };
  
  const handleMouseLeave = () => {
    if (!isDragging) setCursorStyle('default');
  };
  
  return (
    <div
      ref={containerRef}
      className="absolute -top-8 bottom-0 z-20"
      style={{ 
        left: `calc(${trackLabelWidth}px + ${percentage / 100} * (100% - ${trackLabelWidth}px))`,
        cursor: cursorStyle
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-red-500" />
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-500 px-2 py-0.5 rounded-b text-xs text-white shadow-lg pointer-events-none">
        {position.toFixed(1)}s
      </div>
      <div 
        className="absolute top-1 left-1/2 w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
