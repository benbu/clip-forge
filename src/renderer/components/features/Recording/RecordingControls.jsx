import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Video, Pause, Play, Square, Dot, Mic, MicOff, Webcam } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRecordingStore } from '@/store/recordingStore';
import { useMediaStore } from '@/store/mediaStore';
import { recordingService } from '@/services/recordingService';
import { importVideoFiles } from '@/services/mediaService';
import { RecordingSetupModal, OVERLAY_POSITIONS } from './RecordingSetupModal';

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

  const {
    status,
    openSetupModal,
    closeSetupModal,
    countdownSeconds,
    setStatus,
    setCountdown,
    clearCountdown,
    markSessionStart,
    resetSession,
    updateElapsed,
    elapsedSeconds,
    markPaused,
    resumeFromPause,
    setMeterLevel,
    meterLevel,
    isAudioMuted,
    toggleMute,
    audioEnabled,
    cameraEnabled,
    overlay,
    cycleOverlayPosition,
  } = useRecordingStore((state) => ({
    status: state.status,
    openSetupModal: state.openSetupModal,
    closeSetupModal: state.closeSetupModal,
    countdownSeconds: state.countdownSeconds,
    setStatus: state.setStatus,
    setCountdown: state.setCountdown,
    clearCountdown: state.clearCountdown,
    markSessionStart: state.markSessionStart,
    resetSession: state.resetSession,
    updateElapsed: state.updateElapsed,
    elapsedSeconds: state.elapsedSeconds,
    markPaused: state.markPaused,
    resumeFromPause: state.resumeFromPause,
    setMeterLevel: state.setMeterLevel,
    meterLevel: state.meterLevel,
    isAudioMuted: state.isAudioMuted,
    toggleMute: state.toggleMute,
    audioEnabled: state.audioEnabled,
    cameraEnabled: state.cameraEnabled,
    overlay: state.overlay,
    cycleOverlayPosition: state.cycleOverlayPosition,
  }));

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

      const playbackResult = recordingResult.preview || recordingResult.base;
      const playbackInfo = savedOutputs.preview || savedOutputs.base;

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
        enrichFile: () => ({
          sourceType: 'screen-recording',
          recordingMeta,
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

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    recordingService.setMicrophoneMuted(nextMuted);
    toggleMute();
  }, [isAudioMuted, toggleMute]);

  const audioMeterWidth = Math.round((meterLevel || 0) * 100);
  const overlayPositionLabel =
    OVERLAY_POSITIONS.find((position) => position.id === overlay?.position)?.label ||
    'Top Right';

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

            {cameraEnabled && status !== 'countdown' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={cycleOverlayPosition}
                tooltip="Cycle overlay position"
                icon={<Webcam className="h-4 w-4" />}
              >
                PiP: {overlayPositionLabel}
              </Button>
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
    </>
  );
}
