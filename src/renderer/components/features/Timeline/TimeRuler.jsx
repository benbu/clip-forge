import React from 'react';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/store/timelineStore';
import { TRACK_LABEL_WIDTH_PX } from '@/lib/timelineConstants';

export function TimeRuler({ startTime, endTime, zoom, playhead, visibleDuration }) {
  const { setPlayheadPosition } = useTimelineStore();
  const trackLabelWidth = TRACK_LABEL_WIDTH_PX;
  const duration = visibleDuration || (endTime - startTime);
  
  // Calculate the appropriate label interval based on screen space
  // We want labels at most 100px apart
  const getLabelInterval = () => {
    const windowWidth = window.innerWidth || 1920;
    const availableWidth = windowWidth - trackLabelWidth - 40; // Account for padding
    const pixelsPerSecond = availableWidth / duration;
    const maxSecondsPerLabel = 100 / pixelsPerSecond;
    
    // Choose appropriate interval: 1, 2, 5, 10, 20, 30, 60, etc.
    const intervals = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600];
    for (const interval of intervals) {
      if (interval >= maxSecondsPerLabel) {
        return interval;
      }
    }
    return 600; // Default for very long timelines
  };
  
  const labelInterval = getLabelInterval();
  const minorTickInterval = labelInterval / 5; // Add minor ticks between labels
  
  const majorTicks = []; // Ticks with labels
  const minorTicks = []; // Ticks without labels
  
  for (let i = startTime; i <= endTime; i += minorTickInterval) {
    minorTicks.push(i);
    if (i % labelInterval === 0) {
      majorTicks.push(i);
    }
  }
  
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    // Ignore clicks within the track label gutter to avoid jumping to 0s
    if (localX <= trackLabelWidth) {
      return;
    }

    const timelineWidth = rect.width - trackLabelWidth;
    const clickX = localX - trackLabelWidth;
    // Ignore clicks beyond the right edge
    if (clickX < 0 || clickX > timelineWidth) {
      return;
    }

    const time = (clickX / timelineWidth) * duration;
    const clampedTime = Math.max(0, Math.min(duration, time));
    setPlayheadPosition(clampedTime);
  };
  
  return (
    <div className="sticky top-0 z-10 bg-zinc-900/95 border-b border-white/10">
      <div className="relative h-8 bg-zinc-800/50 cursor-pointer" onClick={handleClick}>
        {minorTicks.map((tick) => {
          const isMajor = majorTicks.includes(tick);
          const position = ((tick - startTime) / duration) * 100;
          
          return (
            <div
              key={`tick-${tick}`}
              className={cn(
                'absolute top-0 border-l border-zinc-600',
                isMajor && 'border-zinc-500 h-full',
                !isMajor && 'h-1/2'
              )}
              style={{ left: `calc(${trackLabelWidth}px + ${position / 100} * (100% - ${trackLabelWidth}px))` }}
            >
              {isMajor && (
                <span className="absolute -bottom-5 left-0 text-xs text-zinc-400 transform -translate-x-1/2">
                  {tick}s
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
