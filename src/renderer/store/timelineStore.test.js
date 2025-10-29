import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TRACKS, useTimelineStore } from './timelineStore';

const resetTimelineStore = () => {
  useTimelineStore.setState({
    tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
    clips: [],
    transitions: [],
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
    const clipA = { id: 'clip-trim', start: 0, end: 6, duration: 6 };
    const clipB = { id: 'clip-next', start: 6, end: 10, duration: 4 };
    getState().addClip(clipA);
    getState().addClip(clipB);

    getState().trimClip('clip-trim', 2, 4);
    const clips = getState().clips;
    const updated = clips.find((c) => c.id === 'clip-trim');
    const shifted = clips.find((c) => c.id === 'clip-next');

    expect(updated).toBeDefined();
    expect(updated?.start).toBeCloseTo(0);
    expect(updated?.end).toBeCloseTo(2);
    expect(updated?.duration).toBeCloseTo(2);
    expect(updated?.sourceIn).toBeCloseTo(2);
    expect(updated?.sourceOut).toBeCloseTo(4);
    expect(shifted?.start).toBeCloseTo(2);
    expect(shifted?.end).toBeCloseTo(6);
  });

  it('moves clips between tracks when requested', () => {
    const clip = { id: 'clip-track', start: 0, duration: 4 };
    getState().addClip(clip);
    const secondVideoTrack = DEFAULT_TRACKS.find(
      (track) => track.type === 'video' && track.id !== DEFAULT_TRACKS[0].id
    )?.id;

    expect(secondVideoTrack).toBeTruthy();

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
    const trackId = DEFAULT_TRACKS.find((track) => track.type === 'audio')?.id;
    expect(trackId).toBeTruthy();
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

  it('collapses gaps after removing clips on the same track', () => {
    const clipA = { id: 'clip-a', start: 0, end: 4, duration: 4 };
    const clipB = { id: 'clip-b', start: 4, end: 8, duration: 4 };
    getState().addClip(clipA);
    getState().addClip(clipB);

    getState().removeClip('clip-a');

    const remaining = getState().clips.find((c) => c.id === 'clip-b');
    expect(remaining?.start).toBeCloseTo(0);
    expect(remaining?.end).toBeCloseTo(4);
  });

  it('normalizes clip volume and keeps waveform metadata', () => {
    const waveform = { peaks: [0, 0], samples: 1 };
    const clip = { id: 'clip-audio', start: 0, duration: 2, volume: 250, waveform };
    getState().addClip(clip);

    const stored = getState().clips.find((c) => c.id === 'clip-audio');
    expect(stored?.volume).toBe(200);
    expect(stored?.waveform).toEqual(waveform);
  });

  it('ripples subsequent clips when a clip is removed', () => {
    const first = { id: 'clip-one', start: 0, end: 2, duration: 2 };
    const second = { id: 'clip-two', start: 2, end: 5, duration: 3 };
    getState().addClip(first);
    getState().addClip(second);

    getState().removeClip('clip-one');
    const updated = getState().clips.find((c) => c.id === 'clip-two');

    expect(updated?.start).toBe(0);
    expect(updated?.end).toBe(3);
  });

  it('ripples timeline when trimming the end of a clip', () => {
    const first = { id: 'clip-a', start: 0, end: 4, duration: 4 };
    const second = { id: 'clip-b', start: 4, end: 6, duration: 2 };
    getState().addClip(first);
    getState().addClip(second);

    getState().trimClip('clip-a', 0, 2);
    const shorter = getState().clips.find((c) => c.id === 'clip-a');
    const shifted = getState().clips.find((c) => c.id === 'clip-b');

    expect(shorter?.end).toBe(2);
    expect(shifted?.start).toBe(2);
    expect(shifted?.end).toBe(4);
  });

  it('pushes downstream clips when a trim extends the timeline', () => {
    const first = { id: 'clip-ext', start: 0, end: 2, duration: 2 };
    const second = { id: 'clip-follow', start: 2, end: 4, duration: 2 };
    getState().addClip(first);
    getState().addClip(second);

    getState().trimClip('clip-ext', 0, 3);
    const extended = getState().clips.find((c) => c.id === 'clip-ext');
    const pushed = getState().clips.find((c) => c.id === 'clip-follow');

    expect(extended?.end).toBe(3);
    expect(pushed?.start).toBe(3);
    expect(pushed?.end).toBe(5);
  });

  it('supports overlay clips with text metadata on overlay tracks', () => {
    const overlayTrack = DEFAULT_TRACKS.find((track) => track.type === 'overlay');
    expect(overlayTrack).toBeTruthy();

    const clip = {
      id: 'clip-overlay',
      start: 4,
      end: 10,
      mediaType: 'overlay',
      overlayKind: 'text',
      textOverlay: {
        text: 'Hello World',
        style: { color: '#ffffff', fontSize: 48 },
        position: { xPercent: 0.5, yPercent: 0.75 },
      },
      overlayTransform: {
        position: 'center',
        size: 0.35,
        borderRadius: 12,
      },
    };

    getState().addClip(clip);
    const stored = getState().clips.find((c) => c.id === 'clip-overlay');
    expect(stored).toBeDefined();
    expect(stored?.trackId).toBe(overlayTrack?.id);
    expect(stored?.mediaType).toBe('overlay');
    expect(stored?.overlayKind).toBe('text');
    expect(stored?.textOverlay?.text).toBe('Hello World');

    getState().updateClip('clip-overlay', {
      textOverlay: {
        text: 'Updated',
        style: { color: '#ff00ff' },
      },
    });

    const updated = getState().clips.find((c) => c.id === 'clip-overlay');
    expect(updated?.textOverlay?.text).toBe('Updated');
    expect(updated?.textOverlay?.style?.color).toBe('#ff00ff');
    expect(updated?.textOverlay?.style?.fontSize).toBe(48);
  });
});
