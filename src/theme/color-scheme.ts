/**
 * The colour scheme the UI is drawn in, and how the browser is asked for it.
 *
 * The *rule* — `system` follows the device, `light`/`dark` override it — is
 * music_lib's `resolveThemeMode`, shared with the native app. What lives here
 * is the part only a browser can do: the `prefers-color-scheme` media query.
 * Applying the answer to the document (toggling the `dark` class) stays in the
 * app's composition root, which owns `<html>`.
 *
 * This is the one web theme seam the library needs: on web, light/dark is
 * otherwise resolved through CSS (`darkMode: 'class'`) and `currentColor`, so a
 * glyph needs no literal hex. But the notation canvas and the piano keyboard
 * paint literal colours from a render theme — VexFlow never reads CSS — so a
 * surface that resolved the scheme from `themeMode` alone would keep drawing in
 * the old one, because in system mode `themeMode` does not change when the OS
 * does. Every surface reading this follows the flip.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { resolveThemeMode } from '../app-library';
import type { ThemeMode } from '../app-library';

/** User-facing colour scheme preference: the store's `themeMode`. */
export type ColorSchemeMode = ThemeMode;

/** A concrete (non-`system`) color scheme, as applied to the document. */
export type ResolvedColorScheme = Exclude<ThemeMode, 'system'>;

const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

function prefersDarkQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(PREFERS_DARK_QUERY);
}

/** Reads the OS/browser color-scheme preference. Defaults to light when unavailable (e.g. SSR/tests). */
export function getSystemColorScheme(): ResolvedColorScheme {
  return prefersDarkQuery()?.matches ? 'dark' : 'light';
}

/**
 * Resolves a user preference (which may defer to the system) into a concrete
 * `light`/`dark` scheme, **once**. Anything rendered from the answer should use
 * `useResolvedColorScheme` instead, or it will not follow the OS.
 */
export function resolveColorScheme(mode: ColorSchemeMode): ResolvedColorScheme {
  return resolveThemeMode(mode, getSystemColorScheme() === 'dark');
}

/**
 * The scheme to draw in, re-rendering when the OS flips while in `system` mode.
 *
 * `useSyncExternalStore` because the media query *is* an external store, and
 * subscribing through it cannot tear between two readers mid-render.
 */
export function useResolvedColorScheme(mode: ColorSchemeMode): ResolvedColorScheme {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = mode === 'system' ? prefersDarkQuery() : null;
      if (!media) return () => undefined;
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [mode],
  );
  const get = (): ResolvedColorScheme => resolveColorScheme(mode);
  return useSyncExternalStore(subscribe, get, get);
}

const PREFERS_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the user's OS/browser prefers reduced motion. Guarded for
 * SSR/tests/older browsers, where `matchMedia` doesn't exist (or throws on an
 * unrecognized query, which some older browsers do). The editor's
 * scroll-into-view-during-playback effect reads it to pick `'auto'` vs
 * `'smooth'` scroll behaviour.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(PREFERS_REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}
