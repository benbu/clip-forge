import { create } from 'zustand';

const OVERLAY_PREF_KEY = 'clipforge:recordingOverlay';
const OVERLAY_POSITIONS = ['top-right', 'bottom-right', 'bottom-left', 'top-left', 'center'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeCoordinates = (coords) => {
  if (!coords || typeof coords !== 'object') return null;
  const xPercent = Number.isFinite(coords.xPercent) ? clamp(coords.xPercent, 0, 1) : null;
  const yPercent = Number.isFinite(coords.yPercent) ? clamp(coords.yPercent, 0, 1) : null;
  if (xPercent === null || yPercent === null) return null;
  return { xPercent, yPercent };
};

const loadOverlayPrefs = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OVERLAY_PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center', 'custom'].includes(parsed.position) &&
      typeof parsed.size === 'number'
    ) {
      const coordinates = sanitizeCoordinates(parsed.coordinates);
      parsed.coordinates = coordinates;
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
    const payload = {
      position: overlay.position,
      size: overlay.size,
      borderRadius: overlay.borderRadius,
      coordinates: sanitizeCoordinates(overlay.coordinates),
    };
    window.localStorage.setItem(OVERLAY_PREF_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist overlay prefs', error);
  }
};

const defaultOverlay = loadOverlayPrefs() || {
  position: 'top-right',
  size: 0.22,
  borderRadius: 12,
  coordinates: null,
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
  overlayKeyframes: [],

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
    const prev = get().overlay;
    const overlay = {
      ...prev,
      position,
      coordinates:
        position === 'custom'
          ? sanitizeCoordinates(prev.coordinates) || { xPercent: 0.5, yPercent: 0.5 }
          : null,
    };
    persistOverlayPrefs(overlay);
    set({ overlay });
    get().recordOverlayChange(overlay);
  },

  setOverlaySize: (size) => {
    const prev = get().overlay;
    const overlay = {
      ...prev,
      size: clamp(Number(size) || prev.size || 0.22, 0.1, 0.6),
      coordinates:
        prev.position === 'custom'
          ? sanitizeCoordinates(prev.coordinates) || { xPercent: 0.5, yPercent: 0.5 }
          : null,
    };
    persistOverlayPrefs(overlay);
    set({ overlay });
    get().recordOverlayChange(overlay);
  },

  setOverlayBorderRadius: (borderRadius) => {
    const prev = get().overlay;
    const overlay = {
      ...prev,
      borderRadius: clamp(Number(borderRadius) || prev.borderRadius || 12, 0, 64),
    };
    persistOverlayPrefs(overlay);
    set({ overlay });
    get().recordOverlayChange(overlay);
  },

  cycleOverlayPosition: () => {
    const overlay = get().overlay;
    const currentPosition = overlay.position === 'custom' ? 'top-right' : overlay.position || 'top-right';
    const currentIndex = OVERLAY_POSITIONS.indexOf(currentPosition);
    const nextPosition =
      OVERLAY_POSITIONS[(currentIndex + 1) % OVERLAY_POSITIONS.length] || 'top-right';
    get().setOverlayPosition(nextPosition);
  },

  setOverlayCoordinates: ({ xPercent, yPercent }) => {
    const overlay = get().overlay;
    const coordinates = sanitizeCoordinates({ xPercent, yPercent });
    const nextOverlay = {
      ...overlay,
      position: 'custom',
      coordinates,
    };
    persistOverlayPrefs(nextOverlay);
    set({ overlay: nextOverlay });
    get().recordOverlayChange(nextOverlay);
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
      overlayKeyframes: [
        {
          timestamp: 0,
          overlay: { ...get().overlay },
        },
      ],
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
      overlayKeyframes: [],
    }),

  recordOverlayChange: (overlayOverride = null) => {
    const { sessionStartedAt, status } = get();
    if (!sessionStartedAt || !['recording', 'paused'].includes(status)) return;

    const overlay = overlayOverride ? { ...overlayOverride } : { ...get().overlay };
    const timestamp = Math.max(0, (Date.now() - sessionStartedAt) / 1000);

    set((state) => {
      const keyframes = state.overlayKeyframes || [];
      const last = keyframes[keyframes.length - 1];

      const overlayChanged =
        !last ||
        last.overlay.position !== overlay.position ||
          Math.abs((last.overlay.size ?? 0) - (overlay.size ?? 0)) > 0.001 ||
        (last.overlay.borderRadius ?? 0) !== (overlay.borderRadius ?? 0) ||
        ((last.overlay.coordinates?.xPercent ?? null) !== (overlay.coordinates?.xPercent ?? null)) ||
        ((last.overlay.coordinates?.yPercent ?? null) !== (overlay.coordinates?.yPercent ?? null));

      const nextKeyframe = { timestamp, overlay };

      if (!overlayChanged) {
        return {
          overlayKeyframes: [...keyframes.slice(0, -1), nextKeyframe],
        };
      }

      return {
        overlayKeyframes: [...keyframes, nextKeyframe],
      };
    });
  },
}));
