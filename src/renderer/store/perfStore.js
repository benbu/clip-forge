import { create } from 'zustand';

export const usePerfStore = create((set, get) => ({
  overlayVisible: false,
  fps: 0,
  heapUsedMB: 0,
  sampleIntervalMs: 1000,
  _rafCount: 0,
  _lastFpsAt: performance.now(),
  _timerId: null,

  toggleOverlay: () => set((s) => ({ overlayVisible: !s.overlayVisible })),

  _sampleMemory: () => {
    try {
      const mem = performance && performance.memory ? performance.memory : null;
      if (mem && typeof mem.usedJSHeapSize === 'number') {
        const heapUsedMB = Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
        set({ heapUsedMB });
      }
    } catch (_) {
      // ignore
    }
  },

  _tick: (ts) => {
    const state = get();
    if (!state.overlayVisible) return;
    set({ _rafCount: state._rafCount + 1 });
    const now = ts || performance.now();
    if (now - state._lastFpsAt >= 1000) {
      const fps = state._rafCount;
      set({ fps, _rafCount: 0, _lastFpsAt: now });
    }
    requestAnimationFrame(get()._tick);
  },

  start: () => {
    const { _timerId, sampleIntervalMs } = get();
    if (_timerId) return;
    const id = setInterval(get()._sampleMemory, sampleIntervalMs);
    set({ _timerId: id, _rafCount: 0, _lastFpsAt: performance.now() });
    requestAnimationFrame(get()._tick);
  },

  stop: () => {
    const { _timerId } = get();
    if (_timerId) clearInterval(_timerId);
    set({ _timerId: null });
  },
}));


