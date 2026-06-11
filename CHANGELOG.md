# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Unreleased

## 0.2.0 - 2026-06-11

Package renamed from `playlist-cover-generator` to `posterboy-image-generator`. The primary component export is now `ImageGenerator` (`CoverGenerator` is kept as a deprecated alias).

### Added

* Arbitrary canvas dimensions per template: `canvasWidth`/`canvasHeight` in state and per-template fields replace the fixed 600×600 coordinate space. The SVG `viewBox` is now `0 0 canvasWidth canvasHeight`; existing 600×600 content is unaffected.
* Separate `exportWidth`/`exportHeight` in state replace the single `exportSize` field (migration is automatic).
* Two social media templates: `social-post` (1080×566) and `social-square` (1080×1080), each with a background image field, a label, a title, and a dark-gradient overlay for text legibility.
* Template schema extended: every template now carries `category`, `description`, `canvasWidth`, `canvasHeight`, `exportWidth`, `exportHeight`, and `fields[]` (named input bindings).
* Category filter row in the Templates panel ("All", "Music", "Social") to narrow the template list.
* Applying a template now also sets canvas and export dimensions when the template defines them.
* `buildStateFromTemplate(templateOrId, inputs)`: pure function, safe in Node.js, returns a complete editor state from a template and named inputs.
* `generateFromTemplate(templateOrId, inputs)` (browser): renders SVGCanvas via `react-dom/server`, strips editor chrome, and rasterizes to a PNG Blob with the Canvas 2D API.
* `generateFromTemplate(templateOrId, inputs)` (Node.js): same as above but rasterizes via `@resvg/resvg-js` (optional peer dep). Exported from `posterboy-image-generator/node`.
* `SVGCanvas` extracted to `src/components/SVGCanvas.jsx` for reuse by both the editor and headless generation.
* `TEMPLATES` and `getTemplate` exported from the package entry so consumers can inspect the template registry.
* `TEMPLATE-AUTHORING.md` template schema reference and programmatic API guide.

### Changed

* Six more cover layout templates (Top & bottom, Quote, Bold stack, Podcast, Festival, Corner label).
* A custom square export size, beyond the 600/1000/3000 presets.
* Multi-line text: the content field accepts newlines, with a per-layer line-height control.
* Per-layer lock and visibility toggles in the Layers panel: hidden layers leave the canvas and exports; locked layers can't be dragged, resized, nudged, or deleted.
* A "Saving…/Saved" auto-save indicator under the canvas reflecting the 500ms debounce.
* A triangle shape primitive and a corner-radius control for rectangles.

## 0.1.0 - 2026-06-05

The initial, publish-ready release: an embeddable React component that generates square playlist cover art on a clean, exportable SVG canvas.

### Added

* Draggable, snap-to-grid text layers with z-order controls, stroke and outline, and a drop shadow.
* Image layers (logos, overlays) with blend modes, fit, percentage resize, and corner-drag resizing with optional aspect lock.
* Shape primitives (rectangle, circle) sharing the bounding-box model, drag, and z-order with image layers.
* A color overlay layer (solid or gradient, with blend modes) over the background for text legibility.
* A two-stop linear or radial gradient background, shown when no image is loaded.
* Background image crop, pan, and zoom, plus brightness, contrast, saturation, and blur filters rendered as exportable SVG filters.
* Google Fonts integration: a search typeahead, per-option preview in its own typeface, and font embedding in exports via the Developer API catalog.
* Cover layout templates and a layers overview panel.
* Undo and redo with edit coalescing; a duplicate-layer action; delete and arrow-key nudging of the selected layer; and a right-click context menu.
* Optional canvas rulers and a snap grid.
* Export to PNG and SVG with size presets (600, 1000, 3000, and platform specs), and batch export of one layout over many images as a ZIP.
* Auto-save to localStorage and shareable edit links encoded in the URL hash.
* Accessibility: keyboard layer selection, on-canvas keyboard selection, ARIA live announcements, labelled inline controls, and AA-contrast buttons.
* An F1 help overlay listing keyboard shortcuts and the app version.
* Lucide icons across buttons and controls.

### Build

* Packaged `CoverGenerator` as a publishable npm library (ESM + CJS, externalized peers) with shipped TypeScript types.
* Added CI (GitHub Actions), ESLint (react-hooks, jsx-a11y), and Prettier.

### Performance

* Memoized the canvas leaf elements to cut re-renders during drag.
