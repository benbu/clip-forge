import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, RefreshCcw, Webcam, Mic, MicOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { useRecordingStore } from '@/store/recordingStore';
import { recordingService } from '@/services/recordingService';

const OVERLAY_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'center', label: 'Center' },
];

const getThumbnail = (source) => {
  if (!source) return null;
  if (source.thumbnail && typeof source.thumbnail === 'string') {
    return source.thumbnail;
  }
  if (source.thumbnail && typeof source.thumbnail.toDataURL === 'function') {
    return source.thumbnail.toDataURL();
  }
  return null;
};

export function RecordingSetupModal({ onStartRecording, busy }) {
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    isSetupModalOpen,
    closeSetupModal,
    sources,
    selectedSourceId,
    sourceQuery,
    setSourceQuery,
    setSources,
    selectSource,
    setIsFetchingSources,
    isFetchingSources,
    availableCameras,
    setAvailableCameras,
    cameraEnabled,
    setCameraEnabled,
    selectCamera,
    selectedCameraId,
    overlay,
    setOverlayPosition,
    setOverlaySize,
    setOverlayBorderRadius,
    audioEnabled,
    setAudioEnabled,
    availableAudioInputs,
    setAvailableAudioInputs,
    selectedAudioInputId,
    selectAudioInput,
    isAudioMuted,
    toggleMute,
  } = useRecordingStore((state) => ({
    isSetupModalOpen: state.isSetupModalOpen,
    closeSetupModal: state.closeSetupModal,
    sources: state.sources,
    selectedSourceId: state.selectedSourceId,
    sourceQuery: state.sourceQuery,
    setSourceQuery: state.setSourceQuery,
    setSources: state.setSources,
    selectSource: state.selectSource,
    setIsFetchingSources: state.setIsFetchingSources,
    isFetchingSources: state.isFetchingSources,
    availableCameras: state.availableCameras,
    setAvailableCameras: state.setAvailableCameras,
    cameraEnabled: state.cameraEnabled,
    setCameraEnabled: state.setCameraEnabled,
    selectCamera: state.selectCamera,
    selectedCameraId: state.selectedCameraId,
    overlay: state.overlay,
    setOverlayPosition: state.setOverlayPosition,
    setOverlaySize: state.setOverlaySize,
    setOverlayBorderRadius: state.setOverlayBorderRadius,
    audioEnabled: state.audioEnabled,
    setAudioEnabled: state.setAudioEnabled,
    availableAudioInputs: state.availableAudioInputs,
    setAvailableAudioInputs: state.setAvailableAudioInputs,
    selectedAudioInputId: state.selectedAudioInputId,
    selectAudioInput: state.selectAudioInput,
    isAudioMuted: state.isAudioMuted,
    toggleMute: state.toggleMute,
  }));

  const filteredSources = useMemo(() => {
    if (!sourceQuery) return sources;
    return sources.filter((source) =>
      source.name?.toLowerCase().includes(sourceQuery.toLowerCase())
    );
  }, [sources, sourceQuery]);

  useEffect(() => {
    if (!isSetupModalOpen) return;
    let isMounted = true;

    const loadSources = async () => {
      setError(null);
      setIsFetchingSources(true);
      try {
        await recordingService.ensureDevicePermissions({ audio: true, video: true });
        const [screenSources, devices] = await Promise.all([
          recordingService.getScreenSources(),
          recordingService.enumerateDevices(),
        ]);

        if (!isMounted) return;
        setSources(screenSources || []);
        setAvailableCameras(devices.videoInputs || []);
        setAvailableAudioInputs(devices.audioInputs || []);
      } catch (err) {
        console.error('Failed to load recording devices', err);
        if (isMounted) {
          setError('Unable to load capture sources. Check permissions and try again.');
        }
      } finally {
        if (isMounted) {
          setIsFetchingSources(false);
        }
      }
    };

    loadSources();

    return () => {
      isMounted = false;
    };
  }, [
    isSetupModalOpen,
    setAvailableAudioInputs,
    setAvailableCameras,
    setIsFetchingSources,
    setSources,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const screenSources = await recordingService.getScreenSources();
      setSources(screenSources || []);
    } catch (err) {
      console.error('Failed to refresh sources', err);
      setError('Could not refresh sources. Try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartClick = async () => {
    if (!selectedSourceId) {
      setError('Select a screen or window to capture.');
      return;
    }

    setError(null);

    const config = {
      sourceId: selectedSourceId,
      audioEnabled,
      audioDeviceId: selectedAudioInputId,
      cameraEnabled,
      cameraDeviceId: selectedCameraId,
      overlay,
    };

    await onStartRecording(config);
  };

  return (
    <Modal
      isOpen={isSetupModalOpen}
      onClose={() => {
        if (!busy) {
          closeSetupModal();
        }
      }}
      title="Record Screen"
      size="xl"
    >
      <div className="space-y-6">
        {/* Source selection */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Capture Source</h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search screens or windows..."
                value={sourceQuery}
                onChange={(event) => setSourceQuery(event.target.value)}
                className="h-8 w-48"
              />
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCcw className="h-4 w-4" />}
                onClick={handleRefresh}
                disabled={isFetchingSources || isRefreshing}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {isFetchingSources && (
              <div className="col-span-3 text-sm text-zinc-400">
                Loading available screens and windows...
              </div>
            )}
            {!isFetchingSources && filteredSources.length === 0 && (
              <div className="col-span-3 text-sm text-zinc-500">
                No capture sources found. Ensure a screen or window is available.
              </div>
            )}
            {!isFetchingSources &&
              filteredSources.map((source) => {
                const thumbnail = getThumbnail(source);
                const isActive = selectedSourceId === source.id;

                return (
                  <button
                    key={source.id}
                    className={`rounded-lg border text-left transition focus:outline-none ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-white/10 hover:border-indigo-400/60'
                    }`}
                    onClick={() => selectSource(source.id)}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-lg bg-zinc-900">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={source.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-zinc-500">
                          No Preview
                        </div>
                      )}
                      {source.primary && (
                        <span className="absolute top-2 left-2 rounded bg-indigo-600/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
                          Screen
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <div className="text-xs font-medium text-zinc-200 truncate">
                        {source.name || 'Unnamed Source'}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Camera + PiP */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Webcam className="h-4 w-4 text-indigo-400" />
                Camera Overlay
              </div>
              <Switch checked={cameraEnabled} onChange={setCameraEnabled} />
            </div>

            {cameraEnabled && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Camera</label>
                  <select
                    value={selectedCameraId}
                    onChange={(event) => selectCamera(event.target.value)}
                    className="w-full rounded border border-white/10 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200"
                  >
                    {availableCameras.length === 0 && (
                      <option value="default">Default Camera</option>
                    )}
                    {availableCameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || 'Camera'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs text-zinc-400 mb-1">Position</span>
                  <div className="grid grid-cols-3 gap-2">
                    {OVERLAY_POSITIONS.map((position) => {
                      const isActive = overlay.position === position.id;
                      return (
                        <button
                          key={position.id}
                          onClick={() => setOverlayPosition(position.id)}
                          className={`rounded border px-2 py-1 text-xs transition ${
                            isActive
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200'
                              : 'border-white/10 text-zinc-300 hover:border-indigo-400/60'
                          }`}
                        >
                          {position.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Overlay Size ({Math.round((overlay.size || 0.2) * 100)}%)
                  </label>
                  <Slider
                    min={10}
                    max={40}
                    step={1}
                    value={(overlay.size || 0.2) * 100}
                    onValueChange={([value]) => setOverlaySize(value / 100)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Corner Rounding ({overlay.borderRadius || 0}px)
                  </label>
                  <Slider
                    min={0}
                    max={32}
                    step={2}
                    value={overlay.borderRadius || 0}
                    onValueChange={([value]) => setOverlayBorderRadius(value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Mic className="h-4 w-4 text-indigo-400" />
                Microphone
              </div>
              <Switch checked={audioEnabled} onChange={setAudioEnabled} />
            </div>

            {audioEnabled && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Input</label>
                  <select
                    value={selectedAudioInputId}
                    onChange={(event) => selectAudioInput(event.target.value)}
                    className="w-full rounded border border-white/10 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200"
                  >
                    {availableAudioInputs.length === 0 && (
                      <option value="default">Default Microphone</option>
                    )}
                    {availableAudioInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || 'Microphone'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs text-zinc-400 mb-1">Monitor</span>
                  <div className="flex items-center gap-2">
                    <div className="relative h-2 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                      <span className="absolute inset-0 bg-indigo-500/60" style={{ width: '0%' }} />
                    </div>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-zinc-300 hover:text-white transition"
                    >
                      {isAudioMuted ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500">
                  Microphone will be monitored once the recording starts. Use the mute toggle
                  during a session from the header controls.
                </p>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={closeSetupModal} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleStartClick} disabled={busy || !selectedSourceId}>
            Start Recording
          </Button>
        </div>
      </div>
    </Modal>
  );
}
