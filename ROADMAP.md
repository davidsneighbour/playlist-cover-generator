# Roadmap

Generated 2026-06-20. Source of truth is the [GitHub issue tracker](https://github.com/davidsneighbour/playlist-cover-generator/issues).

## Project state

`posterboy-image-generator` v0.2.0 is MIT-licensed and publish-ready. The embeddable `ImageGenerator` React component supports draggable text, image, and shape layers on a clean SVG canvas, with PNG/SVG/ZIP batch export, a programmatic API, undo/redo, auto-save, and share links.

The previous quick-win queue is fully cleared: per-layer text opacity (#3), touch tap-targets (#10), axe accessibility test (#9), and layer rename (#17) are all shipped. The sole remaining high-priority item is the storage quota warning (#28).

## Project health

| Check | Status |
| --- | --- |
| Tests | ✅ 276 passed / 0 failed (26 files) |
| Lint | ✅ 0 errors, 29 warnings (all jsx-a11y, by design) |
| Build — demo | ✅ passes |
| Build — lib | ✅ passes |

## Do next

### Bug — high priority

* [#28](https://github.com/davidsneighbour/playlist-cover-generator/issues/28) **Background image quota drop is silent** — when localStorage is full the background image is silently dropped with no user feedback. Fix: catch the quota error in `storage.js` and surface it as a visible warning. Long-term root cause addressed by #5.

### Medium priority — features

* [#4](https://github.com/davidsneighbour/playlist-cover-generator/issues/4) **Line shape primitive** — adds `line` to `SHAPE_TYPES`; renders as `<line>` with stroke controls. Low complexity given the existing shape pipeline.
* [#18](https://github.com/davidsneighbour/playlist-cover-generator/issues/18) **Drag-to-reorder layers** — HTML drag-and-drop on layer list rows to replace bring-to-front/send-to-back buttons. Builds on existing `reorder` helpers in `layers.js`.
* [#20](https://github.com/davidsneighbour/playlist-cover-generator/issues/20) **Align and distribute tools** — snap selected layers to edges/centers or distribute evenly. Needs new pure helpers and a toolbar section.
* [#21](https://github.com/davidsneighbour/playlist-cover-generator/issues/21) **Reset canvas / new project** — clear state back to `DEFAULT_STATE` in one undoable action, with a confirmation step.
* [#29](https://github.com/davidsneighbour/playlist-cover-generator/issues/29) **Cache Google Fonts catalog** — currently re-fetched on every panel open; cache in a module-level ref or localStorage with a TTL.
* [#30](https://github.com/davidsneighbour/playlist-cover-generator/issues/30) **Debounce font typeahead filter** — filter runs synchronously on every keystroke over a large catalog; debounce ~150 ms to prevent jank.
* [#33](https://github.com/davidsneighbour/playlist-cover-generator/issues/33) **Two-column layout at `md` breakpoint** — currently two-column only kicks in at `lg`; tablets see a single-column layout.
* [#40](https://github.com/davidsneighbour/playlist-cover-generator/issues/40) **Text box with automatic line wrapping** — width-constrained text layer. Requires SVG foreignObject or manual word-wrap algorithm; higher complexity.
* [#43](https://github.com/davidsneighbour/playlist-cover-generator/issues/43) **Batch CSV/JSON rendering via programmatic API** — accept a data file and emit one PNG per row. Builds on the existing headless `generateFromTemplate` path.

### Medium priority — storage and performance

* [#5](https://github.com/davidsneighbour/playlist-cover-generator/issues/5) **Move background image to IndexedDB** — relieves localStorage quota pressure; long-term fix for the silent drop in #28.
* [#12](https://github.com/davidsneighbour/playlist-cover-generator/issues/12) **Focus not moved into accordion card on layer select** — accessibility gap; focus should land on the first control when a card auto-opens.
* [#13](https://github.com/davidsneighbour/playlist-cover-generator/issues/13) **Color picker keyboard hex-entry and screen-reader support** — `<input type="color">` is not keyboard-navigable on most platforms; needs a text hex field.

## Larger bets (high effort)

* [#2](https://github.com/davidsneighbour/playlist-cover-generator/issues/2) **Layer rotation** — store `rotation` angle per layer, thread through drag handles, export clone, and share state. Non-trivial SVG transform work.
* [#1](https://github.com/davidsneighbour/playlist-cover-generator/issues/1) **Curved/arced text via `<textPath>`** — needs a companion path element per text layer; complex interaction with the export clone stripping logic.
* [#6](https://github.com/davidsneighbour/playlist-cover-generator/issues/6) **Offload export to OffscreenCanvas/worker** — prevents UI jank during large batch exports. Requires a Worker build entry.
* [#7](https://github.com/davidsneighbour/playlist-cover-generator/issues/7) **Move export logic to `src/lib/export.js`** — currently interleaved in `CoverGenerator.jsx`; extracting it makes it testable without a DOM. Good prep for #6.
* [#8](https://github.com/davidsneighbour/playlist-cover-generator/issues/8) **Decompose canvas component cluster** — `CoverGenerator.jsx` is one large file; split into focused sub-components. Enables #31.

## Low priority / ideas

**UX and polish**

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

**Accessibility**

* [#14](https://github.com/davidsneighbour/playlist-cover-generator/issues/14) Keyboard layer cycling (Tab/[ ] on canvas)
* [#15](https://github.com/davidsneighbour/playlist-cover-generator/issues/15) Announce nudge and drag completion to screen reader
* [#16](https://github.com/davidsneighbour/playlist-cover-generator/issues/16) Keyboard z-order step-up/step-down shortcut

**Performance and architecture**

* [#31](https://github.com/davidsneighbour/playlist-cover-generator/issues/31) Reduce broad re-renders from monolithic state
* [#32](https://github.com/davidsneighbour/playlist-cover-generator/issues/32) Dark mode (prefers-color-scheme: dark)

## Suggested order of work

1. **#28** — storage quota warning (sole high-priority open item; ~2 h)
2. **#29, #30** — font panel performance (quick, independent)
3. **#21** — reset canvas (good UX foundation, ~1 h)
4. **#4** — line shape primitive (completes the basic shape set, ~1 h)
5. **#18** — drag-to-reorder layers (high UX value, ~3 h)
6. **#7, #8** — extract export logic + decompose canvas (enables #6 and #31)
7. **#5** — IndexedDB for background image (resolves the quota root cause behind #28)
8. **#2** — layer rotation (high complexity; do after refactors land)
