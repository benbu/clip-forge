import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TRACKS, useTimelineStore } from './timelineStore';

const resetTimelineStore = () => {
  useTimelineStore.setState({
    tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
    clips: [],
    playheadPosition: 0,
    zoom: 1,
    snapToGrid: true,
    selectedClipId: null,
    isScrubbing: false,
  });
};

const getState = () => useTimelineStore.getState();

describe('timelineStore', () => {
  beforeEach(() => {
    resetTimelineStore();
  });

  it('adds clips and normalizes timeline metadata', () => {
    const clip = {
      id: 'clip-1',
      start: 2,
      duration: 5,
      mediaType: 'video',
    };

    getState().addClip(clip);
    const state = getState();

    expect(state.clips).toHaveLength(1);
    expect(state.selectedClipId).toBe('clip-1');

    const stored = state.clips[0];
    expect(stored.start).toBe(2);
    expect(stored.duration).toBe(5);
    expect(stored.end).toBe(7);
    expect(stored.endTrim).toBe(5);
    expect(stored.sourceIn).toBe(0);
    expect(stored.sourceOut).toBe(5);
    expect(stored.trackId).toBe(DEFAULT_TRACKS[0].id);
  });

  it('removes clips and clears selection when target is deleted', () => {
    const clip = { id: 'clip-remove', start: 0, duration: 3 };
    getState().addClip(clip);
    expect(getState().clips).toHaveLength(1);

    getState().removeClip('clip-remove');

    const state = getState();
    expect(state.clips).toHaveLength(0);
    expect(state.selectedClipId).toBeNull();
  });

  it('splits clips at the active playhead and selects the new right-hand clip', () => {
    const clip = { id: 'clip-split', start: 0, end: 10, duration: 10 };
    getState().addClip(clip);
    getState().setPlayheadPosition(4);

    getState().splitClipAtPlayhead('clip-split');
    const { clips, selectedClipId } = getState();

    expect(clips).toHaveLength(2);

    const [left, right] = clips;
    expect(left.end).toBe(4);
    expect(left.sourceIn).toBe(0);
    expect(left.sourceOut).toBe(4);
    expect(right.start).toBe(4);
    expect(right.sourceIn).toBe(4);
    expect(right.sourceOut).toBe(10);
    expect(selectedClipId).toBe(right.id);
  });

  it('recalculates clip duration when trimming in the timeline', () => {
    const clip = { id: 'clip-trim', start: 0, end: 8, duration: 8 };
    getState().addClip(clip);

    getState().trimClip('clip-trim', 1, 5);
    const updated = getState().clips.find((c) => c.id === 'clip-trim');

    expect(updated).toBeDefined();
    expect(updated?.start).toBe(1);
    expect(updated?.end).toBe(5);
    expect(updated?.duration).toBe(4);
    expect(updated?.sourceIn).toBe(1);
    expect(updated?.sourceOut).toBe(5);
  });

  it('moves clips between tracks when requested', () => {
    const clip = { id: 'clip-track', start: 0, duration: 4 };
    getState().addClip(clip);
    const secondVideoTrack = DEFAULT_TRACKS[1].id;

    getState().moveClipToTrack('clip-track', secondVideoTrack);
    const updated = getState().clips.find((c) => c.id === 'clip-track');

    expect(updated?.trackId).toBe(secondVideoTrack);
  });

  it('updates track visibility, mute, and volume state', () => {
    const trackId = DEFAULT_TRACKS[0].id;
    getState().setTrackVisibility(trackId, false);
    getState().toggleTrackMute(trackId, true);
    getState().setTrackVolume(trackId, 42);

    const track = getState().tracks.find((t) => t.id === trackId);
    expect(track?.isVisible).toBe(false);
    expect(track?.isMuted).toBe(true);
    expect(track?.volume).toBe(42);
  });

  it('toggles solo state without muting locked tracks', () => {
    const trackId = DEFAULT_TRACKS[2].id;
    expect(getState().tracks.find((t) => t.id === trackId)?.isSolo).toBe(false);
    getState().toggleTrackSolo(trackId);
    expect(getState().tracks.find((t) => t.id === trackId)?.isSolo).toBe(true);
    getState().toggleTrackSolo(trackId);
    expect(getState().tracks.find((t) => t.id === trackId)?.isSolo).toBe(false);
  });

  it('adjusts track height with nudge helper', () => {
    const trackId = DEFAULT_TRACKS[0].id;
    getState().nudgeTrackHeight(trackId, 0.5);
    expect(getState().tracks.find((t) => t.id === trackId)?.height).toBeCloseTo(1.5);
    getState().nudgeTrackHeight(trackId, -2);
    expect(getState().tracks.find((t) => t.id === trackId)?.height).toBeCloseTo(0.5);
  });

  it('prevents destructive clip actions when track is locked', () => {
    const clip = { id: 'clip-locked', start: 0, end: 6, duration: 6 };
    getState().addClip(clip);
    const trackId = DEFAULT_TRACKS[0].id;

    getState().setTrackLocked(trackId, true);

    getState().trimClip('clip-locked', 1, 5);
    getState().updateClip('clip-locked', { start: 2 });
    getState().removeClip('clip-locked');

    const lockedClip = getState().clips.find((c) => c.id === 'clip-locked');
    expect(lockedClip).toBeDefined();
    expect(lockedClip?.start).toBe(0);
    expect(lockedClip?.end).toBe(6);
    expect(getState().clips).toHaveLength(1);
  });
});
