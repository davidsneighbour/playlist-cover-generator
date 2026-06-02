import { useState, useRef, useCallback, useEffect } from 'react'
import { reorder, bringToFront, sendToBack, displayIndexToArrayIndex } from '../lib/layers'
import { TEMPLATES, getTemplate, instantiateTemplate } from '../lib/templates'

const CANVAS_SIZE = 600

const DEFAULT_STATE = {
  backgroundImage: null,
  backgroundImageData: null,
  texts: [],
  grid: {
    enabled: false,
    spacing: 20,
    majorEvery: 5,
  },
  snapToGrid: true,
}

let nextId = 1

function snapValue(value, spacing, enabled) {
  if (!enabled) return value
  return Math.round(value / spacing) * spacing
}

const HISTORY_LIMIT = 50
const COALESCE_MS = 600

// Undo/redo history wrapper around a single state object. Discrete edits push a
// new entry; rapid edits that share a coalesceKey (dragging, typing in a field)
// collapse into one so a single undo reverts the whole gesture rather than one
// pixel or one keystroke at a time.
function useHistoryState(initial) {
  const [history, setHistory] = useState(() => ({
    past: [],
    present: initial,
    future: [],
  }))
  const lastKey = useRef(null)
  const lastTime = useRef(0)

  const commit = useCallback((patch, coalesceKey = null) => {
    const now = Date.now()
    const coalesce =
      coalesceKey != null &&
      coalesceKey === lastKey.current &&
      now - lastTime.current < COALESCE_MS
    lastKey.current = coalesceKey
    lastTime.current = now
    setHistory(h => {
      const present = typeof patch === 'function' ? patch(h.present) : { ...h.present, ...patch }
      if (present === h.present) return h
      if (coalesce) {
        // Same gesture continuing: replace present, keep the existing checkpoint.
        return { past: h.past, present, future: [] }
      }
      const past = h.past.length >= HISTORY_LIMIT ? h.past.slice(1) : h.past
      return { past: [...past, h.present], present, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    lastKey.current = null
    setHistory(h => {
      if (h.past.length === 0) return h
      const present = h.past[h.past.length - 1]
      return { past: h.past.slice(0, -1), present, future: [h.present, ...h.future] }
    })
  }, [])

  const redo = useCallback(() => {
    lastKey.current = null
    setHistory(h => {
      if (h.future.length === 0) return h
      const present = h.future[0]
      return { past: [...h.past, h.present], present, future: h.future.slice(1) }
    })
  }, [])

  return {
    state: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo,
    redo,
  }
}

function GridOverlay({ grid, size }) {
  if (!grid.enabled) return null

  const lines = []
  const { spacing, majorEvery } = grid

  for (let x = spacing; x < size; x += spacing) {
    const isMajor = majorEvery > 0 && (x / spacing) % majorEvery === 0
    lines.push(
      <line
        key={`vx${x}`}
        x1={x} y1={0} x2={x} y2={size}
        stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
        strokeWidth={isMajor ? 0.8 : 0.4}
        strokeOpacity={isMajor ? 0.8 : 0.5}
      />
    )
  }
  for (let y = spacing; y < size; y += spacing) {
    const isMajor = majorEvery > 0 && (y / spacing) % majorEvery === 0
    lines.push(
      <line
        key={`hy${y}`}
        x1={0} y1={y} x2={size} y2={y}
        stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
        strokeWidth={isMajor ? 0.8 : 0.4}
        strokeOpacity={isMajor ? 0.8 : 0.5}
      />
    )
  }

  return <g data-layer="grid" style={{ pointerEvents: 'none' }}>{lines}</g>
}

function TextElement({ text, selected, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
  const dragging = useRef(false)
  const startPos = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })
  const svgRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(text.id)
    dragging.current = true
    const svg = e.currentTarget.closest('svg')
    svgRef.current = svg
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    startPos.current = { mx: svgP.x, my: svgP.y, tx: text.x, ty: text.y }

    const onMove = (ev) => {
      if (!dragging.current) return
      const p = svg.createSVGPoint()
      p.x = ev.clientX
      p.y = ev.clientY
      const sp = p.matrixTransform(svg.getScreenCTM().inverse())
      const dx = sp.x - startPos.current.mx
      const dy = sp.y - startPos.current.my
      let nx = startPos.current.tx + dx
      let ny = startPos.current.ty + dy
      nx = snapValue(nx, gridSpacing, snapToGrid)
      ny = snapValue(ny, gridSpacing, snapToGrid)
      nx = Math.max(0, Math.min(canvasSize, nx))
      ny = Math.max(0, Math.min(canvasSize, ny))
      onDrag(text.id, nx, ny)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [text, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize])

  const fontStyle = []
  if (text.italic) fontStyle.push('italic')
  if (text.bold) fontStyle.push('bold')

  return (
    <text
      x={text.x}
      y={text.y}
      fontFamily={text.fontFamily}
      fontSize={text.fontSize}
      fill={text.color}
      fontWeight={text.bold ? 'bold' : 'normal'}
      fontStyle={text.italic ? 'italic' : 'normal'}
      textAnchor={text.anchor || 'start'}
      dominantBaseline="auto"
      style={{ cursor: 'move', userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      data-text-id={text.id}
    >
      {text.content}
      {selected && (
        <title>Selected: drag to move</title>
      )}
    </text>
  )
}

function SVGCanvas({ state, selectedTextId, onSelectText, onDragText, displaySize }) {
  const scale = displaySize / CANVAS_SIZE

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
      style={{ display: 'block', background: '#ffffff' }}
      onClick={(e) => {
        if (e.target.tagName === 'svg') onSelectText(null)
      }}
    >
      <defs>
        <clipPath id="canvas-clip">
          <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} />
        </clipPath>
      </defs>

      {state.backgroundImageData && (
        <image
          href={state.backgroundImageData}
          x={0}
          y={0}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#canvas-clip)"
          data-layer="background"
        />
      )}

      <GridOverlay grid={state.grid} size={CANVAS_SIZE} />

      {state.texts.map((text) => (
        <TextElement
          key={text.id}
          text={text}
          selected={text.id === selectedTextId}
          onSelect={onSelectText}
          onDrag={onDragText}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasSize={CANVAS_SIZE}
        />
      ))}

      {selectedTextId && state.texts.find(t => t.id === selectedTextId) && (() => {
        const t = state.texts.find(t => t.id === selectedTextId)
        const pad = 6
        const approxW = t.content.length * t.fontSize * 0.6
        const approxH = t.fontSize
        return (
          <rect
            x={t.x - pad}
            y={t.y - approxH - pad / 2}
            width={approxW + pad * 2}
            height={approxH + pad}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}
    </svg>
  )
}

export default function CoverGenerator({ initialState, onStateChange, className = '' }) {
  const { state, canUndo, canRedo, commit, undo, redo } = useHistoryState({
    ...DEFAULT_STATE,
    ...initialState,
  })
  const update = commit
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [displaySize, setDisplaySize] = useState(CANVAS_SIZE)
  const [dragOverArrayIndex, setDragOverArrayIndex] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const jsonInputRef = useRef(null)
  const dragIndexRef = useRef(null)

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        setDisplaySize(Math.min(w, CANVAS_SIZE))
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Notify the host of state changes, skipping the initial mount.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onStateChange?.(state)
  }, [state, onStateChange])

  // Drop a selection that no longer exists (e.g. after an undo removes its text).
  useEffect(() => {
    if (selectedTextId != null && !state.texts.some(t => t.id === selectedTextId)) {
      setSelectedTextId(null)
    }
  }, [state.texts, selectedTextId])

  // Keyboard shortcuts: Cmd/Ctrl+Z to undo, +Shift (or Ctrl+Y) to redo.
  // Ignored while typing in a field so native text undo still works there.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Image upload
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      update({ backgroundImage: file.name, backgroundImageData: ev.target.result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [update])

  // Text management
  const addText = useCallback(() => {
    const id = nextId++
    update(prev => ({
      ...prev,
      texts: [...prev.texts, {
        id,
        content: 'New text',
        x: snapValue(CANVAS_SIZE / 2, prev.grid.spacing, prev.snapToGrid),
        y: snapValue(CANVAS_SIZE / 2, prev.grid.spacing, prev.snapToGrid),
        fontSize: 48,
        fontFamily: 'sans-serif',
        color: '#ffffff',
        bold: false,
        italic: false,
        anchor: 'middle',
      }]
    }))
    setSelectedTextId(id)
  }, [update])

  // Apply a predefined template. The current background image is kept; text and
  // grid are replaced. Goes through history, so it is a single undoable step.
  const handleApplyTemplate = useCallback((templateId) => {
    const template = getTemplate(templateId)
    if (!template) return
    update(prev => instantiateTemplate(template, prev, () => nextId++))
    setSelectedTextId(null)
  }, [update])

  const updateText = useCallback((id, patch, coalesceKey) => {
    update(prev => ({
      ...prev,
      texts: prev.texts.map(t => t.id === id ? { ...t, ...patch } : t)
    }), coalesceKey)
  }, [update])

  const deleteText = useCallback((id) => {
    update(prev => ({ ...prev, texts: prev.texts.filter(t => t.id !== id) }))
    setSelectedTextId(null)
  }, [update])

  const handleDragText = useCallback((id, x, y) => {
    update(prev => ({
      ...prev,
      texts: prev.texts.map(t => t.id === id ? { ...t, x, y } : t)
    }), `drag-${id}`)
  }, [update])

  // Layer z-order. Each reorder is a discrete, undoable step; a no-op returns
  // the previous state unchanged so it never adds an empty history entry.
  const handleReorderLayer = useCallback((fromIndex, toIndex) => {
    update(prev => {
      const next = reorder(prev.texts, fromIndex, toIndex)
      return next === prev.texts ? prev : { ...prev, texts: next }
    })
  }, [update])

  const handleBringToFront = useCallback((id) => {
    update(prev => {
      const next = bringToFront(prev.texts, id)
      return next === prev.texts ? prev : { ...prev, texts: next }
    })
  }, [update])

  const handleSendToBack = useCallback((id) => {
    update(prev => {
      const next = sendToBack(prev.texts, id)
      return next === prev.texts ? prev : { ...prev, texts: next }
    })
  }, [update])

  // Grid
  const updateGrid = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, grid: { ...prev.grid, ...patch } }), coalesceKey)
  }, [update])

  // Export PNG
  const exportPNG = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    clone.querySelectorAll('[data-layer="grid"]').forEach(el => el.remove())
    clone.setAttribute('width', CANVAS_SIZE)
    clone.setAttribute('height', CANVAS_SIZE)

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = CANVAS_SIZE * scale
      canvas.height = CANVAS_SIZE * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'cover.png'
        a.click()
      }, 'image/png')
    }
    img.src = url
  }, [])

  // Export SVG
  const exportSVG = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    clone.querySelectorAll('[data-layer="grid"]').forEach(el => el.remove())
    clone.querySelectorAll('[data-text-id]').forEach(el => {
      el.style.cursor = ''
      el.style.userSelect = ''
    })
    clone.setAttribute('width', CANVAS_SIZE)
    clone.setAttribute('height', CANVAS_SIZE)

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.svg'
    a.click()
  }, [])

  // Export JSON
  const exportJSON = useCallback(() => {
    const { backgroundImageData, ...exportState } = state
    const json = JSON.stringify(exportState, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover-state.json'
    a.click()
  }, [state])

  // Import JSON
  const handleJSONImport = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        update(prev => ({
          ...DEFAULT_STATE,
          ...imported,
          backgroundImageData: prev.backgroundImageData,
        }))
        setSelectedTextId(null)
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [update])

  const selectedText = state.texts.find(t => t.id === selectedTextId)

  return (
    <div className={`flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-gray-50 ${className}`}>
      {/* Canvas */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div
          ref={containerRef}
          className="w-full max-w-[600px] rounded-lg overflow-hidden shadow-md border border-gray-200"
          style={{ aspectRatio: '1/1' }}
        >
          <SVGCanvas
            state={state}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onDragText={handleDragText}
            displaySize={displaySize}
          />
        </div>
        <p className="text-xs text-gray-400">{CANVAS_SIZE}×{CANVAS_SIZE}px canvas · click text to select · drag to move · Ctrl+Z to undo</p>
      </div>

      {/* Controls */}
      <div className="w-full lg:w-72 flex flex-col gap-4">

        {/* History */}
        <Section title="History">
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
          </div>
        </Section>

        {/* Template */}
        <Section title="Template">
          <select
            className="input w-full"
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
          >
            <option value="">Select a template…</option>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            className="w-full btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedTemplate}
            onClick={() => handleApplyTemplate(selectedTemplate)}
          >
            Apply template
          </button>
          <p className="text-[11px] text-gray-400 leading-tight">Replaces text layers and grid; keeps your image. Undo with Ctrl+Z.</p>
        </Section>

        {/* Background Image */}
        <Section title="Background Image">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            className="w-full btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            {state.backgroundImage ? `Change image (${state.backgroundImage})` : 'Upload image'}
          </button>
        </Section>

        {/* Grid */}
        <Section title="Grid">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.grid.enabled} onChange={e => updateGrid({ enabled: e.target.checked })} className="accent-blue-500" />
            Show grid
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.snapToGrid} onChange={e => update({ snapToGrid: e.target.checked })} className="accent-blue-500" />
            Snap to grid
          </label>
          {state.grid.enabled && (
            <>
              <NumberInput label="Spacing (px)" value={state.grid.spacing} min={5} max={100} onChange={v => updateGrid({ spacing: v }, 'grid-spacing')} />
              <NumberInput label="Major line every N" value={state.grid.majorEvery} min={0} max={20} onChange={v => updateGrid({ majorEvery: v }, 'grid-major')} hint="0 = off" />
            </>
          )}
        </Section>

        {/* Text Layers */}
        <Section title="Text Layers">
          <button className="w-full btn-primary" onClick={addText}>+ Add text</button>
          {state.texts.length === 0 && <p className="text-xs text-gray-400 text-center py-1">No text layers yet</p>}
          {state.texts.length > 1 && (
            <p className="text-[11px] text-gray-400 leading-tight">Drag to reorder · top of list is front</p>
          )}
          {[...state.texts].reverse().map((t, dispIdx) => {
            const arrayIndex = displayIndexToArrayIndex(state.texts.length, dispIdx)
            const isTop = arrayIndex === state.texts.length - 1
            const isBottom = arrayIndex === 0
            const selected = t.id === selectedTextId
            return (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => { dragIndexRef.current = arrayIndex; e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={(e) => { e.preventDefault(); if (dragOverArrayIndex !== arrayIndex) setDragOverArrayIndex(arrayIndex) }}
                onDragLeave={() => setDragOverArrayIndex(prev => (prev === arrayIndex ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndexRef.current != null) handleReorderLayer(dragIndexRef.current, arrayIndex)
                  dragIndexRef.current = null
                  setDragOverArrayIndex(null)
                }}
                onDragEnd={() => { dragIndexRef.current = null; setDragOverArrayIndex(null) }}
                className={`rounded border p-2 cursor-pointer text-sm transition-colors ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'} ${dragOverArrayIndex === arrayIndex ? 'ring-2 ring-blue-300' : ''}`}
                onClick={() => setSelectedTextId(selected ? null : t.id)}
              >
                <div className="flex items-center gap-1">
                  <span className="text-gray-300 select-none cursor-grab" title="Drag to reorder" aria-hidden="true">⠿</span>
                  <span className="truncate flex-1" style={{ fontFamily: t.fontFamily, color: t.color !== '#ffffff' ? t.color : '#374151', fontWeight: t.bold ? 'bold' : 'normal', fontStyle: t.italic ? 'italic' : 'normal' }}>
                    {t.content || '(empty)'}
                  </span>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Bring to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleBringToFront(t.id) }}>⤒</button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Send to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleSendToBack(t.id) }}>⤓</button>
                  <button className="text-gray-400 hover:text-red-500 text-xs px-1" title="Delete" onClick={(e) => { e.stopPropagation(); deleteText(t.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </Section>

        {/* Selected Text Properties */}
        {selectedText && (
          <Section title="Text Properties">
            <label className="block text-xs text-gray-500 mb-1">Content</label>
            <input
              className="input w-full"
              value={selectedText.content}
              onChange={e => updateText(selectedText.id, { content: e.target.value }, `content-${selectedText.id}`)}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Font</label>
                <select
                  className="input w-full"
                  value={selectedText.fontFamily}
                  onChange={e => updateText(selectedText.id, { fontFamily: e.target.value })}
                >
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Size</label>
                <input
                  type="number"
                  className="input w-full"
                  value={selectedText.fontSize}
                  min={8} max={200}
                  onChange={e => updateText(selectedText.id, { fontSize: Number(e.target.value) }, `size-${selectedText.id}`)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color</label>
                <input
                  type="color"
                  className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                  value={selectedText.color}
                  onChange={e => updateText(selectedText.id, { color: e.target.value }, `color-${selectedText.id}`)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Anchor</label>
                <select
                  className="input w-full"
                  value={selectedText.anchor}
                  onChange={e => updateText(selectedText.id, { anchor: e.target.value })}
                >
                  <option value="start">Left</option>
                  <option value="middle">Center</option>
                  <option value="end">Right</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedText.bold} onChange={e => updateText(selectedText.id, { bold: e.target.checked })} className="accent-blue-500" />
                Bold
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedText.italic} onChange={e => updateText(selectedText.id, { italic: e.target.checked })} className="accent-blue-500" />
                Italic
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumberInput label="X position" value={selectedText.x} min={0} max={CANVAS_SIZE} onChange={v => updateText(selectedText.id, { x: v }, `x-${selectedText.id}`)} />
              <NumberInput label="Y position" value={selectedText.y} min={0} max={CANVAS_SIZE} onChange={v => updateText(selectedText.id, { y: v }, `y-${selectedText.id}`)} />
            </div>
          </Section>
        )}

        {/* Export / Import */}
        <Section title="Export & Import">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary text-sm" onClick={exportPNG}>Export PNG</button>
            <button className="btn-secondary text-sm" onClick={exportSVG}>Export SVG</button>
          </div>
          <button className="w-full btn-secondary text-sm" onClick={exportJSON}>Save JSON state</button>
          <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJSONImport} />
          <button className="w-full btn-secondary text-sm" onClick={() => jsonInputRef.current?.click()}>Load JSON state</button>
        </Section>
      </div>
    </div>
  )
}

const FONTS = [
  'sans-serif',
  'serif',
  'monospace',
  'Georgia',
  'Trebuchet MS',
  'Arial',
  'Verdana',
  'Impact',
  'Times New Roman',
  'Courier New',
]

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

function NumberInput({ label, value, min, max, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}{hint && <span className="text-gray-400 ml-1">({hint})</span>}</label>
      <input
        type="number"
        className="input w-full"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}
