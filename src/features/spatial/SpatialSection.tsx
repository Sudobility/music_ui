/**
 * The Spatial 3D view over a store's score — the editor's, or a published
 * page's own.
 *
 * Isolated as its own subscriber for the same reason every per-tick readout
 * in `AppLayout` is: `useSoundingTrackIds` updates on every note of every
 * track, and reading it at the editor's own top level would re-render the
 * whole editor — the inspector, the app bar, every dialog — on every note-on
 * and note-off while playing. Here it touches only the Spatial view itself.
 *
 * `bus` is the player's, for the sounding notes. The editor leaves it to the
 * default — the registered player's own bus (`useSoundingTrackIds` reads it
 * directly) — and a published page passes its own player's bus explicitly, so
 * the view follows *that* page's playback rather than the app-wide player a
 * signed-out visitor never started (see `PublishedView`).
 *
 * `score` is asserted non-null by the caller — `SpatialView` has no
 * empty-score affordance of its own.
 */
import { SpatialView } from '@sudobility/music_spatial';
import type { PlaybackBus } from '@sudobility/music_types';
import type { EditorStoreApi } from '../../app-library';
import { controlLocked, selectEditLocked } from '../../app-library';
import { useSoundingTrackIds } from '../../hooks';

export function SpatialSection({ store, bus }: { store: EditorStoreApi; bus?: PlaybackBus }) {
  const score = store((s) => s.score);
  const locked = store((s) => selectEditLocked(s) && controlLocked(s, 'unpluggedArrangement'));
  const soundingTrackIds = useSoundingTrackIds(bus);

  if (!score) return null;
  return (
    <SpatialView
      score={score}
      soundingTrackIds={soundingTrackIds}
      locked={locked}
      onMoveListener={(patch) => store.getState().setUnpluggedListener(patch)}
      onMoveTrack={(trackId, point) => store.getState().setUnpluggedTrackPosition(trackId, point)}
      onResetArrangement={() => store.getState().resetUnpluggedArrangement()}
      // The active track follows whatever the listener is facing: the
      // inspector, the keyboard and the notation highlight then all show
      // the part being looked at. Turning away from everything keeps the
      // last one rather than clearing it — an inspector with nothing in it
      // is not a better answer than the last instrument looked at.
      onFacingTrackChange={(trackId) => {
        if (trackId) store.getState().setActiveTrack(trackId);
      }}
      className="h-full w-full"
    />
  );
}
