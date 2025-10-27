import React from 'react';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/store/timelineStore';

export function TimeRuler({ startTime, endTime, zoom, playhead, visibleDuration }) {
  const { setPlayheadPosition } = useTimelineStore();
  const trackLabelWidth = 160; // Width of the track label area (w-40 = 160px)
  const duration = visibleDuration || (endTime - startTime);
  // Adjust tick interval based on visible duration
  const tickInterval = duration < 60 ? 1 : duration < 120 ? 5 : 10;
  const ticks = [];
  
  for (let i = startTime; i <= endTime; i += tickInterval) {
    ticks.push(i);
  }
  
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const timelineWidth = rect.width - trackLabelWidth;
    const clickX = e.clientX - rect.left - trackLabelWidth;
    const time = (clickX / timelineWidth) * duration;
    const clampedTime = Math.max(0, Math.min(duration, time));
    setPlayheadPosition(clampedTime);
  };
  
  return (
    <div className="sticky top-0 z-10 bg-zinc-900/95 border-b border-white/10">
      <div className="relative h-8 bg-zinc-800/50 cursor-pointer" onClick={handleClick}>
        {ticks.map((tick, idx) => {
          const isMajor = tick % 10 === 0;
          const position = ((tick - startTime) / duration) * 100;
          
          return (
            <div
              key={idx}
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

