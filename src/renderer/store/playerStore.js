import { create } from 'zustand';

/**
 * Player Store - Manages video player state and playback controls
 */
export const usePlayerStore = create((set) => ({
  // State
  isPlaying: false,
  currentTime: 0, // in seconds
  duration: 0,
  volume: 75, // 0 to 100
  playbackRate: 1, // 0.25x to 2x
  isMuted: false,
  isFullscreen: false,
  playbackSource: 'timeline', // 'timeline' | 'preview'
  
  // Actions
  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  seek: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

  // Playback source mode
  setPlaybackSource: (source) => set({ playbackSource: source }),
}));

