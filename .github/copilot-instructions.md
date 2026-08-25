# Copilot instructions for `statuspage-widget`

## Project shape

This is a small Preact widget that mounts into `.statuspage-embed-container` elements from `src/index.tsx`, renders the UI in `src/StatusPageEmbed.tsx`, and styles it with `src/StatusPageEmbed.scss`.

The widget polls `GET ${apiBase}/v2/summary.json`, filters incidents by configured component IDs, remembers dismissed incidents in `localStorage` keyed by the API host, and falls back to a safe “all systems operational” state on fetch failure. `testMode` uses a fixture payload in the component itself.

## Commands

- `npm start` — development server
- `npm test` — watch mode
- `npm test -- --runInBand --watch=false` — single non-watch test run
- `npm test -- --runInBand --watch=false --testPathPattern=src/StatusPageEmbed.test.js` — one test file
- `npm run build` — production build for `build/`
- `npm run dist` — distribution build for `dist/`
- `npm run dist -- --stats` — build stats for bundle analysis
- `npx webpack-bundle-analyzer dist/bundle-stats.json` — inspect bundle size

## Conventions

- Keep `StatusPageEmbed` as the shared behavior surface; callers should not reimplement polling, filtering, dismissal, or fallback logic.
- Preserve the existing `initialState`/`previousState` behavior so the widget avoids flashing back to the empty state while refetching.
- Keep the `localStorage` dismissal key format tied to `new URL(apiBase).hostname`.
- The component’s visible/hidden state is driven by `status.indicator`, `initialised`, and the previous state; tests already assert the tabindex behavior.
- `src/index.tsx` expects `data-*` attributes on each mount point and JSON in `data-components`.

## Repo docs to respect

- `README.md` is the source for supported scripts and the bundle-analysis flow.
- `netlify.toml` defines the deployed CSP and static caching headers; avoid changes that would conflict with those constraints.
