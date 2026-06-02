# Future features

Items deferred from the initial implementation.

## High priority

* [x] **Multiple text layers with z-order control** — done. Drag the layer list to reorder, with bring-to-front and send-to-back buttons; the list is shown front-to-back. Reorder helpers live in [src/lib/layers.js](src/lib/layers.js) and are covered by tests.
* [ ] **Templates system** — predefined cover layouts (title and artist, minimal, grid art) selectable from a dropdown, using a JSON-based template format.
* [x] **Undo and redo** — done. Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) with a 50-step history; drags and bursts of typing coalesce into a single step. See `useHistoryState` in [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx).
* [ ] **Text stroke and outline** — configurable stroke color and width on SVG text for legibility over bright images.
* [ ] **Text shadow** — a drop-shadow filter on SVG text.
* [ ] **Google Fonts integration** — load any Google Font by name into the font picker.

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
