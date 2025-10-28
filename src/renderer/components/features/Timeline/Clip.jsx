import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { OverlayTransformDialog } from './OverlayTransformDialog';
import { Slider } from '@/components/ui/Slider';

const SNAP_THRESHOLD = 0.5; // seconds

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clamp01 = (value) => clamp(value, 0, 1);

const sanitizeOverlayTransform = (value = {}, fallback = {}) => {
  const basePosition = value.position ?? fallback.position ?? 'top-right';
  const isCustom = basePosition === 'custom';
  const fallbackCoordinates = fallback.position === 'custom' ? fallback.coordinates : null;
  const coordinatesSource = isCustom
    ? value.coordinates ?? fallbackCoordinates ?? { xPercent: 0.5, yPercent: 0.5 }
    : null;

  return {
    position: basePosition,
    size: clamp(Number(value.size ?? fallback.size ?? 0.22) || 0.22, 0.1, 0.6),
    borderRadius: clamp(Number(value.borderRadius ?? fallback.borderRadius ?? 12) || 12, 0, 64),
    coordinates: coordinatesSource
      ? {
          xPercent: clamp01(coordinatesSource.xPercent ?? 0.5),
          yPercent: clamp01(coordinatesSource.yPercent ?? 0.5),
        }
      : null,
  };
};

const cloneMeta = (meta) => {
  if (!meta) return null;
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch (error) {
    console.warn('Failed to clone recording metadata', error);
    return { ...meta };
  }
};

