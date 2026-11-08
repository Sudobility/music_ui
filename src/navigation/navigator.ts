/**
 * The shared navigation contract, owned by the UI library (web).
 *
 * The `Navigator` context lives here so the shared UI navigates by route name —
 * `useNavigator().go('projects')` — without importing react-router. The app
 * supplies the concrete `Navigator` (its react-router adapter over the current
 * `/:lang`) and mounts `NavigatorProvider`. Typed over music_lib's shared
 * `MusicRoutes`; app-only routes (the web's content pages) are navigated by the
 * app's own router, not through this contract.
 */
import { createNavigatorContext } from '@sudobility/routing/react';
import type { MusicRoutes } from '@sudobility/music_lib';

const ctx = createNavigatorContext<MusicRoutes>();

export const NavigatorProvider = ctx.NavigatorProvider;
export const useNavigator = ctx.useNavigator;
