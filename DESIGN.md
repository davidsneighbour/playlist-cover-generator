# Design system — playlist cover generator

## Principles

* **Light, minimal, content-first.** The canvas is the product; chrome recedes.
* **Spatial clarity.** Generous whitespace, consistent 4- and 8-point grid spacing.
* **Direct manipulation.** Controls sit close to what they affect; feedback is immediate.

## Color palette

| Role | Hex | Tailwind token |
| --- | --- | --- |
| Page background | `#f9fafb` | `bg-gray-50` |
| Surface / card | `#ffffff` | `bg-white` |
| Border default | `#e5e7eb` | `border-gray-200` |
| Border hover | `#d1d5db` | `border-gray-300` |
| Text primary | `#111827` | `text-gray-900` |
| Text secondary | `#6b7280` | `text-gray-500` |
| Text muted | `#9ca3af` | `text-gray-400` |
| Accent / action | `#3b82f6` | `bg-blue-500` |
| Accent hover | `#2563eb` | `bg-blue-600` |
| Selection ring | `#3b82f6` | `ring-blue-400` |
| Danger / delete | `#dc2626` | `text-red-600` |
| Grid minor line | `#cbd5e1` | — |
| Grid major line | `#94a3b8` | — |

## Typography

* **UI font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
* **Section labels:** 11px, uppercase, 0.05em letter-spacing, `text-gray-500`
* **Body and labels:** 14px, `text-gray-700`
* **Button text:** 14px medium

## Spacing

All spacing uses multiples of 4px (Tailwind's default scale). Primary gaps between sections are `gap-4` (16px). Inner card padding is `p-3` (12px).

## Components

### Collapsible card

Each control group is a white card (`border border-gray-200 rounded-lg shadow-sm`) with a header (chevron + uppercase `text-xs font-semibold text-gray-500` title) and a collapsible body. The cards behave as an **accordion**: only one unpinned card is open at a time, and opening one collapses the previous. Each header has a **Pin** checkbox that keeps that card open regardless (exempt from auto-collapse), so several can stay open by pinning. Bodies animate with a short fade/slide (Headless UI `Transition`).

### Primary button

The `.btn-primary` class: `bg-blue-600` background, white text, `rounded-md`, 8px vertical padding. Hover darkens to `bg-blue-700`. Blue-600 is used (rather than the blue-500 accent) so the white label clears AA contrast.

### Secondary button

The `.btn-secondary` class: white background, `border-gray-200` stroke, `text-gray-700`. Hover fills `bg-gray-50`.

### Input

The `.input` class: `border border-gray-200 rounded-md px-2 py-1.5 text-sm`. Focus ring is `ring-2 ring-blue-400`.

### Icons

Icons are from [Lucide](https://lucide.dev) (`lucide-react`). They inherit the current text colour (`currentColor`) and use a consistent size: `h-4 w-4` (16px) inside labeled buttons, `h-3.5 w-3.5` (14px) for icon-only controls such as the layer-row actions. The `.btn-primary` and `.btn-secondary` classes are `inline-flex` with a `gap-1.5`, so an icon placed before the label aligns automatically. Icon-only buttons keep a `title` and `aria-label`; purely decorative icons are `aria-hidden`.

### Canvas

A `rounded-lg overflow-hidden shadow-md border border-gray-200` frame on a white background. Selection is shown with a blue dashed rectangle (`stroke="#3b82f6"` and `stroke-dasharray="4 2"`).

### Rulers

Optional 22px ruler strips on the top and left edges, on a `bg-gray-50` ground with a `#e5e7eb` baseline. Ticks reuse the grid colors (minor `#cbd5e1`); labels are 8px in `#9ca3af` (left-edge labels rotated `-90`). They are chrome only and reuse existing tokens, so they are never part of an export.

### Layers panel

The top control card is a front-to-back overview of every layer. Each row reuses the same selectable-row treatment as the per-type layer lists: a bordered `rounded` button (`border-gray-200 bg-white`, `hover:border-gray-300`) that turns to `border-blue-400 bg-blue-50` when its layer is selected, with a leading `h-3.5 w-3.5` Lucide icon. The background and color-overlay rows are always present; when empty or disabled they are muted (`text-gray-300` icon, `text-gray-400 italic` label). No new tokens.

### Context menu

A `fixed`, viewport-clamped white panel (`border border-gray-200 rounded-md shadow-lg`) opened by right-clicking a layer. Items are full-width left-aligned buttons with `hover:bg-gray-50`; the destructive item uses `text-red-600` with `hover:bg-red-50`.

## Layout

Two columns on large screens (`lg` and up): the square canvas (up to 600px) on the left and the controls on the right, which fill the remaining width. The canvas column is **sticky** (`lg:sticky lg:top-6`) so it stays visible while the taller controls column scrolls. Below `lg` the layout stacks into a single column (canvas on top, controls below).

## Motion

No decorative motion. Buttons use `transition-colors` for hover state only.

## Accessibility

* All interactive elements are focusable via keyboard; both each layer-list row's label and the layer's canvas element are buttons (`aria-pressed` reflects selection), so layers can be selected without a mouse (Enter/Space on the canvas element), then nudged with the arrow keys, removed with Delete, or deselected with Escape. Focused canvas layers show a `2px` blue (`#3b82f6`) `:focus-visible` outline.
* Icon-only buttons (reorder, duplicate, delete) carry an `aria-label`; the canvas is a labelled `role="group"`.
* A visually hidden (`sr-only`) `aria-live="polite"` region announces layer add, delete, duplicate, and undo/redo.
* Every input has a programmatic name: `NumberInput` ties its `<label>` to the field with `htmlFor`/`id`, and the inline sliders, selects, and colour pickers carry an `aria-label`.
* `title` elements on SVG text indicate the selected state for screen readers.

### Colour contrast (audited)

Measured against white using WCAG 2.x ratios:

* Text that conveys information passes AA: `text-gray-900` (17.7:1), `text-gray-700` (10.3:1), and `text-gray-500` (4.8:1, used for control labels).
* `text-gray-400` (`#9ca3af`) is **2.5:1** and does not meet AA. It is reserved for **non-essential, supplementary** hints and placeholders (for example "0 = off"); no information needed to operate the editor depends on it alone. Do not use it for primary labels or values.
* Primary buttons use **blue-600** (`#2563eb`): white text on it is 5.2:1 (AA). The lighter blue-500 (`#3b82f6`, 3.68:1) is used only for **non-text** accents — the selection and focus rings — which need just 3:1 (WCAG 1.4.11).
