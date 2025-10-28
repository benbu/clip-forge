import { create } from 'zustand';

const OVERLAY_PREF_KEY = 'clipforge:recordingOverlay';

const loadOverlayPrefs = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OVERLAY_PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center'].includes(parsed.position) &&
      typeof parsed.size === 'number'
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load overlay prefs', error);
  }
  return null;
};

const persistOverlayPrefs = (overlay) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OVERLAY_PREF_KEY, JSON.stringify(overlay));
  } catch (error) {
    console.warn('Failed to persist overlay prefs', error);
  }
};

const defaultOverlay = loadOverlayPrefs() || {
  position: 'top-right',
  size: 0.22,
  borderRadius: 12,
};

export const useRecordingStore = create((set, get) => ({
  // UI state
  isSetupModalOpen: false,
  status: 'idle', // idle | preparing | countdown | recording | paused | saving
  countdownSeconds: null,
  sources: [],
  selectedSourceId: null,
  isFetchingSources: false,
  sourceQuery: '',

  // Camera overlay
  cameraEnabled: true,
  availableCameras: [],
  selectedCameraId: 'default',
  overlay: defaultOverlay,

  // Audio
  audioEnabled: true,
  availableAudioInputs: [],
  selectedAudioInputId: 'default',
  meterLevel: 0,
  isAudioMuted: false,

  // Session
  sessionStartedAt: null,
  elapsedSeconds: 0,

  // Actions
  openSetupModal: () => set({ isSetupModalOpen: true }),
  closeSetupModal: () =>
    set({
      isSetupModalOpen: false,
      countdownSeconds: null,
      status: get().status === 'countdown' ? 'idle' : get().status,
    }),

  setStatus: (status) => set({ status }),

  setSources: (sources) => {
    const currentSelected = get().selectedSourceId;
    const nextSelected =
      currentSelected && sources.some((s) => s.id === currentSelected)
        ? currentSelected
        : sources[0]?.id || null;
    set({
      sources,
      selectedSourceId: nextSelected,
    });
  },

  setIsFetchingSources: (isFetching) => set({ isFetchingSources: isFetching }),

  selectSource: (sourceId) => set({ selectedSourceId: sourceId }),

  setSourceQuery: (query) => set({ sourceQuery: query }),

  setAvailableCameras: (devices) => {
    const current = get().selectedCameraId;
    const next =
      current && devices.some((d) => d.deviceId === current)
        ? current
        : devices[0]?.deviceId || 'default';
    set({
      availableCameras: devices,
      selectedCameraId: next,
    });
  },

  setCameraEnabled: (enabled) => set({ cameraEnabled: enabled }),

  selectCamera: (deviceId) => set({ selectedCameraId: deviceId }),

  setOverlayPosition: (position) => {
    const overlay = { ...get().overlay, position };
    persistOverlayPrefs(overlay);
    set({ overlay });
  },

  setOverlaySize: (size) => {
    const overlay = { ...get().overlay, size };
    persistOverlayPrefs(overlay);
    set({ overlay });
  },

  setOverlayBorderRadius: (borderRadius) => {
    const overlay = { ...get().overlay, borderRadius };
    persistOverlayPrefs(overlay);
    set({ overlay });
  },

  setAvailableAudioInputs: (devices) => {
    const current = get().selectedAudioInputId;
    const next =
      current && devices.some((d) => d.deviceId === current)
        ? current
        : devices[0]?.deviceId || 'default';
    set({
      availableAudioInputs: devices,
      selectedAudioInputId: next,
    });
  },

  selectAudioInput: (deviceId) => set({ selectedAudioInputId: deviceId }),

  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),

  toggleMute: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),

  setMeterLevel: (level) => set({ meterLevel: level }),

  setCountdown: (seconds) => set({ countdownSeconds: seconds, status: 'countdown' }),

  clearCountdown: () => set({ countdownSeconds: null }),

  markSessionStart: (timestamp = Date.now()) =>
    set({
      status: 'recording',
      sessionStartedAt: timestamp,
      elapsedSeconds: 0,
      countdownSeconds: null,
      isSetupModalOpen: false,
    }),

  updateElapsed: () => {
    const { sessionStartedAt, status } = get();
    if (!sessionStartedAt || status !== 'recording') return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
    set({ elapsedSeconds });
  },

  markPaused: () =>
    set({
      status: 'paused',
    }),

  resumeFromPause: () => {
    const { elapsedSeconds } = get();
    set({
      status: 'recording',
      sessionStartedAt: Date.now() - elapsedSeconds * 1000,
    });
  },

  resetSession: () =>
    set({
      status: 'idle',
      countdownSeconds: null,
      sessionStartedAt: null,
      elapsedSeconds: 0,
    }),
}));
