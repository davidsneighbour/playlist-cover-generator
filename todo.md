# Future features

Items deferred from the initial implementation.

## High priority

* [x] **Multiple text layers with z-order control** — done. Drag the layer list to reorder, with bring-to-front and send-to-back buttons; the list is shown front-to-back. Reorder helpers live in [src/lib/layers.js](src/lib/layers.js) and are covered by tests.
* [x] **Templates system** — done. Pick a predefined layout (blank, title and artist, minimal, grid art) from a dropdown and apply it; it replaces text and grid while keeping the image, and a single Ctrl+Z reverts it. Definitions and the apply helper live in [src/lib/templates.js](src/lib/templates.js) and are covered by tests.
* [x] **Undo and redo** — done. Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) with a 50-step history; drags and bursts of typing coalesce into a single step. See `useHistoryState` in [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx).
* [x] **Text stroke and outline** — done. Per-layer stroke color and width (0 = off), painted under the fill with `paint-order` for a true outline. Logic in [src/lib/text.js](src/lib/text.js), covered by tests.
* [x] **Text shadow** — done. Per-layer drop shadow (color, blur, offset X/Y) via an SVG `feDropShadow` filter, so it stays editable in other SVG tools. Logic in [src/lib/text.js](src/lib/text.js), covered by tests.
* [ ] **Google Fonts integration** — load any Google Font by name into the font picker. **Deferred:** adding a font to the picker is easy, but the project's export goals make the full feature large. SVG rendered to a canvas for PNG export runs in an isolated context that ignores document and `@font-face` web fonts, and a portable SVG cannot assume the viewer has the font installed — so the font must be embedded as base64 `@font-face` for exports to match the canvas. That means fetching each font (the Google CSS endpoint is often CORS-restricted) and inlining it, handling weights and variable fonts: a cross-cutting change to the export pipeline that also cannot be verified headlessly in this environment. Revisit as three steps: (1) load a font by name into the picker, (2) embed used fonts as base64 on export, (3) verify PNG and SVG output in a real browser.

## Medium priority

* [ ] **Multiple image layers** — stack additional image layers (logos, overlays) with opacity and blend-mode controls.
* [ ] **Shape primitives** — add rectangles and circles as SVG elements with configurable fill, stroke, and opacity, draggable and snappable.
* [ ] **Color overlay layer** — a solid or gradient color fill over the background with adjustable opacity, useful for text legibility.
* [ ] **Gradient backgrounds** — configurable linear and radial SVG gradients.
* [ ] **Canvas size presets** — quick-switch between 600x600 (default), 1000x1000, 3000x3000 (high-res), and exact Spotify and Apple Music specs.
* [ ] **Rulers** — horizontal and vertical rulers alongside the canvas showing SVG coordinates.

## Lower priority

* [ ] **Keyboard shortcuts** — Delete to remove the selected element; arrow keys to nudge by 1px or by grid spacing.
* [ ] **Context menu** — right-click an element for delete, duplicate, and bring-forward actions.
* [ ] **Duplicate element** — copy a text layer with one click.
* [ ] **Image crop and position controls** — pan and zoom the background within the canvas frame instead of always using `xMidYMid slice`.
* [ ] **Image filters** — brightness, contrast, saturation, and blur sliders on the background.
* [ ] **Publish as an npm package** — ship `CoverGenerator` standalone with proper peer dependencies and tree-shaking.
* [ ] **Auto-save to localStorage** — persist editor state across page refreshes automatically.
* [ ] **Cloud save and share link** — encode state as a URL-safe parameter for shareable edit links.
* [ ] **Batch export** — apply the same layout to multiple uploaded images and download a ZIP.
* [ ] **Accessibility audit** — a full keyboard-only editing flow with ARIA live regions for state changes.
