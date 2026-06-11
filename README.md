# Posterboy-image-generator

A lightweight, embeddable React component for generating images from prepared templates: album covers, social media posts, wide banners, and more. Upload a background image, layer editable text on top, pick a template, and export to high-quality PNG, editable SVG, or a re-loadable JSON project file.

Built with React 19, Vite 6, and Tailwind CSS 4, with Headless UI and Lucide icons. No heavy editor dependencies: the canvas is plain, exportable SVG.

> **Migrating from `playlist-cover-generator`?** Install `posterboy-image-generator` and replace `CoverGenerator` imports with `ImageGenerator`. `CoverGenerator` is re-exported as a deprecated alias so existing code keeps working.

## Features

* **Multi-format templates:** choose a layout designed for album art (600×600), social media posts (1080×566), or custom sizes; the canvas adapts to the template's aspect ratio.
* **Layers overview:** a panel listing every layer front to back; click any entry to jump to its controls.
* **Arbitrary-size SVG canvas** with a fixed internal coordinate system that scales responsively.
* **Background image** upload with zoom and pan (crop) controls; defaults to a centered cover.
* **Background filters:** brightness, contrast, saturation, and blur, applied as an SVG filter so they survive PNG and SVG export.
* **Gradient background:** a linear or radial two-color gradient that fills the canvas when no image is loaded.
* **Image layers:** stack logos or overlays over the background, each with opacity, blend mode, size, and a draggable position.
* **Shapes:** add rectangles, circles, and triangles with fill, stroke, and opacity, draggable and snappable.
* **Color overlay:** a full-canvas solid or gradient fill over the background with adjustable opacity and a blend mode, for text legibility.
* **Toggleable grid** with adjustable spacing and an optional heavier line every *N* cells.
* **Rulers:** optional horizontal and vertical rulers alongside the canvas (never exported).
* **Editable text layers** with control over content, font, size, color, weight, style, anchor, position, outline (stroke color and width), and drop shadow.
* **Drag to position** text directly on the canvas, with optional **snap to grid**.
* **Keyboard editing:** Delete removes the selected layer; arrow keys nudge it by 1px, or by the grid spacing with Shift.
* **Reorderable layers** with drag-and-drop plus bring-to-front and send-to-back controls, and one-click duplicate for text, image, and shape layers.
* **Right-click context menu** on any layer for duplicate, bring-to-front, send-to-back, and delete.
* **Google Fonts:** add any Google font by name; used fonts are embedded into PNG and SVG exports so they stay portable.
* **Save and load** the full layout as JSON, so a project can be reopened later with any image.
* **Auto-save** the session to the browser's localStorage and restore it on the next visit (opt out with `autoSave={false}`).
* **Share link:** copy a URL that encodes the layout (background image excluded) so anyone opening it sees the same design.
* **Export** to high-quality PNG and to clean, editable SVG.
* **Batch export:** apply the current layout to several uploaded images at once and download them as a ZIP of PNGs.
* **Help overlay:** press F1 (or the help link) for a modal of keyboard shortcuts, tips, and the app version.
* **Accessible editing:** layers are selectable from the keyboard, and an ARIA live region announces adds, deletes, duplicates, and undo/redo.

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
npm run build      # demo app build into dist/
npm run build:lib  # library build (npm package) into dist/
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

The editor is a single self-contained component. Install it alongside its peer dependencies:

```bash
npm install posterboy-image-generator react react-dom
```

`react` and `react-dom` (>= 18) are peer dependencies you provide; `@headlessui/react` and `lucide-react` (icons) are bundled as regular dependencies. The package ships ES module and CommonJS builds and is side-effect free for tree-shaking. Import it into any React app:

```jsx
import { ImageGenerator } from 'posterboy-image-generator'

function Example() {
  return (
    <ImageGenerator
      initialState={{ grid: { enabled: true, spacing: 30, majorEvery: 5 } }}
      onStateChange={(state) => console.log(state)}
      className="my-wrapper"
    />
  )
}
```

### Props

| Prop | Type | Description |
| --- | --- | --- |
| `initialState` | `object` | Partial state to seed the editor (grid, texts, snap settings). Merged over defaults. |
| `onStateChange` | `function` | Called with the full state object on every change. Use it to persist or sync. |
| `className` | `string` | Extra classes applied to the component's root element. |
| `googleFontsApiKey` | `string` | Google Fonts API key for the font-search typeahead. Defaults to `VITE_GOOGLE_FONTS_API_KEY`; pass your own when embedding. |
| `autoSave` | `boolean` | Persist the session to localStorage and restore it on mount. Defaults to `true`; an explicit `initialState` still takes precedence per key. |

