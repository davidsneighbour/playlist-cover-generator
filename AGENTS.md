# Agent guide

Instructions for AI coding agents working in this repository. This is the canonical source; tool-specific config files (for Claude Code, Cursor, Copilot, Gemini, and Windsurf) point back here.

## What this project is

An embeddable React component that generates square playlist cover art. A user uploads a background image, adds draggable text layers, optionally shows a snap grid, and exports to PNG, SVG, or a re-loadable JSON project. The canvas is plain SVG, kept clean so exported files open in other editors.

## Tech stack

* **React 19** with hooks only (no class components).
* **Vite 6** for dev server and build.
* **Tailwind CSS 4** via the `@tailwindcss/vite` plugin (no `tailwind.config.js`; configuration is CSS-first in [src/index.css](src/index.css)).
* JavaScript with JSX (`.jsx`). There is no TypeScript in this project.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies. |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serve the production build. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

Always run `npm run build` and `npm test` after non-trivial changes to confirm the project still compiles and the suite passes.

## Architecture

The whole editor lives in [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx). Read it before changing anything. Key pieces:

* `CANVAS_SIZE` is the fixed internal SVG coordinate space (600). The rendered size scales via a `ResizeObserver`; all geometry is stored in canvas units, not screen pixels.
* `CoverGenerator` is the exported component. It owns all state and notifies the host through `onStateChange` (fired from an effect whenever state changes, skipping the initial mount).
* `useHistoryState` wraps the single state object to provide undo and redo. Every mutation goes through its `commit(patch, coalesceKey)`. Discrete edits push a new history entry; rapid edits that share a `coalesceKey` (dragging a text, typing in a field) collapse into one step. Undo and redo are bound to Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (and Ctrl+Y), and ignored while a form field is focused so native text undo still works. When adding a new continuous interaction, give it a stable `coalesceKey`; for one-off actions, omit it.
* `SVGCanvas` renders the SVG tree: background `image`, then the grid, then text, then the selection outline.
* `GridOverlay` draws minor and major lines. It is marked `data-layer="grid"` so exporters can strip it.
* The controls are an accordion of `CollapsibleCard`s ([src/components/Accordion.jsx](src/components/Accordion.jsx)) driven by the pure reducer in [src/lib/accordion.js](src/lib/accordion.js) (one unpinned card open at a time; pinned cards stay open). `CoverGenerator` owns the accordion state and provides it via `AccordionContext`; selecting or adding a layer calls `openCard` for that layer's properties card (ids `props-text`/`props-image`/`props-shape`), and adding also scrolls to it. The canvas column is sticky on `lg`.
* Pointer dragging is the shared `useSvgDrag` hook, used by both `TextElement` and `ImageElement`. It converts screen coordinates to SVG coordinates through `getScreenCTM().inverse()`, then snaps and clamps. Do not reimplement drag math with raw offsets; the matrix transform keeps it correct under scaling.
* Shape primitives (`state.shapes`) render between the image layers and the grid. They share the bounding-box model (x, y, width, height), drag hook, and z-order helpers used by image layers; a `circle` is an `<ellipse>` fit to the box (see [src/lib/shapes.js](src/lib/shapes.js)). Text, image, and shape selection are mutually exclusive (`selectText`/`selectImage`/`selectShape`).
* Image layers (logos, overlays) live in `state.images` and render between the background and the grid. Their factory and blend-mode/fit helpers are in [src/lib/images.js](src/lib/images.js); z-order reuses the generic `reorder`/`bringToFront`/`sendToBack` helpers from layers.js since they key off `id`. Layer `data` (a data URL) is kept in exported JSON so image layers round-trip (unlike the background, which is stripped).
* `snapValue` rounds a coordinate to the grid when snapping is on. Reuse it rather than duplicating rounding logic.
* Text-layer z-order is the `texts` array order: index 0 is painted first (bottom) and the last item is painted last (front). The pure reorder helpers (`reorder`, `bringToFront`, `sendToBack`, `displayIndexToArrayIndex`) live in [src/lib/layers.js](src/lib/layers.js) and return the same array reference on a no-op so reorders never add empty undo entries. The layer list is displayed front-to-back, so the UI converts display positions to array indices with `displayIndexToArrayIndex`.
* Text presentation helpers live in [src/lib/text.js](src/lib/text.js). `textStrokeAttrs` turns a layer's `stroke`/`strokeWidth` into SVG attributes (no stroke when width is 0, otherwise `paint-order: stroke` so the outline sits under the fill); spread its result onto the `<text>` element. `textShadowFilter` resolves a layer's `shadow` object (`{ color, blur, dx, dy }`, or null when off) into params for an SVG `feDropShadow`; the canvas renders one `<filter>` per shadowed layer in `<defs>` and the `<text>` references it. New text layers carry `stroke`, `strokeWidth`, and `shadow`, all part of `TEXT_KEYS` — keep them in sync across `addText`, the templates, and that list.
* Custom (Google) fonts are tracked in `state.fonts`. For the live canvas the component injects a stylesheet `<link>` per font (`googleFontCssUrl`). The Fonts panel typeahead and export embedding share one cached fetch of the Google Fonts Developer API catalog (`loadFontCatalog`, needs `googleFontsApiKey`). On export, `embedFontsInClone` inlines only the weights/styles actually used as base64 `@font-face`, fetching the catalog's gstatic file URLs (CORS-enabled, unlike the CSS endpoint). The pure helpers in [src/lib/fonts.js](src/lib/fonts.js) (`googleFontsListUrl`, `filterFontNames`, `fontVariantKey`, `variantFontFace`, `pickVariantFile`, `buildFontFaceRule`) are tested; the network/DOM work stays in the component and is best-effort (export still succeeds with a fallback if a fetch fails).
* Templates are plain layout data in [src/lib/templates.js](src/lib/templates.js). `instantiateTemplate` builds editor state from a template, keeping the current background image, deep-copying the grid, and assigning each text a fresh id from a `makeId` callback (the component passes the same `nextId` counter that `addText` uses). Applying a template goes through `update`, so it is one undoable step. Add new layouts to the `TEMPLATES` array; give every text layer all of `TEXT_KEYS`.

