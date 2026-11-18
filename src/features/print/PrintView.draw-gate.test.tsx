/**
 * The companion to `PrintView.pending.test.tsx`: that one mocks `PrintSystem`
 * to hold the draw gate open on purpose, which is exactly why it could never
 * catch a gate that fails to *close* on its own. This one mounts the real
 * `PrintSystem`, whose draw effect reports every system on mount, and pins the
 * invariant that bug broke: once the systems have drawn, the button is Print.
 *
 * The regression: the gate was reset from a parent effect, which React runs
 * *after* the child `PrintSystem` effects — so the reset wiped the very draws
 * that had just happened and the button spun forever. (jsdom returns no 2D
 * context, so nothing is actually painted, but `PrintSystem` still reports
 * itself drawn — which is all the gate counts.)
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createAppStore, stressScore } from '@sudobility/music_lib';
import { initializeMusicPlayer, resetMusicPlayer } from '@sudobility/music_player/core';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';
import { PrintView } from './PrintView';

describe('PrintView: the draw gate opens once the real systems have drawn', () => {
  beforeEach(() => initializeMusicPlayer(new MockMusicPlayer()));
  afterEach(() => {
    cleanup();
    resetMusicPlayer();
  });

  it('ends on Print, not on the preparing spinner', async () => {
    const store = createAppStore({ context: {} });
    store.getState().setScore(stressScore(2, 40));
    render(<PrintView store={store} onBack={() => {}} />);

    const print = await screen.findByRole('button', { name: 'print.action' });
    expect(print).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'print.preparing' })).toBeNull();
  });
});
