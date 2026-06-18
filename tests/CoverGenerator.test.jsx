// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import axe from 'axe-core'
import CoverGenerator from '../src/components/CoverGenerator'

// jsdom lacks these; the editor observes its container and scrolls newly added
// cards into view. No-op them so the component can mount and run handlers.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
  // jsdom has no SVG layout engine; the selection box reads getBBox.
  if (!globalThis.SVGElement.prototype.getBBox) {
    globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 })
  }
})

afterEach(cleanup)

const textCount = (root) => root.querySelectorAll('[data-text-id]').length

// Open a collapsible card by its header, then run the add-text action.
function addText() {
  fireEvent.click(screen.getByRole('button', { name: /text layers/i }))
  fireEvent.click(screen.getByRole('button', { name: /add text/i }))
}

describe('CoverGenerator', () => {
  it('mounts and renders the canvas without a background', () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    expect(container.querySelector('svg[role="group"]')).not.toBeNull()
    expect(textCount(container)).toBe(0)
  })

  it('adds a text layer, then undoes and redoes it with the keyboard', () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    addText()
    expect(textCount(container)).toBe(1)

    // Cmd/Ctrl+Z undoes the add.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(textCount(container)).toBe(0)

    // Cmd/Ctrl+Shift+Z redoes it.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(textCount(container)).toBe(1)
  })

  it('selects the new text and deselects it on Escape', () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    addText()
    // The selection outline/handles are present while a layer is selected.
    expect(container.querySelector('[data-layer="selection"]')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('[data-layer="selection"]')).toBeNull()
  })

  it('ignores undo while a form field is focused', () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    addText()
    expect(textCount(container)).toBe(1)

    // Firing the shortcut from inside an editable control must not undo, so
    // native text editing keeps its own undo stack.
    const field = container.querySelector('input, textarea, select')
    expect(field).not.toBeNull()
    fireEvent.keyDown(field, { key: 'z', ctrlKey: true })
    expect(textCount(container)).toBe(1)
  })
})

// Helper: format axe violations into a readable failure message.
function formatViolations(violations) {
  return violations
    .map(v => `[${v.id}] ${v.description}\n  ${v.nodes.map(n => n.html).join('\n  ')}`)
    .join('\n\n')
}

// Helper: run axe on a container, throwing with a clear message on violations.
async function assertNoAxeViolations(container, options) {
  const results = await axe.run(container, options)
  if (results.violations.length > 0) {
    throw new Error(`axe violations:\n\n${formatViolations(results.violations)}`)
  }
}

describe('Accessibility (axe)', () => {
  it('has no axe violations in the default (empty) state', async () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with a text layer selected', async () => {
    const { container } = render(<CoverGenerator autoSave={false} />)
    addText()
    await assertNoAxeViolations(container)
  })
})
