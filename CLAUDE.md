# music_ui (@sudobility/music_ui)

Shared functional UI for Moosiac's **web** app (`music_app`) — the web mirror of
`@sudobility/music_ui_rn`. Both expose the same functional screens (toolbar,
transport, inspector, score view, keyboard, spatial, print, generation,
snapshots, mixer, notation icons, controls, the editor `AppLayout`) and differ
only in navigation and the extra content pages the web keeps. Lifting these out
of the apps turns a UI change into a version bump, and keeps web/native in visual
parity through the shared `@sudobility/design` Swiss theme.

Per-screen behavior and rationale live in each file's own header — read it before
changing. This file holds only the cross-cutting facts.

## The rules that shape everything

- **UI only; routing is not UI.** Everything about the *drawn score and its
  editing surface* lives here; everything about *moving between pages* stays in
  `music_app` (react-router, page layout, master/detail container, deep linking,
  content pages). Screen components take an injected navigation interface
  (`onNavigate` and the like) and route params as props — never import the router
  or call `useNavigate`.
- **No app context** — the per-document store is passed in as a prop; the library
  imports no app provider. The store itself (`EditorStoreApi`, `createDocumentStore`,
  `StoreContext`, `bindPlayer`, persistence) is in `@sudobility/music_lib`.
- **No strings** — locales stay in `music_app`. Components call `useTranslation()`
  against the host's `i18next`; the package ships no `resources`. A library test
  asserts i18n **by key** (`'print.preparing'`), never by English.
- **App/DOM concerns are injected seams, not imports.** Screen components take
  them as props/render-props (`createSurface` + `scheduler`, `controller`,
  `libraryCopy`, `midiService`/`musicXmlService`, `hookContext`, `renderVoiceRecord`,
  `creditBadge`, …). `AppLayout` is the composition hub that takes every app
  concern injected; `music_app` keeps thin wrappers that supply them.

The entire web editor UI now lives here. What stays in `music_app` is composition
and app-shell: `App.tsx`, `router.tsx`, `config/*`, `auth/*`, `i18n/*` (strings),
`web-canvas-surface.ts`/`autoscroll.ts`/recording/transcription, `CreditBadge`,
`DeveloperSettingsDialog`, the content pages, and the injecting wrappers.

## Theme

Parity comes from `@sudobility/design`'s `swissTheme`. On web there is **no
notation-ink seam** — light/dark resolves through CSS (`darkMode: 'class'`) and
`currentColor`, so an SVG glyph inherits its colour and needs no per-glyph hex
(the one web/native icon asymmetry). The one theme seam the library *does* own is
`src/theme/color-scheme.ts` (`useResolvedColorScheme`, `resolveColorScheme`,
`getSystemColorScheme`, `prefersReducedMotion`), because the notation canvas and
piano keyboard need literal colours (VexFlow never reads CSS). `music_app`'s
`src/app/theme.ts` re-exports these and keeps only `applyDocumentTheme`.

## Commands

- `bun run build` — `rimraf dist && tsc && vite build && fix-esm-imports.mjs`
- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` · `bun run format` / `format:check`
- `bun run test:unit` — vitest run · `bun run test:watch`
- `bun run verify` — format:check, typecheck, lint, test:unit, build

## Build & packaging gotchas (each cost a cycle)

- **Types are emitted by `tsc` (`emitDeclarationOnly`), not a vite dts plugin** —
  `vite-plugin-dts` produced an empty `export {}` for this re-export barrel.
  `scripts/fix-esm-imports.mjs` then rewrites extensionless specifiers to `.js`.
- **`build.emptyOutDir: false`** — vite empties `dist` by default, which would
  wipe the dts `tsc` just emitted; `tsc` runs first, then vite adds `index.js`.
- **Packaging mirrors `@sudobility/components`:** `type: module`, `main`/`module`
  → `dist/index.js`, `types` → `dist/index.d.ts`, ships `src/` + `dist/`, web
  resolves `dist`. Everything is a peer, nothing bundled (vite externalizes every
  bare import).
- **Tailwind content glob (silent-failure trap):** `music_app` must list
  `./node_modules/@sudobility/music_ui/{src,dist}/**/*.{js,jsx,ts,tsx}` in its
  `tailwind.config.js` `content`, or the library's utilities are never generated
  and components render unstyled.
- **CSS:** a component's `import './x.css'` is extracted by vite into
  `dist/music_ui.css` (import stripped from JS). `src/css.d.ts` declares `*.css`
  for tsc; `exports` maps `./style.css`; `music_app/src/main.tsx` loads it once.

## Migration / green rules

- **Library src uses RELATIVE imports, never `@/`** — `@/` means `music_app`'s own
  `src` under its vite/tsc, so an `@/foo` here would resolve to the app. Rewrite
  any leftover `from '@sudobility/music_ui'` barrel self-import to the relative path.
- **`src/app-library.ts` uses explicit named re-exports per package, never
  `export *`.** vite externalizes the `@sudobility` packages, and with `export *`
  from several externals it misattributes a re-exported name to the *first*
  package and emits a wrong import (a symbol came back `undefined`). Add each new
  symbol to the right group as files move in.
- **A test that mocks one library module to drive another must live here, not in
  the app** — once bundled, an intra-library `import` is inlined and the app can
  no longer intercept it at the package boundary.

## Dev workflow (pre-publish overlay)

Consume from `music_app` via an **rsync overlay**: after `bun run build`,
`rm -rf music_app/node_modules/@sudobility/music_ui && rsync -a --exclude
node_modules --exclude .git ./ music_app/node_modules/@sudobility/music_ui/`. The
package need not be in `music_app`'s `package.json` for resolution; once published
it takes a `^0.0.x` dep with the overlay on top. **Re-overlay after any
`bun install` in `music_app`.**

## Structure

- `src/components/` — `controls/`, `dialogs/`, `icons/` (notation icons),
  `inspector/`, `layout/` (Toasts, `AppLayout` shell, app-bar menu)
- `src/features/` — `generation/`, `instruments/`, `piano-keyboard/`, `print/`,
  `score-editor/` (leaf components + the `ScoreEditorView` DOM-canvas hub),
  `snapshots/`, `spatial/`, `tracks/` (mixer), `transport/`
- `src/hooks/` — `usePendingAction`, `usePlayback` (the `PlaybackBus` bindings)
- `src/theme/color-scheme.ts` · `src/app-library.ts` (the business-symbol facade)
  · `src/navigation` · `src/index.ts` (barrel)

## Related projects

`music_types` · `music_editing` · `music_drawing` · `music_player` · `music_lib`
· `music_client` · `@sudobility/components` · `@sudobility/design` ·
`music_ui_rn` (native) · `music_app` (web shell) · `music_app_rn`
