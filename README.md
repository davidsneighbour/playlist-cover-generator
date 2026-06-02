# Playlist cover generator

A lightweight, embeddable graphic editor for creating square playlist cover art. Upload a background image, layer editable text on top, and export to high-quality PNG, editable SVG, or a re-loadable JSON project file.

Built with React 19, Vite 6, and Tailwind CSS 4. No heavy editor dependencies: the canvas is plain, exportable SVG.

## Features

* **Square SVG canvas** with a fixed internal coordinate system that scales responsively.
* **Background image** upload with zoom and pan (crop) controls; defaults to a centered cover.
* **Background filters** — brightness, contrast, saturation, and blur, applied as an SVG filter so they survive PNG and SVG export.
* **Gradient background** — a linear or radial two-color gradient that fills the canvas when no image is loaded.
* **Image layers** — stack logos or overlays over the background, each with opacity, blend mode, size, and a draggable position.
* **Shapes** — add rectangles and circles with fill, stroke, and opacity, draggable and snappable.
* **Color overlay** — a full-canvas solid or gradient (linear or radial) fill over the background with adjustable opacity and a blend mode, for text legibility.
* **Toggleable grid** with adjustable spacing and an optional heavier line every *N* cells.
* **Rulers** — optional horizontal and vertical rulers alongside the canvas showing canvas coordinates (never exported).
* **Editable text layers** with control over content, font, size, color, weight, style, anchor, position, outline (stroke color and width), and drop shadow.
* **Drag to position** text directly on the canvas, with optional **snap to grid**.
* **Keyboard editing** — Delete removes the selected layer; arrow keys nudge it by 1px, or by the grid spacing with Shift.
* **Reorderable layers** with drag-and-drop plus bring-to-front and send-to-back controls, and one-click duplicate for text, image, and shape layers.
* **Right-click context menu** on any layer for duplicate, bring-to-front, send-to-back, and delete.
* **Templates** — apply a predefined layout (title and artist, minimal, grid art) from a dropdown, keeping your uploaded image.
* **Google Fonts** — add any Google font by name; used fonts are embedded into PNG and SVG exports so they stay portable.
* **Save and load** the full layout as JSON, so a project can be reopened later with any image.
* **Export size presets** — 600, 1000, or 3000 (the square Spotify and Apple Music spec) for the PNG and SVG output.
* **Export** to high-quality PNG and to clean, editable SVG.
* **Help overlay** — press F1 (or the help link) for a modal of keyboard shortcuts, tips, and the app version.

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

### Font search (optional)

The Fonts panel can search the live Google Fonts catalog as you type. This needs a free **Google Fonts Developer API key**:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. Enable the [Web Fonts Developer API](https://console.cloud.google.com/apis/library/webfonts.googleapis.com).
3. Under **APIs & Services → Credentials**, create an **API key**.
4. Copy [.env.template](.env.template) to `.env.local` and set the key:

```bash
cp .env.template .env.local
# then edit .env.local:
# VITE_GOOGLE_FONTS_API_KEY=your_key_here
```

Restart `npm run dev` after changing env files. Without a key you can still add fonts by typing an exact family name; you just do not get search suggestions.

Because this is a client-side app the key ships in the built JavaScript, so restrict it in the Cloud Console to the *Web Fonts Developer API* and to your HTTP referrers (include `http://localhost:5173/*` for local dev).

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
| `googleFontsApiKey` | `string` | Google Fonts API key for the font-search typeahead. Defaults to `VITE_GOOGLE_FONTS_API_KEY`; pass your own when embedding. |

Tailwind CSS 4 must be available in the host app, or the component's utility classes will not be styled. See [DESIGN.md](DESIGN.md) for the tokens and component classes used.

## Project structure

| Path | Purpose |
|---|---|
| [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx) | The editor: canvas, controls, drag, grid, and export logic. |
| [src/lib/layers.js](src/lib/layers.js) | Pure text-layer z-order helpers (unit-tested). |
| [src/lib/templates.js](src/lib/templates.js) | Predefined cover layouts and the apply helper (unit-tested). |
| [src/lib/text.js](src/lib/text.js) | Pure text presentation helpers, e.g. stroke/outline attributes (unit-tested). |
| [src/lib/fonts.js](src/lib/fonts.js) | Built-in font list and Google Fonts URL/CSS helpers (unit-tested). |
| [src/lib/images.js](src/lib/images.js) | Image-layer factory, blend modes, and fit/center helpers (unit-tested). |
| [src/lib/shapes.js](src/lib/shapes.js) | Shape factory and ellipse geometry helpers (unit-tested). |
| [src/lib/overlay.js](src/lib/overlay.js) | Color-overlay defaults and gradient-axis geometry (unit-tested). |
| [src/lib/background.js](src/lib/background.js) | Gradient-background defaults, type guard, and image crop geometry (unit-tested). |
| [src/lib/filters.js](src/lib/filters.js) | Background filter defaults and brightness/contrast transfer math (unit-tested). |
| [src/lib/canvas.js](src/lib/canvas.js) | Export-size presets and scale helpers (unit-tested). |
| [src/lib/rulers.js](src/lib/rulers.js) | Ruler tick enumeration (unit-tested). |
| [src/lib/shortcuts.js](src/lib/shortcuts.js) | Keyboard-shortcut list and platform-aware key formatter (unit-tested). |
| [src/lib/menu.js](src/lib/menu.js) | Context-menu viewport clamping (unit-tested). |
| [src/index.js](src/index.js) | Library entry that re-exports `CoverGenerator`. |
| [src/App.jsx](src/App.jsx) | Demo application wrapper. |
| [src/main.jsx](src/main.jsx) | Vite entry point for the demo. |
| [src/index.css](src/index.css) | Tailwind import plus shared component classes. |

## Export formats

* **PNG** renders the SVG to a canvas at the chosen export size (600, 1000, or 3000px square) for a crisp raster image. The grid overlay is stripped first.
* **SVG** is serialized directly with the grid removed and interaction styles cleaned up, and its width/height set to the export size; the `viewBox` stays at 600 so it scales cleanly and stays editable in tools such as Inkscape or Illustrator.
* **JSON** captures the layout (text, positions, grid, snap) without the embedded image data, keeping the file small and portable. Re-importing restores the layout over whichever image is loaded next.

## Documentation

* [DESIGN.md](DESIGN.md) — the design system: palette, typography, spacing, and components.
* [AGENTS.md](AGENTS.md) — guidance for AI coding agents working in this repository.
* [todo.md](todo.md) — planned and deferred features.
