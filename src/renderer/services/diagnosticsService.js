import { usePerfStore } from '@/store/perfStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaStore } from '@/store/mediaStore';
import { useSettingsStore } from '@/store/settingsStore';

function bytesToMB(bytes) {
  if (!Number.isFinite(bytes)) return null;
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export async function exportDiagnostics() {
  const perf = usePerfStore.getState().getSnapshot();
  const timeline = useTimelineStore.getState();
  const media = useMediaStore.getState();
  const settings = useSettingsStore.getState();

  const env = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    dev: Boolean(window?.env?.isDev),
    time: new Date().toISOString(),
  };

  const summary = {
    clips: timeline.clips.length,
    tracks: Array.isArray(timeline.tracks) ? timeline.tracks.length : undefined,
    mediaFiles: media.files.length,
    selectedFile: media.selectedFile,
    playhead: timeline.playheadPosition,
    zoom: timeline.zoom,
  };

  const diagnostics = {
    env,
    perf,
    summary,
    settings: {
      autosaveEnabled: settings.autosaveEnabled,
      autosaveMinutes: settings.autosaveMinutes,
      backupRetention: settings.backupRetention,
      export: settings.export,
    },
    memory: (() => {
      try {
        const mem = performance.memory;
        return mem
          ? {
              usedMB: bytesToMB(mem.usedJSHeapSize),
              totalMB: bytesToMB(mem.totalJSHeapSize),
              limitMB: bytesToMB(mem.jsHeapSizeLimit),
            }
          : null;
      } catch (_) {
        return null;
      }
    })(),
  };

  // Choose destination
  let filePath = null;
  if (window.electronAPI?.saveJsonDialog) {
    const suggested = `clipforge-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    filePath = await window.electronAPI.saveJsonDialog(suggested);
  }
  if (!filePath && window.electronAPI?.getUserDataPath) {
    const dir = await window.electronAPI.getUserDataPath();
    if (dir) filePath = `${dir}/clipforge-diagnostics.json`;
  }

  if (!filePath) return null;

  const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
  const buffer = new Uint8Array(await blob.arrayBuffer());
  if (!window.electronAPI?.saveFile) return null;
  await window.electronAPI.saveFile(filePath, buffer);
  return filePath;
}


