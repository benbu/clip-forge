import { beforeEach, describe, expect, it } from 'vitest';
import { useTimelineStore } from './timelineStore';

const resetTimelineStore = () => {
  useTimelineStore.setState({
    clips: [],
    playheadPosition: 0,
    zoom: 1,
    snapToGrid: true,
    selectedClipId: null,
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
});
