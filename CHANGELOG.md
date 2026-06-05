# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Unreleased

### Added

* Six more cover layout templates (Top & bottom, Quote, Bold stack, Podcast, Festival, Corner label).
* A custom square export size, beyond the 600/1000/3000 presets.
* Multi-line text: the content field accepts newlines, with a per-layer line-height control.
* Per-layer lock and visibility toggles in the Layers panel: hidden layers leave the canvas and exports; locked layers can't be dragged, resized, nudged, or deleted.

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
