# Playlist cover generator

A lightweight, embeddable graphic editor for creating square playlist cover art. Upload a background image, layer editable text on top, and export to high-quality PNG, editable SVG, or a re-loadable JSON project file.

Built with React 19, Vite 6, and Tailwind CSS 4. No heavy editor dependencies: the canvas is plain, exportable SVG.

## Features

* **Square SVG canvas** with a fixed internal coordinate system that scales responsively.
* **Background image** upload, displayed edge-to-edge with center-crop.
* **Toggleable grid** with adjustable spacing and an optional heavier line every *N* cells.
* **Editable text layers** with control over content, font, size, color, weight, style, anchor, position, outline (stroke color and width), and drop shadow.
* **Drag to position** text directly on the canvas, with optional **snap to grid**.
* **Reorderable layers** with drag-and-drop plus bring-to-front and send-to-back controls.
* **Templates** — apply a predefined layout (title and artist, minimal, grid art) from a dropdown, keeping your uploaded image.
* **Google Fonts** — add any Google font by name; used fonts are embedded into PNG and SVG exports so they stay portable.
* **Save and load** the full layout as JSON, so a project can be reopened later with any image.
* **Export** to high-quality PNG (rendered at 2x) and to clean, editable SVG.

## Getting started

### Prerequisites

* Node.js 18 or newer
* npm 9 or newer

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
```

Vite prints a local URL (default `http://localhost:5173`). Open it to use the editor.

### Build

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

### Test

```bash
npm test           # run the Vitest suite once
npm run test:watch # re-run on change
```

## Use as an embeddable component

The editor is a single self-contained component. Import it into any React 19 app:

```jsx
import { CoverGenerator } from 'playlist-cover-generator'

function Example() {
  return (
    <CoverGenerator
      initialState={{ grid: { enabled: true, spacing: 30, majorEvery: 5 } }}
      onStateChange={(state) => console.log(state)}
      className="my-wrapper"
    />
  )
}
```

### Props

| Prop | Type | Description |
|---|---|---|
| `initialState` | `object` | Partial state to seed the editor (grid, texts, snap settings). Merged over defaults. |
| `onStateChange` | `function` | Called with the full state object on every change. Use it to persist or sync. |
| `className` | `string` | Extra classes applied to the component's root element. |

Tailwind CSS 4 must be available in the host app, or the component's utility classes will not be styled. See [DESIGN.md](DESIGN.md) for the tokens and component classes used.

## Project structure

| Path | Purpose |
|---|---|
| [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx) | The editor: canvas, controls, drag, grid, and export logic. |
| [src/lib/layers.js](src/lib/layers.js) | Pure text-layer z-order helpers (unit-tested). |
| [src/lib/templates.js](src/lib/templates.js) | Predefined cover layouts and the apply helper (unit-tested). |
| [src/lib/text.js](src/lib/text.js) | Pure text presentation helpers, e.g. stroke/outline attributes (unit-tested). |
| [src/lib/fonts.js](src/lib/fonts.js) | Built-in font list and Google Fonts URL/CSS helpers (unit-tested). |
| [src/index.js](src/index.js) | Library entry that re-exports `CoverGenerator`. |
| [src/App.jsx](src/App.jsx) | Demo application wrapper. |
| [src/main.jsx](src/main.jsx) | Vite entry point for the demo. |
| [src/index.css](src/index.css) | Tailwind import plus shared component classes. |

## Export formats

* **PNG** renders the SVG to a canvas at 2x scale (1200x1200) for a crisp raster image. The grid overlay is stripped first.
* **SVG** is serialized directly with the grid removed and interaction styles cleaned up, so it stays editable in tools such as Inkscape or Illustrator.
* **JSON** captures the layout (text, positions, grid, snap) without the embedded image data, keeping the file small and portable. Re-importing restores the layout over whichever image is loaded next.

## Documentation

* [DESIGN.md](DESIGN.md) — the design system: palette, typography, spacing, and components.
* [AGENTS.md](AGENTS.md) — guidance for AI coding agents working in this repository.
* [todo.md](todo.md) — planned and deferred features.
