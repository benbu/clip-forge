import React, { useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Eye, Lock, Trash2, ChevronUp, ChevronDown, Headphones } from 'lucide-react';
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
  const nudgeTrackHeight = useTimelineStore((state) => state.nudgeTrackHeight);

  const isVisible = track.isVisible ?? true;
  const isLocked = track.isLocked ?? false;
  const isMuted = track.isMuted ?? false;
  const isSolo = track.isSolo ?? false;
  const trackVolume = useMemo(
    () => Math.max(0, Math.min(100, track.volume ?? 100)),
    [track.volume]
  );
  const trackHeight = useMemo(() => Math.max(0.5, Math.min(3, track.height ?? 1)), [track.height]);

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

  const handleNudgeHeight = useCallback(
    (delta) => {
      if (isLocked) return;
      nudgeTrackHeight(track.id, delta);
    },
    [isLocked, nudgeTrackHeight, track.id]
  );

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
            'border-r border-white/10 bg-zinc-800/50 p-2 flex flex-col gap-2',
            isLocked && 'opacity-80'
          )}
          style={{ width: TRACK_LABEL_WIDTH_PX }}
        >
          <div className="text-xs font-medium text-zinc-300 flex items-center gap-1">
            {track.name}
            <span className="ml-1 text-[10px] uppercase text-zinc-500">
              {track.type}
            </span>
            {isLocked && (
              <Lock className="h-3 w-3 text-indigo-400" aria-hidden="true" />
            )}
            {isSolo && (
              <Headphones className="h-3 w-3 text-amber-300" aria-hidden="true" />
            )}
          </div>

          <div className="flex items-center gap-1">
            <Volume2 className={cn('h-3 w-3', isAudioTrack ? 'text-zinc-400' : 'text-zinc-600')} />
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : trackVolume}
              onChange={handleVolumeChange}
              className="flex-1 h-1"
              disabled={isLocked || !isAudioTrack}
            />
            <span className="text-xs text-zinc-400 w-10 text-right">
              {isMuted ? 'Muted' : `${trackVolume}%`}
            </span>
            <button
              type="button"
              className={cn(
                'ml-1 rounded-md border border-white/10 px-1 py-0.5 text-[10px] uppercase tracking-wide transition',
                isMuted
                  ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                  : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60',
                (!isAudioTrack || isLocked) && 'opacity-40 cursor-not-allowed'
              )}
              onClick={handleToggleMute}
              disabled={isLocked || !isAudioTrack}
            >
              <span className="inline-flex items-center gap-1">
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>
            {isAudioTrack && (
              <button
                type="button"
                className={cn(
                  'ml-1 rounded-md border border-white/10 px-1 py-0.5 text-[10px] uppercase tracking-wide transition',
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

          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-zinc-400" />
            <Switch
              checked={isVisible}
              onChange={(next) => setTrackVisibility(track.id, next)}
              disabled={isLocked}
            />

            <Lock className={cn('h-3 w-3', isLocked ? 'text-indigo-400' : 'text-zinc-400')} />
            <Switch
              checked={isLocked}
              onChange={(next) => setTrackLocked(track.id, next)}
            />
            
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="h-3 w-3" />}
              iconOnly
              className={cn('ml-auto', clipCount > 0 && 'opacity-40 cursor-not-allowed')}
              disabled={clipCount > 0}
            />
          </div>

          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span>Height</span>
            <button
              type="button"
              className="rounded-md border border-white/10 p-0.5 hover:bg-zinc-700/60 transition disabled:opacity-40"
              onClick={() => handleNudgeHeight(0.25)}
              disabled={isLocked}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="rounded-md border border-white/10 p-0.5 hover:bg-zinc-700/60 transition disabled:opacity-40"
              onClick={() => handleNudgeHeight(-0.25)}
              disabled={isLocked}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Clip Area */}
        <div className="flex-1 relative overflow-visible">
          {clips.map(clip => (
            <Clip
              key={clip.id}
              clip={clip}
              zoom={zoom}
              visibleDuration={visibleDuration}
              onSelect={onSelectClip}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
