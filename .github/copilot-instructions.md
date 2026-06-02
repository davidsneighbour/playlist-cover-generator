# GitHub Copilot instructions

The full guidance for this repository lives in [AGENTS.md](../AGENTS.md). Read it for complete context. The essentials:

* React 19 with hooks only; JavaScript and JSX, with no TypeScript.
* Tailwind CSS 4 is configured CSS-first in [src/index.css](../src/index.css); there is no `tailwind.config.js`.
* The editor is one component, [src/components/CoverGenerator.jsx](../src/components/CoverGenerator.jsx). Keep geometry in canvas units (`CANVAS_SIZE` is 600) and convert to screen coordinates only at the edges.
* Reuse the `.btn-primary`, `.btn-secondary`, and `.input` classes and the `snapValue` helper instead of duplicating logic.
* The grid layer (`data-layer="grid"`) must never appear in PNG or SVG exports.
* In markdown, use sentence-case headings and `*` for bullets so files pass markdownlint.