export function Clip({ clip, zoom, visibleDuration, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [snapGuide, setSnapGuide] = useState(null);
  const clipRef = useRef(null);
  
  const { 
    updateClip, 
    removeClip, 
    trimClip, 
    clips, 
    snapToGrid,
    selectedClipId,
    setSelectedClip,
    moveClipToTrack,
    tracks,
  } = useTimelineStore();
  const mediaFile = useMediaStore(
    useCallback(
      (state) => state.files.find((file) => file.id === clip.mediaFileId),
      [clip.mediaFileId]
    )
  );
  const isSelected = selectedClipId === clip.id;
  const clipMediaType = clip.mediaType ?? 'video';
  const eligibleTracks = useMemo(() => {
    if (clipMediaType === 'audio') {
      return tracks.filter((track) => track.type === 'audio');
    }
    if (clipMediaType === 'overlay') {
      return tracks.filter((track) => track.type === 'overlay');
    }
    return tracks.filter((track) => track.type === 'video');
  }, [clipMediaType, tracks]);
  const parentTrack = tracks.find((track) => track.id === clip.trackId);
  const isTrackLocked = parentTrack?.isLocked ?? false;
  const isTrackVisible = parentTrack?.isVisible ?? true;
  const isTrackMuted = parentTrack?.isMuted ?? false;
  const [isOverlayDialogOpen, setIsOverlayDialogOpen] = useState(false);
  const clipVolume = clip.volume ?? 100;

  const baseRecordingMeta = useMemo(() => {
    if (clip.recordingMeta) {
      return clip.recordingMeta;
    }
    return mediaFile?.recordingMeta ?? null;
  }, [clip.recordingMeta, mediaFile?.recordingMeta]);

  const baseOverlayDefaults = baseRecordingMeta?.overlay ?? baseRecordingMeta?.overlayDefaults ?? null;

  const referenceOverlay = useMemo(
    () => (baseOverlayDefaults ? sanitizeOverlayTransform(baseOverlayDefaults) : null),
    [baseOverlayDefaults]
  );

  const overlayTransform = useMemo(
    () => sanitizeOverlayTransform(clip.overlayTransform, referenceOverlay ?? {}),
    [clip.overlayTransform, referenceOverlay]
  );

  const hasOverlay = useMemo(() => {
    return Boolean(
      clip.overlayTransform ||
        referenceOverlay ||
        baseRecordingMeta?.cameraPath ||
        baseRecordingMeta?.overlayKeyframes?.length ||
        baseRecordingMeta?.cameraEnabled
    );
  }, [clip.overlayTransform, referenceOverlay, baseRecordingMeta]);

  const waveformData = useMemo(() => {
    const sourceWaveform = clip.waveform || mediaFile?.waveform;
    if (!sourceWaveform || !Array.isArray(sourceWaveform.peaks)) {
      return null;
    }

    const peaks = sourceWaveform.peaks;
    if (!peaks.length) return null;
    const sampleCount = Math.floor(peaks.length / 2);
    if (sampleCount <= 0) return null;

    const height = 48;
    const mid = height / 2;
    const amp = mid - 2;
    const commands = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i;
      const top = mid - (max ?? 0) * amp;
      const bottom = mid - (min ?? 0) * amp;
      commands.push(`M${x} ${top}`);
      commands.push(`L${x} ${bottom}`);
    }

    return {
      path: commands.join(' '),
      sampleCount,
      height,
      waveform: sourceWaveform,
    };
  }, [clip.waveform, mediaFile?.waveform]);
  
  // Calculate position and width based on visible duration (affected by zoom)
  const MAX_DURATION = visibleDuration || 120;
  const clipDuration = Math.max(0.1, (clip.end ?? (clip.start + (clip.duration ?? 0))) - clip.start);
  const left = (clip.start / MAX_DURATION) * 100;
  const width = (clipDuration / MAX_DURATION) * 100;
  
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
      for (let i = 0; i <= MAX_DURATION; i += gridSize) {
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
    if (e.target.classList.contains('trim-handle')) {
      onSelect?.(clip);
      setSelectedClip(clip.id);
      return;
    }
    
    setSelectedClip(clip.id);
    onSelect?.(clip);
    if (isTrackLocked) {
      return;
    }
    setIsDragging(true);
    
    const startX = e.clientX;
    const startStart = clip.start;
    const startEnd = clip.start + clipDuration;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const parentWidth = clipRef.current.parentElement.offsetWidth;
      const secondsPerPx = MAX_DURATION / parentWidth;
      const deltaSec = deltaX * secondsPerPx;

      let rawStart = startStart + deltaSec;
      let rawEnd = startEnd + deltaSec;

      // Clamp move within bounds
      const durationSec = rawEnd - rawStart;
      if (rawStart < 0) {
        rawEnd += -rawStart;
        rawStart = 0;
      }
      if (rawEnd > MAX_DURATION) {
        const overshoot = rawEnd - MAX_DURATION;
        rawStart -= overshoot;
        rawEnd = MAX_DURATION;
      }

      // Apply snapping if enabled (snap start)
      const snappedStart = snapToGrid ? getSnapPosition(rawStart) : rawStart;
      const snappedEnd = snappedStart + durationSec;

      updateClip(clip.id, { start: snappedStart, end: snappedEnd });
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
    setSelectedClip(clip.id);
    onSelect?.(clip);
    if (isTrackLocked) {
      return;
    }
    
    const startX = e.clientX;
    const startStart = clip.start;
    const startEnd = clip.start + clipDuration;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const parentWidth = clipRef.current.parentElement.offsetWidth;
      const secondsPerPx = MAX_DURATION / parentWidth;
      const deltaSec = deltaX * secondsPerPx;

      if (side === 'left') {
        let rawStart = startStart + deltaSec;
        rawStart = Math.max(0, Math.min(rawStart, startEnd - 0.1));
        const newStart = snapToGrid ? getSnapPosition(rawStart) : rawStart;
        const clampedStart = Math.max(0, Math.min(newStart, startEnd - 0.1));
        trimClip(clip.id, clampedStart, startEnd);
      } else {
        let rawEnd = startEnd + deltaSec;
        rawEnd = Math.min(MAX_DURATION, Math.max(rawEnd, startStart + 0.1));
        const newEnd = snapToGrid ? getSnapPosition(rawEnd) : rawEnd;
        const clampedEnd = Math.min(MAX_DURATION, Math.max(newEnd, startStart + 0.1));
        trimClip(clip.id, startStart, clampedEnd);
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
    onSelect?.(clip);
    if (isTrackLocked) {
      return;
    }
    removeClip(clip.id);
  };

  const handleTrackChange = (event) => {
    event.stopPropagation();
    const targetTrackId = event.target.value;
    if (!targetTrackId || targetTrackId === clip.trackId) return;
    moveClipToTrack(clip.id, targetTrackId);
  };

  const handleOverlayApply = useCallback(
    (nextTransform) => {
      const baseMetaSource =
        cloneMeta(clip.recordingMeta) ?? cloneMeta(mediaFile?.recordingMeta) ?? {};

      const overlayBase = baseMetaSource.overlayDefaults ?? baseMetaSource.overlay ?? {};
      const combinedOverlay = {
        ...overlayBase,
        ...nextTransform,
      };

      baseMetaSource.overlay = combinedOverlay;
      baseMetaSource.overlayDefaults = combinedOverlay;
      baseMetaSource.overlayKeyframes = [
        {
          timestamp: 0,
          overlay: { ...combinedOverlay },
        },
      ];

      updateClip(clip.id, {
        overlayTransform: nextTransform,
        recordingMeta: baseMetaSource,
      });
    },
    [clip.id, clip.recordingMeta, mediaFile?.recordingMeta, updateClip]
  );

  const handleVolumeChange = useCallback(
    (value) => {
      if (isTrackLocked) return;
      const clamped = Math.max(0, Math.min(200, Number(value) || 0));
      updateClip(clip.id, { volume: clamped });
    },
    [clip.id, isTrackLocked, updateClip]
  );
  
  return (
    <>
      {/* Snap Guide Line */}
      {snapGuide && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 pointer-events-none z-30"
          style={{
            left: `${(snapGuide.position / MAX_DURATION) * 100}%`
          }}
        />
      )}
      
      <div
        ref={clipRef}
        className={cn(
          'absolute top-2 bottom-2 rounded-md border-2 transition-all group',
          'bg-gradient-to-r from-blue-600/80 to-purple-600/80',
          isSelected && 'ring-2 ring-indigo-400 border-indigo-400 z-10',
          !isSelected && 'border-transparent',
          isHovered && 'shadow-lg',
          isDragging && 'scale-105 z-20',
          snapGuide && 'ring-1 ring-yellow-400',
          isTrackLocked ? 'cursor-not-allowed opacity-70 border-dashed border-indigo-400/60' : 'cursor-move',
          !isTrackVisible && 'opacity-40',
          clipMediaType === 'audio' && isTrackMuted && 'opacity-70'
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
          setSelectedClip(clip.id);
          if (onSelect) onSelect(clip);
        }}
      >
        {/* Clip Thumbnail */}
        <div className="w-12 h-full bg-black/30 rounded-l-md flex items-center justify-center">
          <span className="text-2xl">🎬</span>
        </div>
        
        {/* Clip Info */}
        <div className="absolute left-12 top-1 right-2 flex items-center justify-between gap-2 pr-1">
          <span className="text-xs text-white font-medium truncate">{clip.name}</span>
          {hasOverlay && clipMediaType !== 'audio' && (
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-100 transition',
                isTrackLocked && 'opacity-60 cursor-not-allowed'
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (isTrackLocked) return;
                setIsOverlayDialogOpen(true);
              }}
              title="Adjust picture-in-picture overlay"
              disabled={isTrackLocked}
            >
              <Move className="h-3 w-3" />
              PiP
            </button>
          )}
        </div>

        {clipMediaType === 'audio' && (
          <div className="absolute left-12 right-2 top-6 bottom-14 pointer-events-none flex items-center">
            {waveformData ? (
              <svg
                viewBox={`0 0 ${Math.max(waveformData.sampleCount - 1, 1)} ${waveformData.height}`}
                preserveAspectRatio="none"
                className="w-full h-full text-emerald-300/80"
              >
                <path
                  d={waveformData.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div className="w-full text-[10px] uppercase tracking-wide text-zinc-500 text-center">
                Waveform pending…
              </div>
            )}
          </div>
        )}

        {eligibleTracks.length > 0 && (
          <select
            className="absolute top-7 right-2 text-[10px] uppercase tracking-wide bg-black/50 text-white border border-white/20 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            value={clip.trackId}
            onChange={handleTrackChange}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {eligibleTracks.map((trackOption) => (
              <option key={trackOption.id} value={trackOption.id}>
                {trackOption.name}
              </option>
            ))}
          </select>
        )}
        
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

        {clipMediaType === 'audio' && (
          <div className="absolute left-12 right-2 bottom-2 flex items-center gap-2 text-[10px]">
            <span className="uppercase text-zinc-400">Gain</span>
            <div className="flex-1">
              <Slider
                min={0}
                max={200}
                step={1}
                value={clipVolume}
                onChange={handleVolumeChange}
                className={isTrackLocked ? 'opacity-60 pointer-events-none' : undefined}
              />
            </div>
            <span className="text-zinc-300 w-12 text-right">{Math.round(clipVolume)}%</span>
          </div>
        )}
        {hasOverlay && (
          <OverlayTransformDialog
            isOpen={isOverlayDialogOpen}
            onClose={() => setIsOverlayDialogOpen(false)}
            onApply={handleOverlayApply}
            initialValue={overlayTransform}
            referenceOverlay={referenceOverlay ?? overlayTransform}
          />
        )}
      </div>
    </>
  );
}
