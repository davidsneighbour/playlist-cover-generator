# Roadmap

Generated 2026-06-22. Source of truth is the [GitHub issue tracker](https://github.com/davidsneighbour/playlist-cover-generator/issues).

## Project state

`posterboy-image-generator` v0.2.0 is MIT-licensed and publish-ready. The embeddable `ImageGenerator` React component supports draggable text, image, and shape layers on a clean SVG canvas, with PNG/SVG/ZIP batch export, a programmatic API, undo/redo, auto-save, share links, drag-to-reorder layers, layer visibility/locking, a new-project action, and IndexedDB background-image storage.

Since the last roadmap another wave of items landed: md-breakpoint two-column layout (#33), align/distribute tools (#20), accordion-card focus management (#12), keyboard z-order shortcut (#16), share-link image note (#22), smart shape fill color (#35), save-status indicator polish (#38), JSON version field (#47), and layer rotation (#2). The medium-priority queue has thinned considerably; the current focus is the remaining a11y gap (color picker), the batch rendering API, and the larger-effort feature bets.

## Project health

| Check | Status |
| --- | --- |
| Tests | ✅ 316 passed / 0 failed (27 files) |
| Lint | ✅ 0 errors, 29 warnings (all jsx-a11y, by design) |
| Build — demo | ✅ passes |
| Build — lib | ✅ passes |

## Do next

### Medium priority — accessibility

* [#13](https://github.com/davidsneighbour/playlist-cover-generator/issues/13) **Color picker keyboard hex-entry and screen-reader support** — `<input type="color">` is not keyboard-navigable on most platforms; a `ColorInput` component with a hex text field is the fix. High a11y impact, touches many controls.

### Medium priority — features and UX

* [#43](https://github.com/davidsneighbour/playlist-cover-generator/issues/43) **Batch CSV/JSON rendering via programmatic API** — accept a data file and emit one PNG per row. Builds on the headless `generateFromTemplate` path (now cleanly extracted in `src/lib/generate.js`).
* [#40](https://github.com/davidsneighbour/playlist-cover-generator/issues/40) **Text box with automatic line wrapping** — width-constrained text layer. SVG `<foreignObject>` or manual word-wrap; higher complexity but frequently needed for paragraph text.

## Larger bets (high effort)

* [#6](https://github.com/davidsneighbour/playlist-cover-generator/issues/6) **Offload export to OffscreenCanvas/worker** — prerequisite refactors (#7, #8) are done; natural next step for export performance. Prevents UI freeze on large batch exports.
* [#1](https://github.com/davidsneighbour/playlist-cover-generator/issues/1) **Curved/arced text via `<textPath>`** — needs a companion path element per text layer; complex interaction with export clone stripping logic.

## Low priority / ideas

### UX and polish

* [#19](https://github.com/davidsneighbour/playlist-cover-generator/issues/19) Template preview thumbnails
* [#23](https://github.com/davidsneighbour/playlist-cover-generator/issues/23) Draggable ruler guides for precise layer alignment
* [#24](https://github.com/davidsneighbour/playlist-cover-generator/issues/24) Background crop: drag-to-pan instead of sliders
* [#25](https://github.com/davidsneighbour/playlist-cover-generator/issues/25) Undo history panel showing available steps
* [#26](https://github.com/davidsneighbour/playlist-cover-generator/issues/26) Line-height slider visual feedback
* [#27](https://github.com/davidsneighbour/playlist-cover-generator/issues/27) Multi-layer selection for bulk move and delete
* [#34](https://github.com/davidsneighbour/playlist-cover-generator/issues/34) Gradient stop position slider
* [#36](https://github.com/davidsneighbour/playlist-cover-generator/issues/36) Recently used color palette
* [#37](https://github.com/davidsneighbour/playlist-cover-generator/issues/37) Text properties panel visual grouping
* [#39](https://github.com/davidsneighbour/playlist-cover-generator/issues/39) Polygon and star shape primitives
* [#41](https://github.com/davidsneighbour/playlist-cover-generator/issues/41) Gradient fills for text and shape layers
* [#42](https://github.com/davidsneighbour/playlist-cover-generator/issues/42) Image layer clipping/masking
* [#44](https://github.com/davidsneighbour/playlist-cover-generator/issues/44) Text resize handles (drag corner to scale `fontSize`)
* [#45](https://github.com/davidsneighbour/playlist-cover-generator/issues/45) Background image URL input as alternative to file upload
* [#46](https://github.com/davidsneighbour/playlist-cover-generator/issues/46) Copy and paste layers (Ctrl+C / Ctrl+V)

### Accessibility

* [#14](https://github.com/davidsneighbour/playlist-cover-generator/issues/14) Keyboard layer cycling (Tab/[ ] on canvas)
* [#15](https://github.com/davidsneighbour/playlist-cover-generator/issues/15) Announce nudge and drag completion to screen reader

### Performance and architecture

* [#31](https://github.com/davidsneighbour/playlist-cover-generator/issues/31) Reduce broad re-renders from monolithic state
* [#32](https://github.com/davidsneighbour/playlist-cover-generator/issues/32) Dark mode (prefers-color-scheme: dark)

## Suggested order of work

1. **#13** — color picker hex input (~2 h, last remaining medium-priority a11y gap)
2. **#43** — batch CSV/JSON rendering (~4 h, builds on the clean headless path)
3. **#6** — OffscreenCanvas export worker (~4 h, prereqs #7+#8 are done)
4. **#40** — text box wrapping (~4 h, complex but high value)
5. **#1** — curved/arced text (high complexity; best done after simpler bets land)
