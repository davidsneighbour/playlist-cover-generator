# Template authoring guide

This document explains how to create templates for `posterboy-image-generator` and how to use the programmatic API to build state from them.

## Template schema

A template is a plain JavaScript object in [src/lib/templates.js](src/lib/templates.js). Every template has these fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique identifier, kebab-case |
| `name` | `string` | yes | Human-readable label shown in the UI |
| `category` | `string` | yes | `'music'`, `'social'`, or a custom string |
| `description` | `string` | yes | One sentence describing the layout |
| `canvasWidth` | `number` | yes | Internal SVG coordinate width |
| `canvasHeight` | `number` | yes | Internal SVG coordinate height |
| `exportWidth` | `number` | yes | Default export pixel width |
| `exportHeight` | `number` | yes | Default export pixel height |
| `fields` | `TemplateField[]` | yes | Named input bindings (may be empty) |
| `layout` | `object` | yes | The actual layer data (see below) |

### Layout object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `texts` | `TextLayer[]` | yes | Text layers (no `id`; assigned on apply) |
| `grid` | `Grid` | yes | Grid settings |
| `snapToGrid` | `boolean` | yes | Whether snap is on by default |
| `overlay` | `Overlay` | no | Overlay to apply when the template is applied |

When `overlay` is present, applying the template replaces the current overlay. When absent, the current overlay is left unchanged.

### Text layer fields

Every text layer in `layout.texts` must define all of these:

```js
{
  content:     string,
  x:           number,   // canvas units
  y:           number,   // canvas units
  fontSize:    number,   // canvas units
  fontFamily:  string,   // CSS font-family
  color:       string,   // CSS color
  bold:        boolean,
  italic:      boolean,
  anchor:      'start' | 'middle' | 'end',
  stroke:      string,   // CSS color
  strokeWidth: number,   // 0 = no stroke
  shadow:      { color, blur, dx, dy } | null,
  lineHeight:  number,   // multiplier (e.g. 1.2)
}
```

Use the `text(overrides)` helper inside `templates.js` to fill sensible defaults.

### Field bindings

`fields` maps named inputs to layers, so callers using `buildStateFromTemplate` can pass values by name rather than by layer index:

```js
fields: [
  { name: 'backgroundImage', type: 'image' },
  { name: 'label',  type: 'text', textLayerIndex: 0 },
  { name: 'title',  type: 'text', textLayerIndex: 1 },
],
```

`textLayerIndex` is the zero-based index into `layout.texts`. The `'image'` type maps to `backgroundImageData` in the inputs object.

## Coordinate system

Each template defines its own `canvasWidth` and `canvasHeight`. All geometry (x, y, fontSize, etc.) is expressed in that coordinate space. The SVG `viewBox` is always `0 0 canvasWidth canvasHeight`, so coordinates scale cleanly to any export size.

For a 600×600 template, `x: 300` is the center. For a 1080×566 template, `x: 540` is the center horizontally.

## Adding a new template

1. Open [src/lib/templates.js](src/lib/templates.js).
2. Add an entry to the `TEMPLATES` array. Copy an existing entry as a starting point.
3. Give every text layer all of the fields listed above (use the `text()` helper).
4. Add `category`, `description`, `canvasWidth`, `canvasHeight`, `exportWidth`, `exportHeight`, and `fields`.
5. Run `npm test` to confirm the suite still passes.
6. Load the app with `npm run dev` and apply your template to verify it looks right.

## Programmatic API

### `buildStateFromTemplate(templateOrId, inputs)`

Pure function; safe in Node.js. Returns a complete editor state object.

```js
import { buildStateFromTemplate } from 'posterboy-image-generator'

const state = buildStateFromTemplate('social-post', {
  backgroundImageData: 'data:image/jpeg;base64,...',
  label: 'MUSIC',
  title: 'Summer Playlist 2025',
})
// state.canvasWidth === 1080, state.canvasHeight === 566
// state.texts[0].content === 'MUSIC'
// state.texts[1].content === 'Summer Playlist 2025'
```

The returned state can be passed as `initialState` to `ImageGenerator`.

### `generateFromTemplate(templateOrId, inputs)` (browser)

```js
import { generateFromTemplate } from 'posterboy-image-generator'

const blob = await generateFromTemplate('social-post', {
  backgroundImageData: 'data:image/jpeg;base64,...',
  title: 'My post',
})
const url = URL.createObjectURL(blob)
```

### `generateFromTemplate(templateOrId, inputs)` (server-side)

```js
import { generateFromTemplate } from 'posterboy-image-generator/node'
import { writeFileSync } from 'fs'

const png = await generateFromTemplate('social-post', {
  backgroundImageData: 'data:image/jpeg;base64,...',
  title: 'My post',
})
writeFileSync('output.png', png)
```

Requires `@resvg/resvg-js` to be installed (`npm install @resvg/resvg-js`).
