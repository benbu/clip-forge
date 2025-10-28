import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Video, Pause, Play, Square, Dot, Mic, MicOff, Webcam } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRecordingStore } from '@/store/recordingStore';
import { useMediaStore } from '@/store/mediaStore';
import { recordingService } from '@/services/recordingService';
import { importVideoFiles } from '@/services/mediaService';
import { formatDuration } from '@/lib/fileUtils';
import { RecordingSetupModal, OVERLAY_POSITIONS } from './RecordingSetupModal';
import { RecordingOverlayEditor } from './RecordingOverlayEditor';

const COUNTDOWN_SECONDS = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatElapsed = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const base = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${base}`;
  }
  return base;
};

export function RecordingControls({ pushToast }) {
  const addFiles = useMediaStore((state) => state.addFiles);
  const [isStarting, setIsStarting] = useState(false);
  const [isOverlayEditorOpen, setOverlayEditorOpen] = useState(false);
  const [overlayEditorAnchorRect, setOverlayEditorAnchorRect] = useState(null);
  const overlayButtonRef = useRef(null);

  const status = useRecordingStore((state) => state.status);
  const openSetupModal = useRecordingStore((state) => state.openSetupModal);
  const closeSetupModal = useRecordingStore((state) => state.closeSetupModal);
  const countdownSeconds = useRecordingStore((state) => state.countdownSeconds);
  const setStatus = useRecordingStore((state) => state.setStatus);
  const setCountdown = useRecordingStore((state) => state.setCountdown);
  const clearCountdown = useRecordingStore((state) => state.clearCountdown);
  const markSessionStart = useRecordingStore((state) => state.markSessionStart);
  const resetSession = useRecordingStore((state) => state.resetSession);
  const updateElapsed = useRecordingStore((state) => state.updateElapsed);
  const elapsedSeconds = useRecordingStore((state) => state.elapsedSeconds);
  const markPaused = useRecordingStore((state) => state.markPaused);
  const resumeFromPause = useRecordingStore((state) => state.resumeFromPause);
  const setMeterLevel = useRecordingStore((state) => state.setMeterLevel);
  const meterLevel = useRecordingStore((state) => state.meterLevel);
  const isAudioMuted = useRecordingStore((state) => state.isAudioMuted);
  const toggleMute = useRecordingStore((state) => state.toggleMute);
  const audioEnabled = useRecordingStore((state) => state.audioEnabled);
  const cameraEnabled = useRecordingStore((state) => state.cameraEnabled);
  const overlay = useRecordingStore((state) => state.overlay);
  const cycleOverlayPosition = useRecordingStore((state) => state.cycleOverlayPosition);

  const busy = useMemo(
    () => ['preparing', 'countdown', 'saving'].includes(status),
    [status]
  );

  useEffect(() => {
    if (status !== 'recording') return undefined;

    const interval = setInterval(() => {
      updateElapsed();
    }, 1000);

    return () => clearInterval(interval);
  }, [status, updateElapsed]);

  useEffect(() => {
    if (!overlay) return;
    if (status !== 'recording' && status !== 'paused') return;
    recordingService.updateOverlay(overlay);
  }, [overlay, status]);

  useEffect(() => {
    if (!isOverlayEditorOpen) return;
    const updateRect = () => {
      const el = overlayButtonRef.current;
      if (el) {
        setOverlayEditorAnchorRect(el.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOverlayEditorOpen]);

  useEffect(() => {
    if (status === 'idle' && isOverlayEditorOpen) {
      setOverlayEditorOpen(false);
    }
  }, [isOverlayEditorOpen, status]);

  useEffect(() => {
    if (!cameraEnabled && isOverlayEditorOpen) {
      setOverlayEditorOpen(false);
    }
  }, [cameraEnabled, isOverlayEditorOpen]);

  useEffect(() => {
    if (!isOverlayEditorOpen) {
      setOverlayEditorAnchorRect(null);
    }
  }, [isOverlayEditorOpen]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.updateRecordingStatus) return;
    api
      .updateRecordingStatus({
        state: status,
        countdownSeconds,
        elapsedSeconds,
        isAudioMuted,
        audioEnabled,
        cameraEnabled,
        overlayPosition: overlay?.position || null,
      })
      .catch(() => {});
  }, [
    status,
    countdownSeconds,
    elapsedSeconds,
    isAudioMuted,
    audioEnabled,
    cameraEnabled,
    overlay?.position,
  ]);

  useEffect(
    () => () => {
      window.electronAPI?.updateRecordingStatus?.({ state: 'idle' });
    },
    []
  );

  const handleArmRecording = useCallback(
    async (config) => {
      if (isStarting) return;
      setIsStarting(true);
      try {
        setStatus('preparing');
        closeSetupModal();
        setCountdown(COUNTDOWN_SECONDS);

        for (let remaining = COUNTDOWN_SECONDS; remaining > 0; remaining -= 1) {
          useRecordingStore.getState().setCountdown(remaining);
          await wait(1000);
          if (useRecordingStore.getState().status !== 'countdown') {
            setIsStarting(false);
            return;
          }
        }

        clearCountdown();

        await recordingService.startRecording({
          ...config,
          overlay: config.overlay,
          onMeterLevel: (level) => {
            setMeterLevel(level);
          },
        });

        recordingService.setMicrophoneMuted(isAudioMuted);
        markSessionStart();
        pushToast('Recording started', 'success', 2000);
      } catch (error) {
        console.error('Failed to start recording', error);
        pushToast(
          error?.message || 'Failed to start recording session',
          'error',
          5000
        );
        resetSession();
      } finally {
        setIsStarting(false);
      }
    },
    [closeSetupModal, isAudioMuted, markSessionStart, pushToast, resetSession, setCountdown, setMeterLevel, setStatus, clearCountdown, isStarting]
  );

  const handleStop = useCallback(async () => {
    const currentStatus = useRecordingStore.getState().status;
    if (currentStatus === 'saving') return;
    const preStopState = useRecordingStore.getState();
    if (preStopState.cameraEnabled) {
      preStopState.recordOverlayChange(preStopState.overlay);
    }
    const snapshot = useRecordingStore.getState();
    setStatus('saving');
    try {
      const recordingResult = await recordingService.stopRecording();
      setMeterLevel(0);

      const savedOutputs = await recordingService.persistRecordingOutputs(recordingResult);

      const playbackResult = recordingResult.base || recordingResult.preview;
      const playbackInfo = savedOutputs.base || savedOutputs.preview;

      if (!recordingResult.base && recordingResult.preview) {
        console.warn('Falling back to preview recording for playback; audio may be missing');
      }

      if (!playbackResult || !playbackInfo) {
        throw new Error('Recording data unavailable');
      }

      const playbackFile = new File([playbackResult.blob], playbackInfo.fileName, {
        type: playbackResult.mimeType || 'video/webm',
        lastModified: Date.now(),
      });
      playbackFile.path = playbackInfo.path;

      const overlayKeyframes =
        snapshot.cameraEnabled && Array.isArray(snapshot.overlayKeyframes)
          ? snapshot.overlayKeyframes.map((entry) => {
              const rawTimestamp = typeof entry.timestamp === 'number' ? entry.timestamp : 0;
              const formattedTimestamp = Number(rawTimestamp.toFixed(3));
              return {
                timestamp: formattedTimestamp,
                overlay: entry.overlay ? { ...entry.overlay } : null,
              };
            })
          : [];

      const recordingMeta = {
        sessionStartedAt: snapshot.sessionStartedAt,
        durationSeconds: snapshot.elapsedSeconds,
        audioEnabled: snapshot.audioEnabled,
        cameraEnabled: snapshot.cameraEnabled,
        overlay: snapshot.cameraEnabled && snapshot.overlay ? { ...snapshot.overlay } : null,
        overlayKeyframes: overlayKeyframes.length > 0 ? overlayKeyframes : null,
        previewPath: playbackInfo.path,
        basePath: savedOutputs.base?.path || null,
        cameraPath: savedOutputs.camera?.path || null,
        cameraResolution: recordingResult.cameraDimensions || null,
        screenResolution: recordingResult.screenDimensions || null,
        overlayDefaults: recordingResult.overlayDefaults || null,
        overlayMargin: recordingResult.overlayMargin,
        sourceFileBaseName: savedOutputs.baseName,
        mutedOnStop: snapshot.isAudioMuted,
      };

      const imported = await importVideoFiles([playbackFile], {
        enrichFile: ({ base }) => ({
          sourceType: 'screen-recording',
          recordingMeta,
          // Override with known accurate values
          duration: formatDuration(snapshot.elapsedSeconds),
          durationSeconds: snapshot.elapsedSeconds,
        }),
      });

      if (imported.length > 0) {
        addFiles(imported);
        pushToast(`Recording saved as ${playbackInfo.fileName}`, 'success', 5000);
      } else {
        pushToast('Recording saved, but failed to import metadata', 'warning', 5000);
      }
    } catch (error) {
      console.error('Failed to stop and save recording', error);
      pushToast(error?.message || 'Failed to save recording', 'error', 6000);
    } finally {
      resetSession();
    }
  }, [addFiles, pushToast, resetSession, setMeterLevel, setStatus]);

  const handlePauseResume = useCallback(() => {
    if (status === 'recording') {
      recordingService.pause();
      markPaused();
    } else if (status === 'paused') {
      recordingService.resume();
      resumeFromPause();
    }
  }, [markPaused, resumeFromPause, status]);

  useEffect(() => {
    if (!window.electronAPI?.onTrayRecordingCommand) return undefined;
    const unsubscribe = window.electronAPI.onTrayRecordingCommand((command) => {
      if (command === 'stop-recording') {
        const current = useRecordingStore.getState().status;
        if (['recording', 'paused', 'countdown', 'preparing'].includes(current)) {
          handleStop();
        }
      } else if (command === 'pause-recording') {
        if (useRecordingStore.getState().status === 'recording') {
          handlePauseResume();
        }
      } else if (command === 'resume-recording') {
        if (useRecordingStore.getState().status === 'paused') {
          handlePauseResume();
        }
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [handlePauseResume, handleStop]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    recordingService.setMicrophoneMuted(nextMuted);
    toggleMute();
  }, [isAudioMuted, toggleMute]);

  const audioMeterWidth = useMemo(() => Math.round((meterLevel || 0) * 100), [meterLevel]);
  const overlayPositionLabel = useMemo(() => {
    if (overlay?.position === 'custom') {
      return 'Custom';
    }
    return (
      OVERLAY_POSITIONS.find((position) => position.id === overlay?.position)?.label ||
      'Top Right'
    );
  }, [overlay]);

  const toggleOverlayEditor = useCallback(
    (event) => {
      if (event?.altKey) {
        cycleOverlayPosition();
        return;
      }
      const next = !isOverlayEditorOpen;
      if (!next) {
        setOverlayEditorOpen(false);
        setOverlayEditorAnchorRect(null);
        return;
      }
      setOverlayEditorOpen(true);
      const el = overlayButtonRef.current;
      if (el) {
        setOverlayEditorAnchorRect(el.getBoundingClientRect());
      }
    },
    [cycleOverlayPosition, isOverlayEditorOpen]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {status === 'idle' && (
          <Button
            className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 transition"
            onClick={openSetupModal}
            icon={<Video className="h-4 w-4" />}
          >
            Record
          </Button>
        )}

        {status !== 'idle' && (
          <div className="flex items-center gap-2 rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-sm text-red-100">
            <Dot className="h-5 w-5 text-red-400 animate-pulse" />
            {status === 'countdown' ? (
              <span>Starting in {countdownSeconds}s</span>
            ) : (
              <span>{status === 'paused' ? 'Paused' : formatElapsed(elapsedSeconds)}</span>
            )}

            {audioEnabled && status !== 'countdown' && (
              <div className="flex items-center gap-1 ml-3">
                <div className="relative h-2 w-24 overflow-hidden rounded-full bg-red-500/20">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-red-400 transition-all"
                    style={{ width: `${audioMeterWidth}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="text-red-200 hover:text-white transition"
                >
                  {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
            )}

            {status !== 'countdown' && (
              <div ref={overlayButtonRef} className="ml-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleOverlayEditor}
                  tooltip={cameraEnabled ? 'Adjust PiP overlay (Alt-click to cycle presets)' : 'Enable the webcam overlay to adjust layout'}
                  icon={<Webcam className="h-4 w-4" />}
                >
                  PiP: {overlayPositionLabel}
                </Button>
              </div>
            )}

            {status === 'paused' ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePauseResume}
                icon={<Play className="h-4 w-4" />}
              >
                Resume
              </Button>
            ) : status !== 'countdown' ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePauseResume}
                icon={<Pause className="h-4 w-4" />}
              >
                Pause
              </Button>
            ) : null}

            {status !== 'countdown' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStop}
                icon={<Square className="h-4 w-4" />}
              >
                Stop
              </Button>
            )}
          </div>
        )}
      </div>

      <RecordingSetupModal onStartRecording={handleArmRecording} busy={busy} />
      {isOverlayEditorOpen && overlayEditorAnchorRect && (
        <RecordingOverlayEditor
          anchorRect={overlayEditorAnchorRect}
          onClose={() => setOverlayEditorOpen(false)}
        />
      )}
    </>
  );
}
