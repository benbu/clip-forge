import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';

export const ClipDetailDrawer = forwardRef(function ClipDetailDrawer({ file, onClose }, ref) {
  const clips = useTimelineStore((state) => state.clips);
  const tracks = useTimelineStore((state) => state.tracks);
  const updateClip = useTimelineStore((state) => state.updateClip);
  const renameFile = useMediaStore((s) => s.renameFile);
  const clearMediaSelection = useMediaStore((s) => s.clearSelection);
  const [name, setName] = useState(file?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [position, setPosition] = useState({ top: 80, left: 80 });

  useEffect(() => {
    setName(file?.name || '');
  }, [file?.id, file?.name]);

  useLayoutEffect(() => {
    if (!file) return;

    const anchor =
      document.querySelector('[data-preview-root="true"]') ||
      document.querySelector('[data-preview-root]');

    if (!anchor) return;

    const margin = 16;

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const popupWidth = 320; // w-80 = 320px
      const popupHeight = Math.min(600, window.innerHeight - 130); // max-h-[calc(100vh-130px)]

      let nextTop = Number.isFinite(rect.top) ? Math.max(rect.top + margin, margin) : margin;
      let nextLeft = Number.isFinite(rect.left) ? Math.max(rect.left + margin, margin) : margin;

      // Ensure popup stays within viewport
      if (nextLeft + popupWidth > window.innerWidth) {
        nextLeft = Math.max(window.innerWidth - popupWidth - margin, margin);
      }
      if (nextTop + popupHeight > window.innerHeight) {
        nextTop = Math.max(window.innerHeight - popupHeight - margin, margin);
      }

      setPosition((prev) => {
        if (prev.top === nextTop && prev.left === nextLeft) {
          return prev;
        }
        return { top: nextTop, left: nextLeft };
      });
    };

    updatePosition();

    const handleScroll = () => updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updatePosition());
      try {
        resizeObserver.observe(anchor);
      } catch (_) {
        // Ignore observer errors
      }
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [file?.id]);

  const trackLookup = useMemo(() => {
    const byId = new Map();
    tracks.forEach((track, index) => {
      const trackId = track.id ?? `track-${index}`;
      byId.set(trackId, {
        id: trackId,
        name: track.name || `Track ${index + 1}`,
        order: Number.isFinite(track.order) ? track.order : index,
      });
    });
    return byId;
  }, [tracks]);

  const usages = useMemo(() => {
    if (!file) return [];
    const used = clips.filter((c) => c.mediaFileId === file.id);
    const byTrack = new Map();
    used.forEach((clip) => {
      const resolveTrackId = () => {
        if (clip.trackId) return clip.trackId;
        if (clip.track != null) {
          const numericIndex = Number(clip.track);
          if (Number.isInteger(numericIndex) && numericIndex >= 0 && tracks[numericIndex]) {
            return tracks[numericIndex].id;
          }
          const trackFromLookup = trackLookup.get(String(clip.track));
          if (trackFromLookup) {
            return trackFromLookup.id;
          }
        }
        return 'unassigned';
      };

      const trackId = resolveTrackId();
      const list = byTrack.get(trackId) || [];
      list.push(clip);
      byTrack.set(trackId, list);
    });
    return Array.from(byTrack.entries())
      .map(([trackId, trackClips]) => {
        const trackMeta = trackLookup.get(trackId);
        const order = trackMeta?.order ?? Number.POSITIVE_INFINITY;
        const trackName = trackMeta?.name || (trackId === 'unassigned' ? 'Unassigned Track' : `Track ${trackId}`);
        return {
          trackId,
          trackName,
          count: trackClips.length,
          clipIds: trackClips.map((c) => c.id),
          order,
        };
      })
      .sort((a, b) => {
        if (a.order === b.order) {
          return a.trackName.localeCompare(b.trackName);
        }
        return a.order - b.order;
      });
  }, [clips, file, trackLookup, tracks]);

  const handleSaveName = async () => {
    if (!file) return;
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed === file.name) return;
    try {
      setIsSaving(true);
      const oldName = file.name;
      renameFile(file.id, trimmed);
      // Optionally propagate to existing timeline clips that exactly match old name
      usages.forEach((u) => {
        u.clipIds.forEach((clipId) => {
          const clip = clips.find((c) => c.id === clipId);
          if (clip && clip.name === oldName) {
            updateClip(clipId, { name: trimmed });
          }
        });
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDrawer = () => {
    clearMediaSelection();
    if (onClose && onClose !== clearMediaSelection) {
      onClose();
    }
  };

  if (!file) return null;

  const content = (
    <div
      ref={ref}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-80 max-h-[calc(100vh-130px)] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
        <h3 className="text-xs uppercase font-semibold tracking-wide text-zinc-300">Clip Details</h3>
        <Button size="sm" variant="ghost" onClick={handleCloseDrawer}>
          Close
        </Button>
      </div>

      <div className="px-4 pb-4 pt-2 space-y-3 overflow-y-auto">
        {/* Thumbnail */}
        <div className="aspect-video bg-zinc-800/70 rounded-lg overflow-hidden">
          {file.thumbnail ? (
            <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
          )}
        </div>

        {/* Name (rename) */}
        <div>
          <label className="text-xs text-zinc-400">Name</label>
          <div className="mt-1 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 h-8 text-sm" />
            <Button size="sm" onClick={handleSaveName} disabled={isSaving || !name?.trim() || name === file.name}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-1 rounded-md border border-white/5 bg-zinc-900/60 px-3 py-2">
          <div className="text-xs text-zinc-400">
            Duration: <span className="text-zinc-200">{file.duration}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Resolution: <span className="text-zinc-200">{file.resolution}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Size: <span className="text-zinc-200">{file.size}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Imported: <span className="text-zinc-200">{new Date(file.createdAt).toLocaleString()}</span>
          </div>
          <div className="text-xs text-zinc-400 truncate" title={file.path}>
            Path: <span className="text-zinc-200">{file.path}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Type: <span className="text-zinc-200">{file.type}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Source: <span className="text-zinc-200">{file.sourceType || 'external'}</span>
          </div>
        </div>

        {/* Usage */}
        <div>
          <div className="text-xs uppercase font-semibold text-zinc-400 mb-1">Usage</div>
          {usages.length === 0 ? (
            <div className="text-xs text-zinc-500">Not used in timeline</div>
          ) : (
            <div className="space-y-1">
              {usages.map((u) => (
                <div
                  key={u.trackId}
                  className="flex items-center justify-between text-xs rounded-md bg-zinc-800/70 px-3 py-1 border border-white/5"
                >
                  <span className="text-zinc-200">{u.trackName}</span>
                  <span className="text-zinc-400">{u.count} clip{u.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
});

ClipDetailDrawer.displayName = 'ClipDetailDrawer';

