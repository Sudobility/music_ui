# music_ui (@sudobility/music_ui)

Shared functional UI for ScoreSmith's **web** app (`music_app`). It is the web
mirror of `@sudobility/music_ui_rn`: the two expose the same functional screens
(toolbar, transport, inspector, score view, keyboard, spatial, print,
generation, snapshots, mixer, notation icons, controls, the editor `AppLayout`)
and differ only in how each platform handles navigation and in the extra
content pages the web keeps. Lifting these screens out of the apps turns a UI
change into a version bump instead of a cross-repo merge, and keeps web and
native in visual parity through the shared `@sudobility/design` Swiss theme.

## The rule that shapes everything

**This package is UI only, and routing is not UI.** Everything that reasons
about the *drawn score and its editing surface* lives here. Everything that
reasons about *moving between pages* stays in `music_app`: `react-router`, the
page layout, the master/detail page container, deep linking, the content pages.
Screen-level components here take an injected navigation interface (`onNavigate`
and the like) and route params as props; they never import the router or call
`useNavigate`.

Two more boundaries:

- **No app context.** The per-document store is passed in as a prop; the library
  imports no app provider.
- **No strings.** Locales stay in `music_app` (the family rule: a library holds
  no idea of English). Components call `useTranslation()` against the host's
  `i18next`; the package ships no `resources`.

## Theme

Visual parity with the native apps and with `@sudobility/components` comes from
`@sudobility/design`'s `swissTheme`. On web there is **no notation-ink seam** —
unlike React Native, the web resolves light/dark through CSS (`darkMode:
'class'`) and `currentColor`, so an SVG glyph inherits its colour from the
cascade and needs no per-glyph hex. That is the one web/native asymmetry in the
icons.

## Consuming it

- **Packaging mirrors `@sudobility/components`:** `type: module`, `main`/`module`
  → `dist/index.js`, `types` → `dist/index.d.ts`. The library ships `src/` and
  `dist/`; on web the app resolves `dist`.
- **Tailwind content glob (silent-failure trap):** `music_app` must list
  `./node_modules/@sudobility/music_ui/{src,dist}/**/*.{js,jsx,ts,tsx}` in its
  `tailwind.config.js` `content`, exactly as `@sudobility/components` is listed,
  or the library's `className` utilities are never generated and components
  render unstyled.
- **Everything is a peer, nothing bundled** — see `package.json`. The vite build
  externalizes every bare import; only the package's own sources are bundled.

## Build (the gotcha that cost a cycle)

`bun run build` is `rimraf dist && tsc && vite build && fix-esm-imports`.

- **Types are emitted by `tsc`, not a vite dts plugin.** `vite-plugin-dts`
  (both `insertTypesEntry` and `rollupTypes` via api-extractor) produced an
  **empty `export {}`** entry for this re-export barrel. `tsc` with
  `emitDeclarationOnly` emits a real `dist/index.d.ts` that re-exports the tree,
  and `scripts/fix-esm-imports.mjs` rewrites its extensionless specifiers to
  Node-resolvable `.js`. (`ajv` stays a devDep only because api-extractor,
  pulled in transitively, needs it; it is not otherwise used.)
- **`vite build` must not empty the out dir.** `build.emptyOutDir: false` — vite
  empties `dist` by default, which would wipe the declarations `tsc` just
  emitted. `tsc` runs first (dts), then vite adds the bundled `index.js`.
- `typecheck` is `tsc --noEmit` (the flag overrides the emit settings).

## Dev workflow (pre-publish)

Consume from `music_app` via an **rsync overlay**, mirroring the family rule:
after `bun run build` here,
`rm -rf music_app/node_modules/@sudobility/music_ui && rsync -a --exclude
node_modules --exclude .git --exclude .github ./
music_app/node_modules/@sudobility/music_ui/`. The package need not be in
`music_app`'s `package.json` for Node/vite/tsc to resolve the overlaid
directory. Once published, `music_app` takes a `^0.0.x` registry dep and the
overlay sits on top. Re-overlay after any `bun install` in `music_app`.

## Migration mechanics (the rules that keep it green)

- **Library src uses RELATIVE imports, never `@/`.** The `@/` alias means
  `music_app`'s own `src` under its vite/tsc, so an `@/foo` that moved into the
  library would resolve to the app. The vite `@` alias is a build-time safety
  net only; convert intra-library imports to relative as files move.
- **Barrel self-imports:** when a file moves in, rewrite any
  `from '@sudobility/music_ui'` left over from an app-side repoint to the
  relative intra-library path.
- **Tests:** a co-located source/logic test (e.g. `notation-icon-art.test.ts`,
  which renders the authoring icons with `react-dom/server` and holds them
  against `NOTATION_ICONS`) moves with its subject and runs here (vitest). A
  test that needs the app's render harness or router stays in `music_app`,
  repointed to the barrel.
