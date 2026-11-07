# @sudobility/music_ui

Shared functional UI for ScoreSmith / Moosiac's **web** app (`music_app`). It
holds the editor shell, editing/transport bars, inspector, score view, piano
keyboard, spatial stage, print, generation, snapshots, mixer, notation icons
and the shared controls — the screens the React Native apps mirror.

It is the web mirror of `@sudobility/music_ui_rn`: the two expose the same
functional screens and differ only in how each platform handles navigation and
in the extra content pages the web keeps.

**Routing stays in the app shell.** `react-router`, the page layout, the
master/detail page container and deep linking are app concerns; the library's
screen-level components take an injected navigation interface (`onNavigate`) and
route params as props. Likewise the per-document store is passed in — the
library imports no app context.

**Web-only content pages stay in `music_app`** (Home, Resources, docs content,
community, credits, dashboard, legal). Visual parity with the native apps comes
from the shared `@sudobility/design` Swiss theme and `@sudobility/components`.

## Consuming it

`music_app` adds the library to its Tailwind `content` so its utility classes
are generated:

```
./node_modules/@sudobility/music_ui/dist/**/*.js
```

Everything is a peer dependency — nothing is bundled.

## Commands

- `bun run build` — `tsc --noEmit` (type gate) + `vite build` + fix-esm-imports
- `bun run verify` — format, typecheck, lint, vitest, build (pre-push)
- `bun run test:unit` — vitest (jsdom)
