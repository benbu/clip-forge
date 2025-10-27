import React from 'react';
import { cn } from '@/lib/utils';

export function TimeRuler({ startTime, endTime, zoom, playhead }) {
  const duration = endTime - startTime;
  const tickInterval = zoom < 1 ? 10 : zoom < 1.5 ? 5 : 1;
  const ticks = [];
  
  for (let i = startTime; i <= endTime; i += tickInterval) {
    ticks.push(i);
  }
  
  return (
    <div className="sticky top-0 z-10 bg-zinc-900/95 border-b border-white/10">
      <div className="relative h-8 bg-zinc-800/50">
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
              style={{ left: `${position}%` }}
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

