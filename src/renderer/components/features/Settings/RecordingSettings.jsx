import React from 'react';
import { Switch } from '../../ui/Switch';
import { Video } from 'lucide-react';

export function RecordingSettings() {
  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Video className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-100">Recording</h3>
      </header>

      <section className="space-y-2 first:border-none first:pt-0 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Default Quality</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Resolution</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>720p (1280×720)</option>
              <option>1080p (1920×1080)</option>
              <option>1440p (2560×1440)</option>
              <option>4K (3840×2160)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Frame Rate</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>24 FPS</option>
              <option>30 FPS</option>
              <option>60 FPS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Codec</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>H.264</option>
              <option>H.265</option>
              <option>VP9</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Source Settings</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Video Input</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>Screen 1 (Primary)</option>
              <option>Screen 2</option>
              <option>Webcam</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Audio Input</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>Microphone (Default)</option>
              <option>System Audio</option>
              <option>Both</option>
            </select>
          </div>
          <div className="flex items-center justify-between border border-white/10 rounded px-2 py-1">
            <span className="text-xs text-zinc-300">Preview Overlay</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
        </div>
      </section>
    </div>
  );
}
