# Improvement plan

A forward-looking plan for the playlist cover generator: tooling, structure, features, and polish. The deferred backlog in [todo.md](todo.md) is complete, so this document covers maturity gaps and growth, not unfinished initial work.

The project is well-architected: geometry stays in canvas units, the canvas is clean exportable SVG, and the pure logic is extracted into small modules under [src/lib/](src/lib/) with a matching test each. The opportunities below are maturity gaps, one structural risk, and feature extensions that fit the existing model.

Priority order reflects the current focus: tooling and CI hardening first.

## 1. Tooling and CI hardening (priority)

Cheap, high value, and currently absent.

| Gap | Action |
| --- | --- |
| No CI | Add a GitHub Actions workflow running `npm ci`, `npm test`, `npm run build`, and `npm run build:lib` on push and pull request. The repo has five AI-agent config files but no automation that catches a broken build. |
| No linter or formatter | Add ESLint (flat config) with `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`, plus Prettier. With 111 hook calls in one component, the hooks plugin alone will catch real dependency-array bugs. |
| No shipped types | Hand-write an `index.d.ts` for the `CoverGenerator` props and the state-object contract, and add a `"types"` field to package.json. The state shape is already documented in [AGENTS.md](AGENTS.md), so this is largely transcription. |
| No `engines` field | The README states Node 18+, but package.json does not enforce it. Add `"engines": { "node": ">=18" }`. |
| ~~No changelog~~ Done | A [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog format) now records the `0.1.0` work and carries an Unreleased section for ongoing changes. |

## 2. Test coverage gap

The pure-function tests are strong, but [src/components/CoverGenerator.jsx](src/components/CoverGenerator.jsx) (2356 lines) has no tests, and it holds the hardest-to-reason-about behavior.

Status: largely done.

* Done: component tests with `@testing-library/react` and jsdom ([tests/CoverGenerator.test.jsx](tests/CoverGenerator.test.jsx)) for add-text, keyboard undo and redo, Escape-to-deselect, and the form-field shortcut guard.
* Done: the export invariant is now guarded — `stripExportArtifacts` was extracted to [src/lib/export.js](src/lib/export.js) and unit-tested to assert the clone drops `[data-layer="grid"]` and `[data-layer="selection"]` while keeping the artwork. The form-field guard was likewise extracted to `isEditableTarget` in [src/lib/shortcuts.js](src/lib/shortcuts.js) and tested.
* Deferred to item 3: the `DEFAULT_STATE` < restored < shared < `initialState` precedence is still inline in the component with no clean seam. Extract it into a pure merge helper during the decomposition and test it directly then.

## 3. Decompose the large component

2356 lines and 111 hooks in one file is the main maintainability risk. The sub-components are already separable; extract them without changing behavior, behind the new CI and tests. In progress, one safe slice per commit.

* Done: `useHistoryState` moved to [src/hooks/useHistoryState.js](src/hooks/useHistoryState.js) and tested via `renderHook` (coalescing, discrete steps, redo-clearing). The initial-state precedence merge is now the pure, tested `mergeInitialState` in [src/lib/state.js](src/lib/state.js).
* Done: `useSvgDrag` moved to [src/hooks/useSvgDrag.js](src/hooks/useSvgDrag.js); its `snapValue` dependency is now the tested pure helper in [src/lib/grid.js](src/lib/grid.js).
* Done: the self-contained presentational leaves moved to their own files — [src/components/GridOverlay.jsx](src/components/GridOverlay.jsx), [src/components/Rulers.jsx](src/components/Rulers.jsx), [src/components/NumberInput.jsx](src/components/NumberInput.jsx) — with the shared constants (`CANVAS_SIZE`, `RULER`, `DUP_OFFSET`, `IS_MAC`) lifted to [src/lib/constants.js](src/lib/constants.js). The component is down from 2356 to ~2140 lines.
* Done: `HelpDialog` moved to [src/components/HelpDialog.jsx](src/components/HelpDialog.jsx) and `ContextMenu` to [src/components/ContextMenu.jsx](src/components/ContextMenu.jsx). The component is down to ~2045 lines (−311 from the original).
* Remaining (optional, lowest priority): the coupled canvas cluster (`SVGCanvas` with `TextElement`/`ImageElement`/`ShapeElement`/`ResizeHandles`/`GradientBackground`/`ColorOverlay`). This is the largest, most coupled slice and is purely organizational — the testability goal of this section is already met, so it can wait. Do it behind the component smoke test if pursued.
* Move the remaining export logic (PNG, SVG, batch, font embedding) toward [src/lib/export.js](src/lib/export.js), so the DOM-free parts become testable per section 2.

This is a refactor only and lands after the safety net, not before.

## 4. New features

Ordered by value-to-effort. All extend the documented state contract cleanly.

* ~~**Multi-line text with line-height**~~ Done — `content` accepts newlines, rendered one `<tspan>` per line with a `lineHeight` control (`textLines`/`lineHeightEm` in [src/lib/text.js](src/lib/text.js), tested).
* **Curved or arced text** — high visual payoff; renders as `<textPath>` and stays exportable SVG.
* ~~**Layer lock and visibility toggles**~~ Done — each real layer row in the Layers panel has eye and lock buttons setting per-layer `hidden`/`locked` flags; hidden layers drop out of the canvas and exports, locked layers can't be dragged, resized, nudged, or deleted. (Per-layer opacity for text/shape is still open — tracked as a GitHub issue.)
* **More shapes** — line, triangle or polygon, and a rounded-rect radius. The `x/y/width/height` model already generalizes.
* **More templates** — only three exist. Templates are pure data in [src/lib/templates.js](src/lib/templates.js); adding five to eight polished layouts is low risk and high perceived value.
* **Custom export sizes** — presets are 600, 1000, and 3000; allow an arbitrary square size for other platform specs.
* **Layer rotation** — text, image, and shape layers lack rotation; a single transform generalizes across all three.

## 5. Performance and robustness

In progress.

* Done: **render audit during drag**. The drag/select handlers passed down are all `useCallback`-stable and the drag commit updates layers immutably (non-dragged layers keep their references), so wrapping the canvas leaf views in `React.memo` lets unchanged layers bail out of re-render on every drag tick. Memoized `TextElement`, `ImageElement`, `ShapeElement`, `GradientBackground`, `ColorOverlay`, and `GridOverlay` (so the grid is not rebuilt mid-drag).
* Next: **large background in localStorage** — large data URLs already trigger the documented quota fallback that drops the image. Move the image blob to IndexedDB (keeping the small layout in localStorage) to avoid silently losing the background.
* **Large-canvas export** — 3000px rasterization runs on the main thread. Consider `OffscreenCanvas` or a worker for batch export so multi-image ZIPs do not freeze the UI.

## 6. Accessibility and UX polish

The foundation is strong (ARIA live region, keyboard layer selection, focus rings). Smaller wins:

* Wire the new `jsx-a11y` lint and an automated axe pass into a component test.
* Verify touch behavior: drag uses pointer events, but the icon-only layer-row buttons at `h-3.5 w-3.5` are below comfortable tap-target size on mobile.
* Add a visible saved or unsaved indicator for the 500ms auto-save debounce.

## Suggested sequencing

1. Foundation: CI, ESLint and Prettier, `engines`, and `index.d.ts`. Catches regressions before any other change.
2. Safety net: component and export tests.
3. Refactor: decompose the component behind that net.
4. Features: multi-line text, then curved text, then layer lock and visibility, then more templates.