Tailwind CSS 4 must be available in the host app, or the component's utility classes will not be styled. See [DESIGN.md](DESIGN.md) for the tokens and component classes used.

## Programmatic API

### Build state from a template

```js
import { buildStateFromTemplate } from 'posterboy-image-generator'

const state = buildStateFromTemplate('social-post', {
  backgroundImageData: 'data:image/jpeg;base64,...',
  label: 'MUSIC',
  title: 'Summer Playlist 2025',
})
// Pass state as `initialState` prop to pre-populate the editor,
// or use generateFromTemplate to render directly to PNG.
```

### Generate a PNG in the browser

```js
import { generateFromTemplate } from 'posterboy-image-generator'

const blob = await generateFromTemplate('social-post', {
  backgroundImageData: 'data:image/jpeg;base64,...',
  title: 'Summer Playlist 2025',
  label: 'MUSIC',
})
const url = URL.createObjectURL(blob)
```

### Generate a PNG server-side

Requires `@resvg/resvg-js` as an optional dependency (`npm install @resvg/resvg-js`):

```js
import { generateFromTemplate } from 'posterboy-image-generator/node'
import fs from 'node:fs'

const pngBuffer = await generateFromTemplate('social-post', {
  backgroundImageData: imageDataUrl,
  title: 'Summer Playlist 2025',
  label: 'MUSIC',
})
fs.writeFileSync('output.png', pngBuffer)
```

See `TEMPLATE-AUTHORING.md` for the full template schema and how to create custom templates.

### Publishing

The package builds to `dist/` via `npm run build:lib` (also run automatically by `prepublishOnly`), producing `posterboy-image-generator.js` (ESM) and `posterboy-image-generator.cjs` (CommonJS) with React and Headless UI left external. To publish:

```bash
npm run build:lib
npm publish
```

The project is MIT licensed: see [LICENSE.md](LICENSE.md), declared as `"license": "MIT"` in `package.json`. npm always includes the license file in the published tarball regardless of the `files` allowlist.

## Project structure

| Path | Purpose |
| --- | --- |
| [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx) | The editor: canvas, controls, drag, grid, and export logic. |
| `src/lib/templateApi.js` | `buildStateFromTemplate`: pure function mapping template + inputs to state. |
| [src/lib/templates.js](src/lib/templates.js) | Predefined image layouts (music, social, banner) and the apply helper. |
| [src/lib/layers.js](src/lib/layers.js) | Pure text-layer z-order helpers (unit-tested). |
| [src/lib/layerList.js](src/lib/layerList.js) | Builds the unified front-to-back layer overview list (unit-tested). |
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
| [src/lib/storage.js](src/lib/storage.js) | localStorage auto-save serialize/parse helpers (unit-tested). |
| [src/lib/share.js](src/lib/share.js) | Share-link URL-safe state encode/decode (unit-tested). |
| [src/lib/zip.js](src/lib/zip.js) | Dependency-free ZIP writer (STORE) and CRC-32 for batch export (unit-tested). |
| [src/lib/export.js](src/lib/export.js) | Strips editor-only layers (grid, selection) from the export clone (unit-tested). |
| [src/lib/a11y.js](src/lib/a11y.js) | Accessibility announcement message helpers (unit-tested). |
| [src/index.js](src/index.js) | Library entry: exports `ImageGenerator`, `buildStateFromTemplate`, `generateFromTemplate`. |
| [src/App.jsx](src/App.jsx) | Demo application wrapper. |
| [src/main.jsx](src/main.jsx) | Vite entry point for the demo. |
| [src/index.css](src/index.css) | Tailwind import plus shared component classes. |

## Export formats

* **PNG** renders the SVG to a canvas at the chosen export size for a crisp raster image. The grid overlay is stripped first.
* **SVG** is serialized directly with the grid removed and interaction styles cleaned up, and its width/height set to the export size; the `viewBox` matches the template dimensions so it scales cleanly and stays editable in tools such as Inkscape or Illustrator.
* **JSON** captures the layout (text, positions, grid, snap) without the embedded image data, keeping the file small and portable. Re-importing restores the layout over whichever image is loaded next.
* **Batch ZIP** renders the current layout over each of several uploaded images (each cropped with the current zoom/pan and filtered the same) and downloads a ZIP of PNGs, built with a small dependency-free ZIP writer.

## Documentation

* [DESIGN.md](DESIGN.md) — the design system: palette, typography, spacing, and components.
* [AGENTS.md](AGENTS.md) — guidance for AI coding agents working in this repository.
* [todo.md](todo.md) — backlog and non-goals.

## License

MIT — see [LICENSE.md](LICENSE.md).
