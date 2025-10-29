import { create } from 'zustand';

const buildState = (overrides = {}) => ({
  state: 'idle',
  error: null,
  updatedAt: Date.now(),
  ...overrides,
});

export const useWaveformStore = create((set, get) => ({
  items: {},

  setPending: (mediaId) => {
    if (!mediaId) return;
    set((state) => ({
      items: {
        ...state.items,
        [mediaId]: buildState({ mediaId, state: 'pending', error: null }),
      },
    }));
  },

  setProcessing: (mediaId) => {
    if (!mediaId) return;
    set((state) => {
      const prev = state.items[mediaId] || {};
      return {
        items: {
          ...state.items,
          [mediaId]: buildState({
            mediaId,
            state: 'processing',
            error: null,
            startedAt: prev.startedAt || Date.now(),
          }),
        },
      };
    });
  },

  setReady: (mediaId, waveform) => {
    if (!mediaId) return;
    set((state) => ({
      items: {
        ...state.items,
        [mediaId]: buildState({
          mediaId,
          state: 'ready',
          waveformVersion: waveform?.version ?? 1,
        }),
      },
    }));
  },

  setError: (mediaId, error) => {
    if (!mediaId) return;
    const message = error?.message || String(error || 'Unknown error');
    set((state) => ({
      items: {
        ...state.items,
        [mediaId]: buildState({
          mediaId,
          state: 'error',
          error: message,
        }),
      },
    }));
  },

  clear: (mediaId) => {
    if (!mediaId) return;
    set((state) => {
      const next = { ...state.items };
      delete next[mediaId];
      return { items: next };
    });
  },

  getStatus: (mediaId) => {
    if (!mediaId) return null;
    return get().items[mediaId] || null;
  },
}));