- **App guardrails** (`__architecture.test.ts`, `__single-source.test.ts`,
  `__design-tokens.test.ts`) may list moved files; remove each stale entry as
  its file leaves.

## Business symbols: the explicit-named facade (`src/app-library.ts`)

Moved components imported business symbols from the app's `@/app-library`
facade. Here that is `src/app-library.ts` — but with **explicit named
re-exports per package, never `export *`**. vite externalizes the @sudobility
packages, and with `export *` from several externals it cannot tell which one
owns a re-exported name: it attributes every symbol to the *first* package and
emits a wrong import (`selectVisibleTrackIds` resolved to `music_lib` and came
back `undefined`, so `store(undefined)` returned the whole state →
"not iterable"). Naming each symbol's package makes the emitted imports
correct. A moved file keeps `from '../../app-library'` (relative); add each new
symbol to the right group in the facade as more files move in. The store itself
(`EditorStoreApi`, `createAppStore`, `useAppStore`, `createDocumentStore`,
`StoreContext`, `bindPlayer`, persistence) is in `@sudobility/music_lib` — see
[[music-lib-shared-store]].

## CSS in the library

A component's `import './x.css'` is extracted by vite into `dist/music_ui.css`
(the import is stripped from the JS). So: (1) `src/css.d.ts` declares
`*.css`/`*.scss` for tsc; (2) `package.json` exports `./style.css` →
`./dist/music_ui.css`; (3) the app loads it once — `music_app/src/main.tsx` has
`import '@sudobility/music_ui/style.css'`.

## Tests and the bundling boundary

