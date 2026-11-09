# @sudobility/music_ui

Shared functional UI for ScoreSmith / Moosiac's **web** app (`music_app`). It
holds the editor shell (`AppLayout`), editing/transport bars, inspector, score
view, piano keyboard, spatial stage, print, generation, snapshots, mixer,
notation icons and the shared controls — the screens the React Native apps
mirror.

It is the web mirror of `@sudobility/music_ui_rn`: the two expose the same
functional screens and differ only in how each platform handles navigation and
in the extra content pages the web keeps.

**Routing stays in the app shell.** `react-router`, the page layout, the
master/detail page container and deep linking are app concerns; the library's
screen-level components take an injected navigation interface and route params
as props. The per-document store is passed in — the library imports no app
context. Strings/locales also stay in `music_app` (components call
`useTranslation()` against the host's `i18next`; no `resources` ship here).

**Web-only content pages stay in `music_app`** (Home, Resources, docs content,
community, credits, dashboard, legal). Visual parity with the native apps comes
from the shared `@sudobility/design` Swiss theme and `@sudobility/components`.

This is a **library**, not an app — it has no dev server or standalone run
target. It builds to `dist/` and is published (restricted) to GitHub Packages as
`@sudobility/music_ui`.

## Requirements

- **Node** >= 18 and **[bun](https://bun.sh)** (the scripts and lockfile use bun).
- The `@sudobility` scope resolves to **GitHub Packages** (see `.npmrc`), so
  `bun install` needs a GitHub token with `read:packages` on your environment
  (e.g. in `~/.npmrc`) to pull the `@sudobility/*` peers.

## Install

```bash
bun install
```

Everything is a **peer dependency** — nothing is bundled. The consuming
`music_app` provides React, the `@sudobility` family, the design system and every
ecosystem peer.

## Commands

| Command | What it does |
| --- | --- |
| `bun run build` | `rimraf dist` → `tsc` (emits `.d.ts`) → `vite build` (emits `index.js`) → `scripts/fix-esm-imports.mjs` |
| `bun run dev` | `vite build --watch` (rebuild on change; there is no dev server) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint src` |
| `bun run format` / `format:check` | Prettier write / check over `src` |
| `bun run test:unit` | `vitest run` (jsdom) |
| `bun run test:watch` | `vitest` in watch mode |
| `bun run clean` | remove `dist` |
| `bun run verify` | `format:check` → `typecheck` → `lint` → `test:unit` → `build` (run before pushing) |

## Consuming it

`music_app` adds the library to its Tailwind `content` so its utility classes
are generated (otherwise components render unstyled):

```
./node_modules/@sudobility/music_ui/{src,dist}/**/*.{js,jsx,ts,tsx}
```

The extracted stylesheet is imported once from the app via the
`@sudobility/music_ui/style.css` export.

### Pre-publish dev overlay

Before a version is published, consume local changes in `music_app` via an rsync
overlay: after `bun run build`,

```bash
rm -rf music_app/node_modules/@sudobility/music_ui
rsync -a --exclude node_modules --exclude .git ./ music_app/node_modules/@sudobility/music_ui/
```

Re-run the overlay after any `bun install` in `music_app`.

## Layout

- `src/components/` — `controls/`, `dialogs/`, `icons/` (notation icons), `inspector/`, `layout/` (`AppLayout` shell, Toasts, app-bar menu)
- `src/features/` — `generation/`, `instruments/`, `piano-keyboard/`, `print/`, `score-editor/`, `snapshots/`, `spatial/`, `tracks/` (mixer), `transport/`
- `src/hooks/` — `usePendingAction`, `usePlayback`
- `src/navigation/navigator.ts` · `src/theme/color-scheme.ts` · `src/app-library.ts` (business-symbol facade) · `src/index.ts` (barrel)

Per-screen behavior and rationale live in each file's own header — read it before
changing. See `CLAUDE.md` for cross-cutting architecture rules and build gotchas.

## License

BUSL-1.1 · © Sudobility
