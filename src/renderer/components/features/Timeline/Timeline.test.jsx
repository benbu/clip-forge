import React from 'react';
import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';
import { DEFAULT_TRACKS, useTimelineStore } from '@/store/timelineStore';
import { usePlayerStore } from '@/store/playerStore';
import { useMediaStore } from '@/store/mediaStore';

const resetStores = () => {
  useTimelineStore.setState({
    tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
    clips: [],
    playheadPosition: 0,
    zoom: 1,
    snapToGrid: true,
    selectedClipId: null,
    isScrubbing: false,
  });

  usePlayerStore.setState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 75,
    playbackRate: 1,
    isMuted: false,
    isFullscreen: false,
    playbackSource: 'timeline',
  });

  useMediaStore.setState({
    files: [],
    selectedFile: null,
    selectedFileData: null,
    fileBlobUrls: {},
  });
};

describe('Timeline component', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders without crashing and the timeline heading is visible', () => {
    render(<Timeline />);
    expect(
      screen.getByRole('heading', { name: 'Timeline', level: 3 })
    ).toBeVisible();
  });
});