A test that mocks one library module to drive another (e.g. stubbing
`PrintSystem` to watch `PrintView`'s spinner) **must live here, not in the app**:
once the library is bundled, `PrintView`'s `import './PrintSystem'` is inlined
and the app can no longer intercept it at the package boundary. In the library's
own vitest the two are separate source modules, so `vi.mock('./PrintSystem')`
works — with the stubbed-ref held via `vi.hoisted(() => …)`. And a library test
**asserts i18n by key** (`'print.preparing'`), never by English: the library
ships no strings, so `t(key)` returns the key.

## Extraction status

Populated incrementally per the plan (`~/.claude/plans/glimmering-imagining-pizza.md`).
Done, verified green (music_app typecheck + vitest + music_ui vitest):
1. **notation icons** (`src/components/icons/notation-icons.tsx` + art test).
2. **controls** (`src/components/controls/*`).
3. **tracks mixer** (`src/features/tracks/mixer-controls.tsx` + render test).
4. **`usePendingAction`** (`src/hooks/usePendingAction.ts`).
5. **snapshots** (`src/features/snapshots/*`).
6. **print** (`src/features/print/*` + `print.css` + the pending-spinner test).
7. **instruments** (`src/features/instruments/*`).
8. **dialogs** (`src/components/dialogs/*` — Confirm/Choice/FileImport/ExportScope).
9. **inspector** (`src/components/inspector/*` — sub-fields + `InspectorPanel`).
10. **generation** (`src/features/generation/*` — GenerationChoices,
    StyleSelectItems, ReplaceMusicDialog, ProjectOriginPanel). The auth seam:
    `ProjectOriginPanel` takes its `MusicHookContext` as a prop (`hookContext`),
    never `@/app/AuthContext` — the host (AppLayout) supplies it.
11. **transport** (`src/features/transport/*` — `TransportBar`,
    `AudioOutputSelect`) + **`src/hooks/usePlayback.ts`** (the `PlaybackBus`
    React bindings). The playback seam: `TransportBar`'s `controller` is a
    required injected prop (no app-wide-singleton default); the app passes its
    `playbackController`, the published page its own `PlayerBinding` + bus. The
    `usePlayback` hooks default their `bus` to the **registered player's own
    bus** (`getMusicPlayerIfInitialized()?.bus`, the directive: UI may read the
    player directly), and rest at empty when no player is registered rather than
    throwing. `TransportController` is a structural type here, not
    `Pick<PlaybackAdapter>` (that class stays app-side).

12. **piano-keyboard** (`src/features/piano-keyboard/PianoKeyboardView.tsx`).
    Theme seam: `useResolvedColorScheme` moved into the library (see **Theme**
    below). Player: auditions via `getMusicPlayerIfInitialized()` directly
    (noteOn/noteOff) and the live-player bus. MIDI input is an injected
    `midiInput?: MidiInput` prop (the app passes `getAppServices().io.midiInput`).
13. **spatial** (`src/features/spatial/SpatialSection.tsx`). `@sudobility/music_spatial`
    is a peer now; `bus` defaults to the live player's.
14. **score-editor** — the leaf components, the toolbar, and the hub:
    `GoToBarDialog`, `InsertBarsDialog`, `LyricEntryBar`, `ScoreContextMenu`,
    `useEditorShortcuts` (its `controller` is a required injected prop, a
    structural `PlaybackToggle`), `EditorToolbar` (the voice-record control is
    injected as a `renderVoiceRecord` render-prop, since recording is the
    browser's `MediaRecorder` + the app's transcription service), and
    **`ScoreEditorView`** — the DOM-canvas hub. Its six app/DOM seams are
    injected: `createSurface` + `scheduler` (the browser `ScoreCanvasSurface`,
    `web-canvas-surface.ts` stays app-side), `autoscrollDelta`, `libraryCopy`,
    the `controller`, and `renderVoiceRecord`. `app/theme.ts` re-exports the
    theme hook; `web-canvas-surface.ts`/`autoscroll.ts`/`microphone-mp3.ts`/
    `transcribe-recording.ts`/`VoiceRecordButton.tsx` stay app-side.
15. **dialogs** — `GenerateTrackDialog`, `TrackerFitDialog` (facade-only), and
    the import/help dialogs `MidiImportWizard` / `MusicXmlImportDialog`
    (platform IO + error reporting injected: `midiService`/`musicXmlService`/
    `onError`) and `ShortcutHelpDialog` (`lang` injected). The app keeps thin
    wrappers at the same paths that supply those from `getAppServices().io` /
    `reportError` / `useCurrentLanguage`. `DeveloperSettingsDialog` stays
    app-side (its perf benchmark + diagnostics export are app tooling).
16. **layout + the editor shell** — `Toasts`, `GenerationStatusStrip`,
    `app-bar-menu`, the `useProjectGeneration` wiring (over music_client, with
    `client`/`getToken`/`live`/`onStartError` injected), and **`AppLayout`**
    itself. AppLayout is the composition hub: it takes every app concern
    injected — `lang`, `hookContext`, `controller`, `io`, `renderAudio`,
    `libraryCopy`, `reportError`, the generation client/token/live/start-error,
    `midiService`/`musicXmlService`/`onImportError`, a `renderScoreEditor`
    render-prop (the app's DOM-wired `ScoreEditorView`), a `creditBadge` slot
    (consumables + router stay app-side), and a `renderDeveloperSettings` slot.
    The app keeps a thin `AppLayout` wrapper (`music_app/src/components/layout/
    AppLayout.tsx`) that supplies all of this; `router.tsx` and the tests keep
    the same `{ store?, onNavigate? }` surface. Generation state is controlled
    in tests by mocking `@sudobility/music_client`'s `useProjectGeneration` (the
    music_client boundary the lib hook wraps), since the lib hook is bundled.

**The entire web editor UI — every panel, bar, dialog, the canvas view, the
keyboard, spatial, the toolbar, the inspector, generation, transport, the
playback/theme hooks, and the `AppLayout` shell — now lives in `music_ui`.**
What stays in `music_app` is composition and app-shell only: `App.tsx`,
`router.tsx`, `config/*`, `auth/*`, the DOM canvas surface + autoscroll +
recording + transcription, `CreditBadge`, `DeveloperSettingsDialog`, the
content pages, and thin wrappers (`ScoreEditorView`, `AppLayout`, the import/
help dialogs) that inject the app concerns into the shared components.

### Theme (the one web theme seam the library owns)

`src/theme/color-scheme.ts` holds `useResolvedColorScheme`, `resolveColorScheme`,
`getSystemColorScheme`, `prefersReducedMotion` (the `prefers-color-scheme` query
+ the `resolveThemeMode` rule). `music_app`'s `src/app/theme.ts` re-exports these
from the barrel and keeps only `applyDocumentTheme` (it owns `<html>`). The
notation canvas and piano keyboard need literal colours (VexFlow never reads
CSS), which is why this hook exists despite web's CSS `dark` class.

### Stays in music_app (composition & app-shell)

App/DOM-bound modules that **stay** (several in `__architecture.test.ts`'s
ALLOWED_NON_UI): `web-canvas-surface.ts`, `autoscroll.ts`, `microphone-mp3.ts`,
`transcribe-recording.ts`, `VoiceRecordButton.tsx`; `config/*` (initialize,
web-player, theme application), `auth/*`, `i18n/*` (the locale strings),
`App.tsx`, `router.tsx`, `CreditBadge` (consumables + router),
`DeveloperSettingsDialog` (perf benchmark + diagnostics), and the content pages
(Home, Resources, docs, community, credits, dashboard, legal). Thin **wrappers**
at the shared components' old paths inject the app concerns: `ScoreEditorView`,
`AppLayout`, and the `MidiImportWizard`/`MusicXmlImportDialog`/`ShortcutHelpDialog`
import/help dialogs.

The native mirror `music_ui_rn` (plan Phases 0–4) is a separate repo/track, not
yet begun.

## Related projects

`music_types` · `music_editing` · `music_drawing` · `music_player` · `music_lib`
· `music_client` · `@sudobility/components` · `@sudobility/design` ·
`music_ui_rn` (native) · `music_app` (web shell) · `music_app_rn`
