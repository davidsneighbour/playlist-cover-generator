# Roadmap

Generated 2026-06-21. Source of truth is the [GitHub issue tracker](https://github.com/davidsneighbour/playlist-cover-generator/issues).

## Project state

`posterboy-image-generator` v0.2.0 is MIT-licensed and publish-ready. The embeddable `ImageGenerator` React component supports draggable text, image, and shape layers (including line) on a clean SVG canvas, with PNG/SVG/ZIP batch export, a programmatic API, undo/redo, auto-save, share links, drag-to-reorder layers, layer visibility/locking, a new-project action, and IndexedDB background-image storage.

A large batch of medium-priority items shipped since the last roadmap: quota warning (#28), font panel caching and debounce (#29, #30), line shape (#4), drag-to-reorder (#18), new-project action (#21), export logic extraction (#7), component decomposition (#8), and IndexedDB background storage (#5). The medium-priority queue has shrunk significantly; the next focus area is accessibility, responsive layout, and the batch rendering API.

## Project health

| Check | Status |
| --- | --- |
| Tests | ✅ 293 passed / 0 failed (26 files) |
| Lint | ✅ 0 errors, 29 warnings (all jsx-a11y, by design) |
| Build — demo | ✅ passes |
| Build — lib | ✅ passes |

## Do next

### Medium priority — accessibility

* [#13](https://github.com/davidsneighbour/playlist-cover-generator/issues/13) **Color picker keyboard hex-entry and screen-reader support** — `<input type="color">` is not keyboard-navigable on most platforms; a `ColorInput` component with a hex text field is the fix. High a11y impact, touches many controls.
* [#12](https://github.com/davidsneighbour/playlist-cover-generator/issues/12) **Focus not moved into accordion card on layer select** — when a card auto-opens on layer selection, focus should land on the first control; currently keyboard users must tab through all preceding controls.

### Medium priority — features and UX

* [#33](https://github.com/davidsneighbour/playlist-cover-generator/issues/33) **Two-column layout at `md` breakpoint** — currently two-column only kicks in at `lg`; tablets see a single-column layout with the canvas scrolled out of view during editing.
* [#20](https://github.com/davidsneighbour/playlist-cover-generator/issues/20) **Align and distribute tools** — snap selected layers to canvas edges/centers or distribute evenly. Pure geometry helpers + toolbar section; one of the most-requested layout primitives.
* [#43](https://github.com/davidsneighbour/playlist-cover-generator/issues/43) **Batch CSV/JSON rendering via programmatic API** — accept a data file and emit one PNG per row. Builds on the headless `generateFromTemplate` path (now cleanly extracted in `src/lib/generate.js`).
* [#40](https://github.com/davidsneighbour/playlist-cover-generator/issues/40) **Text box with automatic line wrapping** — width-constrained text layer. SVG `<foreignObject>` or manual word-wrap; higher complexity but frequently needed for paragraph text.

## Larger bets (high effort)

* [#6](https://github.com/davidsneighbour/playlist-cover-generator/issues/6) **Offload export to OffscreenCanvas/worker** — the prerequisite refactors (#7, #8) are now done; this is the natural next step for export performance. Prevents UI freeze on large batch exports.
* [#2](https://github.com/davidsneighbour/playlist-cover-generator/issues/2) **Layer rotation** — store `rotation` per layer, thread through drag handles, export clone, and share state. Non-trivial SVG transform work; benefits from #6 landing first.
* [#1](https://github.com/davidsneighbour/playlist-cover-generator/issues/1) **Curved/arced text via `<textPath>`** — needs a companion path element per text layer; complex interaction with export clone stripping logic.

## Low priority / ideas

### UX and polish

* [#19](https://github.com/davidsneighbour/playlist-cover-generator/issues/19) Template preview thumbnails
* [#22](https://github.com/davidsneighbour/playlist-cover-generator/issues/22) Share link: in-app note that background image is excluded
* [#23](https://github.com/davidsneighbour/playlist-cover-generator/issues/23) Draggable ruler guides for precise layer alignment
* [#24](https://github.com/davidsneighbour/playlist-cover-generator/issues/24) Background crop: drag-to-pan instead of sliders
* [#25](https://github.com/davidsneighbour/playlist-cover-generator/issues/25) Undo history panel showing available steps
* [#26](https://github.com/davidsneighbour/playlist-cover-generator/issues/26) Line-height slider visual feedback
* [#27](https://github.com/davidsneighbour/playlist-cover-generator/issues/27) Multi-layer selection for bulk move and delete
* [#34](https://github.com/davidsneighbour/playlist-cover-generator/issues/34) Gradient stop position slider
* [#35](https://github.com/davidsneighbour/playlist-cover-generator/issues/35) Smart default fill color for new shapes
* [#36](https://github.com/davidsneighbour/playlist-cover-generator/issues/36) Recently used color palette
* [#37](https://github.com/davidsneighbour/playlist-cover-generator/issues/37) Text properties panel visual grouping
* [#38](https://github.com/davidsneighbour/playlist-cover-generator/issues/38) Save status indicator placement
* [#39](https://github.com/davidsneighbour/playlist-cover-generator/issues/39) Polygon and star shape primitives
* [#41](https://github.com/davidsneighbour/playlist-cover-generator/issues/41) Gradient fills for text and shape layers
* [#42](https://github.com/davidsneighbour/playlist-cover-generator/issues/42) Image layer clipping/masking
* [#44](https://github.com/davidsneighbour/playlist-cover-generator/issues/44) Text resize handles (drag corner to scale `fontSize`)
* [#45](https://github.com/davidsneighbour/playlist-cover-generator/issues/45) Background image URL input as alternative to file upload
* [#46](https://github.com/davidsneighbour/playlist-cover-generator/issues/46) Copy and paste layers (Ctrl+C / Ctrl+V)
* [#47](https://github.com/davidsneighbour/playlist-cover-generator/issues/47) Version field in exported JSON state for future migration support

### Accessibility

* [#14](https://github.com/davidsneighbour/playlist-cover-generator/issues/14) Keyboard layer cycling (Tab/[ ] on canvas)
* [#15](https://github.com/davidsneighbour/playlist-cover-generator/issues/15) Announce nudge and drag completion to screen reader
* [#16](https://github.com/davidsneighbour/playlist-cover-generator/issues/16) Keyboard z-order step-up/step-down shortcut

### Performance and architecture

* [#31](https://github.com/davidsneighbour/playlist-cover-generator/issues/31) Reduce broad re-renders from monolithic state
* [#32](https://github.com/davidsneighbour/playlist-cover-generator/issues/32) Dark mode (prefers-color-scheme: dark)

## Suggested order of work

1. **#33** — md breakpoint layout (~30 min, quick win, fixes tablets immediately)
2. **#13** — color picker hex input (~2 h, high a11y impact, touches many controls)
3. **#12** — focus into accordion card on layer select (~1 h, completes the a11y gap)
4. **#20** — align/distribute tools (~3 h, high UX value, pure geometry helpers)
5. **#43** — batch CSV/JSON rendering (~4 h, builds on the clean headless path)
6. **#6** — OffscreenCanvas export worker (~4 h, prereqs #7+#8 are now done)
7. **#40** — text box wrapping (~4 h, complex but high value)
8. **#2** — layer rotation (high complexity; do after #6 lands)
