import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';

const TRACK_NAME_BY_ID = {
  0: 'Video Track 1',
  1: 'Overlay',
};

export function ClipDetailDrawer({ file, onClose }) {
  const { clips, updateClip } = useTimelineStore();
  const renameFile = useMediaStore((s) => s.renameFile);
  const [name, setName] = useState(file?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const usages = useMemo(() => {
    if (!file) return [];
    const used = clips.filter((c) => c.mediaFileId === file.id);
    const byTrack = new Map();
    used.forEach((c) => {
      const list = byTrack.get(c.track) || [];
      list.push(c);
      byTrack.set(c.track, list);
    });
    return Array.from(byTrack.entries())
      .map(([trackId, trackClips]) => ({
        trackId,
        trackName: TRACK_NAME_BY_ID[trackId] || `Track ${trackId}`,
        count: trackClips.length,
        clipIds: trackClips.map((c) => c.id),
      }))
      .sort((a, b) => a.trackId - b.trackId);
  }, [clips, file]);

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

  if (!file) return null;

  const displayPath = file.originalPath || file.path || '';

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-zinc-900/95 border-l border-white/10 shadow-xl z-40 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase font-semibold text-zinc-400">Clip Details</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>

      <div className="space-y-3">
        {/* Thumbnail */}
        <div className="aspect-video bg-zinc-800/70 rounded overflow-hidden">
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
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Duration: <span className="text-zinc-200">{file.duration}</span></div>
          <div className="text-xs text-zinc-400">Resolution: <span className="text-zinc-200">{file.resolution}</span></div>
          <div className="text-xs text-zinc-400">Size: <span className="text-zinc-200">{file.size}</span></div>
          <div className="text-xs text-zinc-400">Imported: <span className="text-zinc-200">{new Date(file.createdAt).toLocaleString()}</span></div>
          <div className="text-xs text-zinc-400 truncate" title={displayPath}>Path: <span className="text-zinc-200">{displayPath || 'Not available'}</span></div>
          <div className="text-xs text-zinc-400">Type: <span className="text-zinc-200">{file.type}</span></div>
          <div className="text-xs text-zinc-400">Source: <span className="text-zinc-200">{file.sourceType || 'external'}</span></div>
        </div>

        {/* Usage */}
        <div>
          <div className="text-xs uppercase font-semibold text-zinc-400 mb-1">Usage</div>
          {usages.length === 0 ? (
            <div className="text-xs text-zinc-500">Not used in timeline</div>
          ) : (
            <div className="space-y-1">
              {usages.map((u) => (
                <div key={u.trackId} className="flex items-center justify-between text-xs bg-zinc-800/60 rounded px-2 py-1 border border-white/5">
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
}


