/**
 * Print waits for the pages: until every system has been drawn the button is
 * a spinner and pressing it prints nothing. `PrintSystem` is replaced here so
 * the test decides when each system reports itself drawn — the real one draws
 * inside the same commit, which leaves no moment to look at in between.
 *
 * This lives in the library (not the app) because `PrintView` and `PrintSystem`
 * are now sibling modules here: mocking `./PrintSystem` only works where it is
 * a module boundary, which the app no longer sees once the library is bundled.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createAppStore, stressScore } from '@sudobility/music_lib';
import { initializeMusicPlayer, resetMusicPlayer } from '@sudobility/music_player/core';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';

const drawnCallbacks = vi.hoisted(() => new Map<number, () => void>());

vi.mock('./PrintSystem', () => ({
  PrintSystem: ({
    slice,
    onDrawn,
  }: {
    slice: { systemIndex: number };
    onDrawn?: (systemIndex: number) => void;
  }) => {
    drawnCallbacks.set(slice.systemIndex, () => onDrawn?.(slice.systemIndex));
    return <div data-testid={`print-system-${slice.systemIndex}`} />;
  },
}));

const { PrintView } = await import('./PrintView');

describe('PrintView: the Print button waits for the pages', () => {
  beforeEach(() => {
    // music_lib's player adapter resolves from a singleton on first use and
    // throws otherwise; register a mock before anything can reach playback.
    initializeMusicPlayer(new MockMusicPlayer());
    drawnCallbacks.clear();
  });
  afterEach(() => {
    cleanup();
    resetMusicPlayer();
  });

  it('spins until every system is drawn, and prints nothing before then', () => {
    const store = createAppStore({ context: {} });
    store.getState().setScore(stressScore(2, 40));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PrintView store={store} onBack={() => {}} />);

    const preparing = screen.getByRole('button', { name: 'print.preparing' });
    expect(preparing).toBeDisabled();
    expect(preparing).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(preparing);
    expect(print).not.toHaveBeenCalled();

    const callbacks = [...drawnCallbacks.values()];
    expect(callbacks.length).toBeGreaterThan(1);
    act(() => callbacks.slice(0, -1).forEach((drawn) => drawn()));
    expect(screen.getByRole('button', { name: 'print.preparing' })).toBeDisabled();

    act(() => callbacks.at(-1)!());
    const ready = screen.getByRole('button', { name: 'print.action' });
    expect(ready).toBeEnabled();
    fireEvent.click(ready);
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
