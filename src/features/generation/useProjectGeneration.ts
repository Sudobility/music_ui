/**
 * The web editor's wiring for `useProjectGeneration`.
 *
 * The rules — poll the *project* rather than the job, compare `updatedAt`
 * strictly, reload before unlocking, slow the cadence when nothing is running —
 * live in `@sudobility/music_client`, because they are rules about this server
 * and every host obeys them. What the host supplies is what only it knows: the
 * store, the generation client, the auth token getter, the live-stream base
 * URL, and what to do when the answer is "you are out of credits"
 * (`onStartError`, which the app wires to its paywall).
 */
import { useAppStore } from '../../app-library';
import type { EditorStoreApi } from '../../app-library';
import { useProjectGeneration as useSharedProjectGeneration } from '@sudobility/music_client';
import type {
  ForegroundPort,
  GenerationClient,
  LiveGenerationFinal,
  LiveGenerationOptions,
  ProjectGeneration,
} from '@sudobility/music_client';

export type { ProjectGeneration };

/**
 * A browser tab is in the foreground when it is not hidden.
 *
 * Module-level rather than built per render: it is passed as a hook dependency,
 * and a fresh object each render would tear down and rebuild the poll timer
 * continuously.
 */
const TAB_FOREGROUND: ForegroundPort = {
  isForeground: () => !document.hidden,
  subscribe: (onForeground) => {
    const handler = (): void => {
      if (!document.hidden) onForeground();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
};

export type UseProjectGenerationOptions = {
  /** Defaults to the app-wide singleton (`useAppStore`); tests inject an isolated store. */
  store?: EditorStoreApi;
  /** The generation client, supplied by the host (the app's `getAppServices().musicClient`). */
  client: GenerationClient;
  /** The auth token getter, supplied by the host (`getAppServices().auth.getToken`). */
  getToken: () => Promise<string | null>;
  /** The live stream, or `false` to switch it off; the app passes `{ baseUrl }`. */
  live?: LiveGenerationOptions | false;
  /** What to do when `POST /jobs` is refused (the app opens its paywall). Returns true when handled. */
  onStartError: (error: unknown) => boolean;
  /** Called when the server's copy has moved on. Awaited before the editor unlocks. */
  onApplied?: () => void | Promise<void>;
  /**
   * Called with a generation's final score when the live stream delivered it.
   * Awaited before the editor unlocks; `onApplied` is then the polling
   * fallback rather than a second adoption.
   */
  onComplete?: (final: LiveGenerationFinal) => void | Promise<void>;
  pollMs?: number;
  idlePollMs?: number;
};

export function useProjectGeneration(
  projectId: string | null,
  options: UseProjectGenerationOptions,
): ProjectGeneration {
  const {
    store = useAppStore,
    client,
    getToken,
    live,
    onStartError,
    onApplied,
    onComplete,
    pollMs,
    idlePollMs,
  } = options;

  return useSharedProjectGeneration(projectId, {
    store,
    client,
    getToken,
    foreground: TAB_FOREGROUND,
    // This app's store owns the autosave, so flushing is one of its actions.
    flush: () => store.getState().saveNow(),
    onStartError,
    ...(onApplied ? { onApplied } : {}),
    ...(onComplete ? { onComplete } : {}),
    ...(live ? { live } : {}),
    ...(pollMs === undefined ? {} : { pollMs }),
    ...(idlePollMs === undefined ? {} : { idlePollMs }),
  });
}
