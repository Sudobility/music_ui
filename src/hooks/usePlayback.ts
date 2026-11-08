/**
 * React bindings for `PlaybackBus`.
 *
 * Position and sounding notes are not in the store (see music_player's
 * `shared/bus.ts`), so this is how a component reads them. Each hook subscribes
 * to one channel, which is the point: a readout that wants the playhead must
 * not re-render when a note starts, and the piano keyboard must not re-render
 * thirty times a second.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: it is the API
 * built for exactly this, and it keeps the value consistent across a
 * concurrent render rather than tearing between two subscribers.
 *
 * **Still isolate these.** Putting `usePlaybackPosition()` at a large
 * component's top level costs that whole subtree a render per engine report,
 * exactly as `store((s) => s.positionTick)` used to. The difference is that it
 * is now a deliberate act rather than an ordinary-looking one.
 *
 * The library reads the player directly (the host's directive: the player is
 * not business logic, so UI may reach it). `bus` defaults to the registered
 * player's own bus — or is passed explicitly by a host with its own player and
 * binding (the published-snapshot page). Before any player is registered the
 * bus is `undefined`, and every hook here rests at its empty value rather than
 * throwing, so a component renders either way.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getMusicPlayerIfInitialized } from '@sudobility/music_player/core';
import type { PlaybackBus } from '@sudobility/music_types';
import { playingPitchesForTrack, samePitchSet } from '../app-library';

/** The registered player's bus, or `undefined` before one is registered. */
function liveBus(): PlaybackBus | undefined {
  return getMusicPlayerIfInitialized()?.bus ?? undefined;
}

const NO_OP = (): void => {};

/**
 * The playhead, as the engine last reported it. ~30Hz while playing, silent
 * otherwise. `0` while no player is registered.
 */
export function usePlaybackPosition(bus: PlaybackBus | undefined = liveBus()): number {
  const subscribe = useCallback(
    (onChange: () => void) => (bus ? bus.onPosition(onChange) : NO_OP),
    [bus],
  );
  const get = useCallback(() => bus?.positionTick ?? 0, [bus]);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * Text derived from the playhead, re-rendering only when the text changes.
 *
 * Position reports arrive thirty times a second, and a readout shows far less
 * than that: a bar and beat changes a few times a second and a timecode ten.
 * `useSyncExternalStore` compares snapshots, so handing it the *formatted* text
 * rather than the tick lets React skip every report that would print the same
 * thing. `format` is read at render, so a new score or tempo applies at once.
 */
export function usePlaybackReadout(
  format: (tick: number) => string,
  bus: PlaybackBus | undefined = liveBus(),
): string {
  const subscribe = useCallback(
    (onChange: () => void) => (bus ? bus.onPosition(onChange) : NO_OP),
    [bus],
  );
  const get = () => format(bus?.positionTick ?? 0);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * The keys the active track is sounding, kept as the same set until one of
 * them changes.
 *
 * The bus reports on every note of every track, and a keyboard shows one: read
 * as the raw sounding notes, the whole row of keys re-rendered for notes it
 * does not show — on a dense multi-track score, most of them. `samePitchSet`
 * decides whether anything this keyboard draws moved.
 *
 * The notes arrive with their track and pitch already resolved by the
 * scheduler, so this is a filter rather than a search of the score.
 */
export function usePlayingPitches(
  activeTrackId: string | null,
  bus: PlaybackBus | undefined = liveBus(),
): ReadonlySet<number> {
  const subscribe = useCallback(
    (onChange: () => void) => (bus ? bus.onSounding(onChange) : NO_OP),
    [bus],
  );
  const kept = useRef<ReadonlySet<number>>(NO_PITCHES);
  const get = useCallback(() => {
    const next = playingPitchesForTrack(bus?.sounding ?? [], activeTrackId);
    if (!samePitchSet(next, kept.current)) kept.current = next;
    return kept.current;
  }, [bus, activeTrackId]);
  return useSyncExternalStore(subscribe, get, get);
}

const NO_PITCHES: ReadonlySet<number> = new Set();

function sameIdSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

const NO_TRACK_IDS: ReadonlySet<string> = new Set();

/**
 * Every track id with an active note right now — what the Spatial 3D view
 * (`@sudobility/music_spatial`) lights up. Same shape as `usePlayingPitches`,
 * collecting distinct `trackId`s across every track rather than pitches for
 * one — the Spatial view is meant to be looked at with everything visible, not
 * filtered to an active track the way the piano keyboard is.
 *
 * This package (music_spatial) never reads the player itself — this is that
 * boundary's app-side half, the "caller supplies `soundingTrackIds`" its spec
 * calls for.
 */
export function useSoundingTrackIds(bus: PlaybackBus | undefined = liveBus()): ReadonlySet<string> {
  const subscribe = useCallback(
    (onChange: () => void) => (bus ? bus.onSounding(onChange) : NO_OP),
    [bus],
  );
  const kept = useRef<ReadonlySet<string>>(NO_TRACK_IDS);
  const get = useCallback(() => {
    const sounding = bus?.sounding ?? [];
    if (sounding.length === 0) {
      if (kept.current.size !== 0) kept.current = NO_TRACK_IDS;
      return kept.current;
    }
    const next = new Set<string>();
    for (const note of sounding) next.add(note.trackId);
    if (!sameIdSet(next, kept.current)) kept.current = next;
    return kept.current;
  }, [bus]);
  return useSyncExternalStore(subscribe, get, get);
}
