# Design system — playlist cover generator

## Principles

* **Light, minimal, content-first.** The canvas is the product; chrome recedes.
* **Spatial clarity.** Generous whitespace, consistent 4- and 8-point grid spacing.
* **Direct manipulation.** Controls sit close to what they affect; feedback is immediate.

## Color palette

| Role | Hex | Tailwind token |
|---|---|---|
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

### Section card

A white card with `border border-gray-200 rounded-lg p-3 shadow-sm`. The title is an uppercase label at `text-xs font-semibold text-gray-500`.

### Primary button

The `.btn-primary` class: `bg-blue-500` background, white text, `rounded-md`, 8px vertical padding. Hover darkens to `bg-blue-600`.

### Secondary button

The `.btn-secondary` class: white background, `border-gray-200` stroke, `text-gray-700`. Hover fills `bg-gray-50`.

### Input

The `.input` class: `border border-gray-200 rounded-md px-2 py-1.5 text-sm`. Focus ring is `ring-2 ring-blue-400`.

### Canvas

A `rounded-lg overflow-hidden shadow-md border border-gray-200` frame on a white background. Selection is shown with a blue dashed rectangle (`stroke="#3b82f6"` and `stroke-dasharray="4 2"`).

## Layout

Two columns on large screens: the canvas (flexible, max 600px square) on the left, the controls panel (fixed 288px) on the right. A single column on smaller screens.

## Motion

No decorative motion. Buttons use `transition-colors` for hover state only.

## Accessibility

* All interactive elements are focusable via keyboard.
* Color contrast: action blue on white passes AA at 14px.
* `title` elements on SVG text indicate the selected state for screen readers.
