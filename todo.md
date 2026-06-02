# Future features

Items deferred from the initial implementation.

## Issues

* [ ] **Image dragging** - it is only possible to drag the background image so overlay goes to the right and down, not to the left and up if the width or height is larger than the canvas (or the image is dragged to the corners). Positioning of the image should be possible in all directions around the canvas.
* [ ] **Image resizing** - on load the image should cover the canvas, not being resized very small. Depending on the aspect ratio of the image it should be resized to fit by height or width, or both if the aspect ratio is the same as the canvas. After that it should be possible to resize the image by dragging its corners, and to maintain the aspect ratio by dragging while holding Shift key.
* [ ] **Image resizing** - add percentage based slider to resize without entering pixel values, and to show the current size as a percentage of the original image dimensions. keep aspect ratio by default or not, depending on a checkbox or a toggle switch.
* [x] **Text properties** - are shown below all cards, instead of inside the text properties card. They should be moved inside the text properties card, and the card should be expanded by default when a text layer is selected or added. **Fixed:** adding a layer (text/image/shape) now selects it and scrolls its properties form into view. (If you also want the Text Properties card physically moved next to Text Layers, say so — left as-is for now.)
* [x] **Blue selection lines are exported** - when a layer is selected (shape, image, etc) then we see blue selection lines. Those lines seem to be exported as part of the image (PNG) which is not expected. **Fixed:** selection outlines are tagged `data-layer="selection"` and stripped from PNG and SVG export.
* [x] **Text selection lines are not properly positioned** - the blue selection lines for text layers are not properly positioned, they are shifted to the right and down compared to the text. The exported text is in the proper position when the selection lines are not visible (the text is unselected before export) **Fixed:** the box now uses the text node's real `getBBox()`, so it matches the text at any anchor, font, or weight.
* [ ] **SVG export does not show Google font** - when exporting as SVG the Google font is not embedded in the file, so it falls back to a default font. The SVG export should include the Google font so that it looks the same as in the editor. DO NOT FIX THAT YET WHEN ASKED TO SELECT ANY ITEM TO FIX.
* [ ] **Font selection usability** - the font selection dropdown should show the font names in their respective fonts, not the default font
* [ ] **Font adding usability** - nothing happens when adding a font. Adding the font itself works nicely, but assume we don't know a fonts name and type just something, I would expect some form of preselection in the dropdown that shows me available fonts while I am typing.
* [x] **Adding text adds white on white** - the system should use a color that contrasts with the current background when adding a new text layer so we see the layer. **Fixed:** new text picks dark or light by sampling the background's average luminance (white canvas when no image). Helpers in [src/lib/color.js](src/lib/color.js), covered by tests.


## Medium priority

* [x] **Multiple image layers** — done. Add image layers (logos, overlays) over the background; each has opacity, a CSS blend mode, size, and position, is draggable with snap, and supports bring-to-front / send-to-back. Helpers in [src/lib/images.js](src/lib/images.js), covered by tests; z-order reuses [src/lib/layers.js](src/lib/layers.js).
* [x] **Shape primitives** — done. Add rectangles and circles (ellipses) with configurable fill, stroke color/width, and opacity; draggable with snap and reorderable. Helpers in [src/lib/shapes.js](src/lib/shapes.js), covered by tests.
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
