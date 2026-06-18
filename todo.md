# Backlog

All open work is tracked as GitHub issues. This file is the curated priority view; the issue tracker is authoritative.

The Vitest suite, both builds (`npm run build`, `npm run build:lib`), and lint all pass. The project is MIT licensed and publish-ready at version 0.2.0. For what the editor does see [README.md](README.md); for how it is built see [AGENTS.md](AGENTS.md).

---

## Do next (quick wins)

* [#3](https://github.com/davidsneighbour/playlist-cover-generator/issues/3) — Per-layer opacity for text layers (slider + state field, ~30 min)
* [#10](https://github.com/davidsneighbour/playlist-cover-generator/issues/10) — Improve touch tap-target sizing on mobile (padding audit, ~1 h)
* [#9](https://github.com/davidsneighbour/playlist-cover-generator/issues/9) — Add axe accessibility pass in component test (CI quality gate, ~2 h)
* [#17](https://github.com/davidsneighbour/playlist-cover-generator/issues/17) — Layer rename (name field + inline edit, big UX win)
* [#28](https://github.com/davidsneighbour/playlist-cover-generator/issues/28) — Show user warning when background image is silently dropped by storage quota

## Medium priority

* [#4](https://github.com/davidsneighbour/playlist-cover-generator/issues/4) — Line shape primitive
* [#5](https://github.com/davidsneighbour/playlist-cover-generator/issues/5) — Move background image to IndexedDB
* [#18](https://github.com/davidsneighbour/playlist-cover-generator/issues/18) — Drag-to-reorder layers in the layer list
* [#20](https://github.com/davidsneighbour/playlist-cover-generator/issues/20) — Align and distribute tools
* [#21](https://github.com/davidsneighbour/playlist-cover-generator/issues/21) — Reset canvas / new project action
* [#29](https://github.com/davidsneighbour/playlist-cover-generator/issues/29) — Cache Google Fonts catalog across panel opens
* [#30](https://github.com/davidsneighbour/playlist-cover-generator/issues/30) — Debounce font typeahead filter
* [#33](https://github.com/davidsneighbour/playlist-cover-generator/issues/33) — Two-column layout at md breakpoint (not just lg)
* [#40](https://github.com/davidsneighbour/playlist-cover-generator/issues/40) — Text box with automatic line wrapping
* [#43](https://github.com/davidsneighbour/playlist-cover-generator/issues/43) — Batch CSV/JSON rendering via the programmatic API

## Larger bets (high effort)

* [#2](https://github.com/davidsneighbour/playlist-cover-generator/issues/2) — Layer rotation for text, image, and shape layers
* [#1](https://github.com/davidsneighbour/playlist-cover-generator/issues/1) — Curved/arced text via `<textPath>`
* [#6](https://github.com/davidsneighbour/playlist-cover-generator/issues/6) — Offload export rasterization to OffscreenCanvas/worker
* [#7](https://github.com/davidsneighbour/playlist-cover-generator/issues/7) — Move export logic into `src/lib/export.js`
* [#8](https://github.com/davidsneighbour/playlist-cover-generator/issues/8) — Decompose canvas component cluster into separate files

## Low priority / ideas

* [#11](https://github.com/davidsneighbour/playlist-cover-generator/issues/11) — Dependabot: update Vite 6 → 8 and plugin-react 4 → 6
* [#12](https://github.com/davidsneighbour/playlist-cover-generator/issues/12) — Focus not moved into accordion card when auto-opened
* [#13](https://github.com/davidsneighbour/playlist-cover-generator/issues/13) — Color picker keyboard hex-entry and screen-reader support
* [#14](https://github.com/davidsneighbour/playlist-cover-generator/issues/14) — Canvas keyboard layer cycling (Tab/[ ] to cycle layers)
* [#15](https://github.com/davidsneighbour/playlist-cover-generator/issues/15) — Announce nudge and drag completion to screen reader
* [#16](https://github.com/davidsneighbour/playlist-cover-generator/issues/16) — Keyboard step-up/step-down z-order shortcut
* [#19](https://github.com/davidsneighbour/playlist-cover-generator/issues/19) — Template preview thumbnails
* [#22](https://github.com/davidsneighbour/playlist-cover-generator/issues/22) — Share link: in-app note that background is excluded
* [#23](https://github.com/davidsneighbour/playlist-cover-generator/issues/23) — Draggable ruler guides
* [#24](https://github.com/davidsneighbour/playlist-cover-generator/issues/24) — Background crop: drag-to-pan instead of sliders
* [#25](https://github.com/davidsneighbour/playlist-cover-generator/issues/25) — Undo history panel showing available steps
* [#26](https://github.com/davidsneighbour/playlist-cover-generator/issues/26) — Line-height slider visual feedback
* [#27](https://github.com/davidsneighbour/playlist-cover-generator/issues/27) — Multi-layer selection for bulk operations
* [#31](https://github.com/davidsneighbour/playlist-cover-generator/issues/31) — Reduce broad re-renders from monolithic state
* [#32](https://github.com/davidsneighbour/playlist-cover-generator/issues/32) — Dark mode (prefers-color-scheme: dark)
* [#34](https://github.com/davidsneighbour/playlist-cover-generator/issues/34) — Gradient stop position slider
* [#35](https://github.com/davidsneighbour/playlist-cover-generator/issues/35) — Smart default fill color for new shapes
* [#36](https://github.com/davidsneighbour/playlist-cover-generator/issues/36) — Recently used color palette
* [#37](https://github.com/davidsneighbour/playlist-cover-generator/issues/37) — Text properties panel visual grouping
* [#38](https://github.com/davidsneighbour/playlist-cover-generator/issues/38) — Save status indicator placement
* [#39](https://github.com/davidsneighbour/playlist-cover-generator/issues/39) — Polygon and star shape primitives
* [#41](https://github.com/davidsneighbour/playlist-cover-generator/issues/41) — Gradient fills for text and shape layers
* [#42](https://github.com/davidsneighbour/playlist-cover-generator/issues/42) — Image layer clipping/masking
* [#44](https://github.com/davidsneighbour/playlist-cover-generator/issues/44) — Text resize handles (drag corner to scale fontSize)
* [#45](https://github.com/davidsneighbour/playlist-cover-generator/issues/45) — Background image URL input
* [#46](https://github.com/davidsneighbour/playlist-cover-generator/issues/46) — Copy and paste layers (Ctrl+C / Ctrl+V)
* [#47](https://github.com/davidsneighbour/playlist-cover-generator/issues/47) — Version field in exported JSON state

## Out of scope (non-goals)

* **Server-backed cloud save** — the share link encodes the layout in the URL hash (`#s=...`). A real cloud save would require a server and auth, which this embeddable, dependency-light component deliberately does not include.
