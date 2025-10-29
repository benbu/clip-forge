import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

const clamp01 = (value) => Math.min(Math.max(Number(value) || 0, 0), 1);

const COLOR_PALETTE = ['#38bdf8', '#f97316', '#a855f7', '#facc15', '#34d399', '#f87171'];

export function TimelineMinimap({
  clips,
  tracks,
  playhead = 0,
  zoom = 1,
  maxDuration = 120,
  variant = 'default',
  className,
}) {
  const trackColorMap = useMemo(() => {
    const map = {};
    tracks.forEach((track, index) => {
      const paletteColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
      map[track.id] = track.color || paletteColor;
    });
    return map;
  }, [tracks]);

  const normalizedClips = useMemo(() => {
    if (!Array.isArray(clips)) return [];
    return clips.map((clip) => {
      const start = clamp01((clip.start ?? 0) / maxDuration);
      const endRaw = Number.isFinite(clip.end)
        ? clip.end
        : Number.isFinite(clip.duration)
          ? (clip.start ?? 0) + clip.duration
          : clip.start ?? 0;
      const end = clamp01(endRaw / maxDuration);
      const width = Math.max(0.003, end - start);
      return {
        id: clip.id,
        startPercent: start * 100,
        widthPercent: width * 100,
        color: clip.color || trackColorMap[clip.trackId] || '#94a3b8',
      };
    });
  }, [clips, maxDuration, trackColorMap]);

  const visibleFraction = Math.min(1, 1 / (zoom || 1));
  const visibleWidthPercent = visibleFraction * 100;
  const playheadPercent = clamp01(playhead / maxDuration) * 100;
  const isToolbar = variant === 'toolbar';

  return (
    <div
      className={cn(
        isToolbar
          ? 'flex-1 min-w-[180px] max-w-[320px]'
          : 'px-3 py-2 border-b border-white/10',
        'bg-zinc-900/70',
        className
      )}
    >
      <div
        className={cn(
          'relative w-full rounded-full bg-zinc-950 overflow-hidden',
          isToolbar ? 'h-5' : 'h-6'
        )}
      >
        {normalizedClips.map((clip) => (
          <div
            key={clip.id}
            className="absolute top-[25%] h-[50%] rounded-full opacity-70"
            style={{
              left: `${clip.startPercent}%`,
              width: `${clip.widthPercent}%`,
              background: clip.color,
            }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 border-x border-indigo-400/70 bg-indigo-500/10 pointer-events-none"
          style={{ width: `${visibleWidthPercent}%`, left: 0 }}
        />
        <div
          className={cn(
            'absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none',
            playheadPercent <= 0 ? 'opacity-70' : 'opacity-100'
          )}
          style={{ left: `${playheadPercent}%` }}
        />
      </div>
    </div>
  );
}

