import React from 'react';

export function Playhead({ position, zoom }) {
  const percentage = (position / 120) * 100; // Assuming 120s timeline
  
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${percentage}%` }}
    >
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-red-500 px-2 py-0.5 rounded-b text-xs text-white shadow-lg">
        {position.toFixed(1)}s
      </div>
      <div className="absolute top-0 left-1/2 w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full border-2 border-white shadow-lg" />
    </div>
  );
}

