import React, { useState, useCallback, useEffect } from 'react';
import { MediaLibrary } from './components/features/MediaLibrary/MediaLibrary';
import { VideoPlayer } from './components/features/Player/VideoPlayer';
import { Timeline } from './components/features/Timeline/Timeline';
import { SettingsPanel } from './components/features/Settings/SettingsPanel';
import { ResizablePanel } from './components/ui/ResizablePanel';
import { ToastContainer } from '@/components/ui/Toast';
import { exportService } from '@/services/exportService';
import { useTimelineStore } from '@/store/timelineStore';
import { RecordingControls } from '@/components/features/Recording/RecordingControls';
import { PerfOverlay } from '@/components/ui/PerfOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePerfStore } from '@/store/perfStore';
import { persistenceService } from '@/services/persistenceService';
import { waveformQueue } from '@/services/waveformQueue';

export default function App() {

  const [toasts, setToasts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const clipCount = useTimelineStore((state) => state.clips.length);
  const togglePerf = usePerfStore((s) => s.toggleOverlay);

  useKeyboardShortcuts({
    PERF_TOGGLE: togglePerf,
  }, [togglePerf]);

  useEffect(() => {
    // Initialize autosave session and prompt recovery if needed
    try {
      persistenceService.startSession();
      persistenceService.startAutoSave();
      // Prompt recovery (non-blocking)
      setTimeout(() => {
        persistenceService.maybeOfferRecovery().catch(() => {});
      }, 0);
      waveformQueue.bootstrap();
    } catch (e) {
      console.warn('Persistence init failed', e);
    }
  }, []);

  useEffect(() => {
    exportService.onProgress((percent) => setExportProgress(percent));
  }, []);

  const removeToast = useCallback(
    (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
    []
  );

  const pushToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const logError = useCallback(async (message, error) => {
    try {
      if (!window?.electronAPI?.logMessage) return null;
      const stackLines = [error?.stack || String(error)];
      if (error?.cause) {
        stackLines.push('--- cause ---');
        stackLines.push(error.cause.stack || error.cause.message || String(error.cause));
      } else if (error?.details) {
        stackLines.push('--- details ---');
        stackLines.push(String(error.details));
      }

      return await window.electronAPI.logMessage({
        level: 'error',
        scope: 'export',
        message,
        stack: stackLines.join('\n'),
      });
    } catch (logErr) {
      console.error('Failed to write log entry', logErr);
      return null;
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    try {
      // Memory guardrail (soft warn at 900MB, hard stop at 1100MB)
      const mem = performance && performance.memory ? performance.memory : null;
      if (mem && typeof mem.usedJSHeapSize === 'number') {
        const usedMB = mem.usedJSHeapSize / (1024 * 1024);
        if (usedMB > 1100) {
          pushToast('Memory usage too high (>1.1 GB). Close other apps or restart before export.', 'error', 8000);
          return;
        }
        if (usedMB > 900) {
          pushToast('High memory usage detected (>900 MB). Export may be slow or fail.', 'warning', 6000);
        }
      }

      setIsExporting(true);
      setExportProgress(0);

      const result = await exportService.exportTimeline({});

      if (!result) {
        pushToast('Export cancelled', 'warning');
        return;
      }

      const fileLabel = result.filePath?.split(/[\\/]/).pop() || 'export.mp4';
      pushToast(`Exported ${fileLabel}`, 'success', 6000);
    } catch (error) {
      if (error?.message === 'Export cancelled') {
        pushToast('Export cancelled', 'warning');
      } else {
        const causeMessage =
          error?.cause?.message ||
          error?.details;
        const baseMessage = causeMessage
          ? `${error?.message || 'Export failed'}: ${causeMessage}`
          : error?.message || 'Export failed';

        const logPath = await logError(baseMessage, error);
        const toastMessage = logPath
          ? `${baseMessage}. Details saved to ${logPath}`
          : baseMessage;
        pushToast(toastMessage, 'error', 0);
      }
      console.error(error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting, logError, pushToast]);

  return (
    <div className="h-screen flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top Bar */}
      <header
        role="banner"
        className="h-12 border-b border-white/10 bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50 flex items-center px-3 select-none flex-shrink-0"
      >
        <div className="font-semibold tracking-wide">ClipForge</div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <button className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition">Import</button>
          <RecordingControls pushToast={pushToast} />
          <button
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExport}
            disabled={isExporting || clipCount === 0}
          >
            {isExporting ? `Exporting… ${exportProgress}%` : 'Export'}
          </button>
        </div>
      </header>

      <main className="flex flex-col flex-1 min-h-0 gap-1 p-2">
        <PerfOverlay />
        <section className="flex gap-1 flex-1 min-h-0">
          <ResizablePanel
            id="media-library"
            side="left"
            defaultSize={280}
            minSize={200}
            maxSize={600}
          >
            <MediaLibrary />
          </ResizablePanel>

          <div className="flex-1 min-w-0 flex gap-1">
            <div className="flex-1 min-w-0">
              <VideoPlayer />
            </div>

            <ResizablePanel
              id="settings"
              side="right"
              defaultSize={320}
              minSize={200}
              maxSize={600}
              className="flex flex-col"
            >
              <SettingsPanel />
            </ResizablePanel>
          </div>
        </section>

        <ResizablePanel
          id="timeline"
          side="top"
          defaultSize={256}
          minSize={150}
          maxSize={600}
          className="w-full flex flex-col border-t border-white/10 bg-zinc-900/60"
        >
          <Timeline />
        </ResizablePanel>
      </main>
    </div>
  );
}
