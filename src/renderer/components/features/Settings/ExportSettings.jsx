import React from 'react';
import { Switch } from '../../ui/Switch';
import { Download } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export function ExportSettings() {
  const settings = useSettingsStore((s) => s.export);
  const setExportSetting = useSettingsStore((s) => s.setExportSetting);

  const handleResolutionChange = (e) => {
    const value = e.target.value;
    setExportSetting('resolution', value === 'source' ? null : value);
  };

  const handleFpsChange = (e) => {
    const value = e.target.value;
    if (value === 'source') setExportSetting('fps', null);
    else setExportSetting('fps', Number(value));
  };

  const handleFormatChange = (e) => {
    setExportSetting('format', e.target.value);
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Download className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-100">Export</h3>
      </header>

      <section className="space-y-2 first:border-none first:pt-0 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Default Quality</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Resolution</label>
            <select
              className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]"
              value={settings.resolution || 'source'}
              onChange={handleResolutionChange}
            >
              <option value="source">Original</option>
              <option value="3840x2160">4K (3840×2160)</option>
              <option value="1920x1080">1080p (1920×1080)</option>
              <option value="1280x720">720p (1280×720)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Frame Rate</label>
            <select
              className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]"
              value={settings.fps == null ? 'source' : String(settings.fps)}
              onChange={handleFpsChange}
            >
              <option value="source">Original</option>
              <option value="60">60 FPS</option>
              <option value="30">30 FPS</option>
              <option value="24">24 FPS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Output Format</label>
            <select
              className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]"
              value={settings.format}
              onChange={handleFormatChange}
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="webm">WebM</option>
              <option value="avi">AVI</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Advanced</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Two-Pass Encoding</span>
            <Switch checked={false} onChange={() => {}} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Hardware Acceleration</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Encoding Preset</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>Fast</option>
              <option>Balanced</option>
              <option>High Quality</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
