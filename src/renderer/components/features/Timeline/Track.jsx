import React, { useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Lock,
  Trash2,
  Headphones,
  Eye,
  EyeOff,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Clip } from './Clip';
import { cn } from '@/lib/utils';
import { TRACK_LABEL_WIDTH_PX } from '@/lib/timelineConstants';
import { useTimelineStore } from '@/store/timelineStore';

export function Track({
  track,
  clips,
  zoom,
  visibleDuration,
  onSelectClip,
  onEditTextOverlay = () => {},
  onDragOverTrack,
  onDragLeaveTrack,
  onDropClip,
  isActiveDropTarget = false,
}) {
  const clipCount = clips.length;
  const isAudioTrack = track.type === 'audio';
  const setTrackVisibility = useTimelineStore((state) => state.setTrackVisibility);
  const setTrackLocked = useTimelineStore((state) => state.setTrackLocked);
  const setTrackVolume = useTimelineStore((state) => state.setTrackVolume);
  const toggleTrackMute = useTimelineStore((state) => state.toggleTrackMute);
  const toggleTrackSolo = useTimelineStore((state) => state.toggleTrackSolo);

  const isVisible = track.isVisible ?? true;
  const isLocked = track.isLocked ?? false;
  const isMuted = track.isMuted ?? false;
  const isSolo = track.isSolo ?? false;
  const trackVolume = useMemo(
    () => Math.max(0, Math.min(100, track.volume ?? 100)),
    [track.volume]
  );
  const trackHeight = useMemo(() => Math.max(0.5, Math.min(3, track.height ?? 1)), [track.height]);
  const sortedClips = useMemo(
    () =>
      clips
        .slice()
        .sort((a, b) => {
          const aStart = Number.isFinite(a.start) ? a.start : 0;
          const bStart = Number.isFinite(b.start) ? b.start : 0;
          return aStart - bStart;
        }),
    [clips]
  );

  const handleVolumeChange = useCallback(
    (event) => {
      const value = Number(event.target.value);
      toggleTrackMute(track.id, false);
      setTrackVolume(track.id, value);
    },
    [setTrackVolume, toggleTrackMute, track.id]
  );

  const handleToggleMute = useCallback(() => {
    toggleTrackMute(track.id);
  }, [toggleTrackMute, track.id]);

  const handleToggleSolo = useCallback(() => {
    toggleTrackSolo(track.id);
  }, [toggleTrackSolo, track.id]);

  const trackHeightPx = useMemo(() => Math.round(trackHeight * 96), [trackHeight]);


  const handleDragOver = (event) => {
    if (isLocked) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    if (onDragOverTrack) {
      onDragOverTrack(event);
    }
  };

  const handleDragLeave = (event) => {
    if (onDragLeaveTrack) {
      onDragLeaveTrack(event);
    }
  };

  const handleDrop = (event) => {
    if (onDropClip) {
      onDropClip(event);
    }
  };
  
  return (
    <div
      className={cn(
        'border-b border-white/10 transition-colors group/timeline-track',
        isLocked && 'bg-zinc-900/40',
        !isVisible && 'opacity-70',
        isSolo && 'ring-1 ring-amber-400/70',
        isActiveDropTarget
          ? 'bg-indigo-900/30 ring-1 ring-indigo-400'
          : 'hover:bg-zinc-800/30'
      )}
      style={{ height: `${trackHeightPx}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={isLocked ? undefined : handleDrop}
    >
      <div className="flex h-full">
        {/* Track Label */}
        <div
          className={cn(
            'border-r border-white/10 bg-zinc-800/50 p-2 flex flex-col h-full overflow-y-auto text-[11px] leading-tight',
            isLocked && 'opacity-80'
          )}
          style={{ width: TRACK_LABEL_WIDTH_PX }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-zinc-200">
              <span className="truncate" title={track.name}>
                {track.name}
              </span>
              {isLocked && (
                <Lock className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
              )}
              {isSolo && (
                <Headphones className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              className={cn('h-7 w-7 p-0 shrink-0', clipCount > 0 && 'opacity-40 cursor-not-allowed')}
              disabled={clipCount > 0}
              tooltip="Remove track"
              ariaLabel="Remove track"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
            <div className="flex items-center gap-1">
              {isVisible ? (
                <Eye className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              )}
              <Switch
                size="sm"
                checked={isVisible}
                onChange={(next) => setTrackVisibility(track.id, next)}
                disabled={isLocked}
                className="transform scale-50 origin-left"
                aria-label={isVisible ? 'Toggle track visibility (visible)' : 'Toggle track visibility (hidden)'}
              />
            </div>
            <div className="flex items-center gap-1">
              {isLocked ? (
                <Lock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              )}
              <Switch
                size="sm"
                checked={isLocked}
                onChange={(next) => setTrackLocked(track.id, next)}
                className="transform scale-50 origin-left"
                aria-label={isLocked ? 'Unlock track' : 'Lock track'}
              />
            </div>
            {isAudioTrack && (
              <button
                type="button"
                className={cn(
                  'rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide transition',
                  isSolo
                    ? 'bg-amber-500/30 text-amber-100 hover:bg-amber-500/40'
                    : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60'
                )}
                onClick={handleToggleSolo}
                disabled={isLocked}
              >
                Solo
              </button>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md border border-white/10 transition',
                  isMuted
                    ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                    : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60',
                  (!isAudioTrack || isLocked) && 'opacity-40 cursor-not-allowed'
                )}
                onClick={handleToggleMute}
                disabled={isLocked || !isAudioTrack}
                aria-label={isMuted ? 'Unmute track' : 'Mute track'}
                aria-pressed={isMuted}
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : trackVolume}
                onChange={handleVolumeChange}
                className="w-24 h-1 accent-indigo-500"
                disabled={isLocked || !isAudioTrack}
              />
              <span className="text-[10px] text-zinc-400 w-12 text-right">
                {isMuted ? 'Muted' : `${trackVolume}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Clip Area */}
        <div className="flex-1 relative overflow-visible">
          {sortedClips.map(clip => (
            <Clip
              key={clip.id}
              clip={clip}
              zoom={zoom}
              visibleDuration={visibleDuration}
              onSelect={onSelectClip}
              onEditTextOverlay={onEditTextOverlay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
