/**
 * The playback hooks render when what they show changes, not when the engine
 * reports.
 *
 * The library reads the registered player's bus (no app-wide singleton), so the
 * test installs a `MockMusicPlayer` and publishes into its real bus exactly as
 * the engine would.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  getMusicPlayerIfInitialized,
  initializeMusicPlayer,
  resetMusicPlayer,
} from '@sudobility/music_player/core';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';
import { usePlaybackReadout } from './usePlayback';

beforeEach(() => initializeMusicPlayer(new MockMusicPlayer()));
afterEach(() => resetMusicPlayer());

describe('usePlaybackReadout', () => {
  it('renders once per change of text, however many reports arrive', () => {
    const bus = getMusicPlayerIfInitialized()!.bus;
    const beat = (tick: number) => String(Math.floor(tick / 480) + 1);
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return usePlaybackReadout(beat);
    });
    const settled = renders;

    // Thirty reports inside one beat, as the engine sends in a second.
    act(() => {
      for (let tick = 0; tick < 480; tick += 16) bus.publishPosition(tick);
    });
    expect(renders).toBe(settled);
    expect(result.current).toBe('1');

    act(() => bus.publishPosition(480));
    expect(renders).toBe(settled + 1);
    expect(result.current).toBe('2');
  });
});
