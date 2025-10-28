import React, { useEffect } from 'react';
import { usePerfStore } from '@/store/perfStore';

export function PerfOverlay() {
  const overlayVisible = usePerfStore((s) => s.overlayVisible);
  const fps = usePerfStore((s) => s.fps);
  const heapUsedMB = usePerfStore((s) => s.heapUsedMB);
  const start = usePerfStore((s) => s.start);
  const stop = usePerfStore((s) => s.stop);

  useEffect(() => {
    if (overlayVisible) start(); else stop();
    return () => stop();
  }, [overlayVisible, start, stop]);

  if (!overlayVisible) return null;

  const heapBadge = Number.isFinite(heapUsedMB) ? `${heapUsedMB} MB` : 'n/a';
  const fpsColor = fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="pointer-events-none fixed right-2 bottom-2 z-50 select-none">
      <div className="px-3 py-2 rounded-md bg-black/70 backdrop-blur border border-white/10 text-xs text-zinc-200 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={fpsColor}>FPS: {fps}</div>
          <div>Heap: {heapBadge}</div>
        </div>
      </div>
    </div>
  );
}


