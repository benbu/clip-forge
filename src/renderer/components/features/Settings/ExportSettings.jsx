import React from 'react';
import { Switch } from '../../ui/Switch';
import { useSettingsStore } from '@/store/settingsStore';

export function ExportSettings() {
  const settings = useSettingsStore((s) => s.export);
  const setExportSetting = useSettingsStore((s) => s.setExportSetting);

  const selectClassName =
    'w-full rounded-md border border-white/10 bg-zinc-900/70 px-2.5 py-1.5 text-[12px] text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';
  const labelClassName = 'text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-1 block';
  const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wide text-zinc-300 mb-2';

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
    <div className="space-y-4">
      {/* Export Quality */}
      <div>
        <h4 className={sectionTitleClass}>Default Quality</h4>
        <div className="space-y-3 bg-zinc-900/60 rounded-lg p-3">
          <div>
            <label className={labelClassName}>Resolution</label>
            <select
              className={selectClassName}
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
            <label className={labelClassName}>Frame Rate</label>
            <select
              className={selectClassName}
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
            <label className={labelClassName}>Output Format</label>
            <select
              className={selectClassName}
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
      </div>

      {/* Advanced Export */}
      <div>
        <h4 className={sectionTitleClass}>Advanced</h4>
        <div className="space-y-3 bg-zinc-900/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-300">
            <span>Two-Pass Encoding</span>
            <Switch size="sm" checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-300">
            <span>Hardware Acceleration</span>
            <Switch size="sm" checked={true} onChange={() => {}} />
          </div>
          <div>
            <label className={labelClassName}>Encoding Preset</label>
            <select className={selectClassName}>
              <option>Fast</option>
              <option>Balanced</option>
              <option>High Quality</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