### State shape

The single state object is the contract for JSON import/export and the `initialState` prop. Keep it stable:

```js
{
  backgroundImage: string | null,      // file name, for display only
  backgroundImageData: string | null,  // data URL; excluded from JSON export
  texts: [
    { id, content, x, y, fontSize, fontFamily, color, bold, italic, anchor }
  ],
  grid: { enabled, spacing, majorEvery },
  snapToGrid: boolean,
}
```

`backgroundImageData` is deliberately omitted from exported JSON to keep project files small; importing JSON restores the layout over whatever image is loaded next. Preserve this behavior.

### Export rules

* PNG and SVG exporters clone the live SVG, remove `[data-layer="grid"]`, and clear interaction-only styles. The grid must never appear in exports.
* PNG renders at 2x for quality. SVG must stay valid and editable in external tools, so avoid embedding interaction handlers or editor-only attributes in the serialized output.

## Conventions

* Match the existing style in [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx): functional components, `useCallback` for handlers passed as props, and small helper components within the file.
* Styling is Tailwind utility classes plus the shared `.btn-primary`, `.btn-secondary`, and `.input` classes defined in [src/index.css](src/index.css). Reuse those classes instead of repeating utility chains.
* Follow [DESIGN.md](DESIGN.md) for color, typography, and spacing. The theme is light, minimal, and content-first.
* Keep the component dependency-free where reasonable. Do not add a heavy SVG-editor library; the value here is clean, portable SVG.

### Tests

Tests run on Vitest. Prefer extracting non-trivial logic into pure functions under [src/lib/](src/lib/) and testing those directly, rather than driving the DOM; SVG drag and HTML drag-and-drop are hard to test headlessly, but the math behind them is not. Tests live in [tests/](tests/), named `<module>.test.js`, and import the module under test from the matching path under `../src/lib`. Add or update tests for any new pure logic.

### Markdown

This repository lints markdown with `markdownlint-cli2` using the config in `.markdownlint-cli2.jsonc`. When editing any `.md` file, follow these rules so it passes:

* Headings use sentence case, not title case (for example, "Getting started", not "Getting Started").
* Unordered lists use `*`, nested two spaces.
* Bold uses `**`, italics use `*`.
* Horizontal rules use `---`.
* Tables are compact (single spaces around cell content) with leading and trailing pipes.
* Use a real ellipsis character, not three dots, and straight quotes, not curly quotes.
* Do not use generic link text such as "click here", "here", "link", or "more".

## Do and do not

* Do keep all geometry in canvas units and convert at the edges only.
* Do update [todo.md](todo.md) when you defer work, and [DESIGN.md](DESIGN.md) when you introduce new visual tokens.
* Do verify with `npm run build` before declaring a change done.
* Do not commit or push unless explicitly asked.
* Do not introduce TypeScript, a CSS framework other than Tailwind, or a `tailwind.config.js` file.
