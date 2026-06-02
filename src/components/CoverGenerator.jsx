import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { reorder, bringToFront, sendToBack, displayIndexToArrayIndex } from '../lib/layers'
import { TEMPLATES, getTemplate, instantiateTemplate } from '../lib/templates'
import { textStrokeAttrs, textShadowFilter } from '../lib/text'
import { BUILTIN_FONTS, googleFontCssUrl, parseFontFaces, buildFontFaceRule, addFont, googleFontsListUrl, parseFontFamilies, filterFontNames } from '../lib/fonts'
import { BLEND_MODES, createImageLayer, clampOpacity, centeredPosition, coverDimensions, scaleDimensions, dimensionPercent, aspectHeight, aspectWidth, offCanvasBounds, resizeFromCorner } from '../lib/images'
import { SHAPE_TYPES, createShape, ellipseGeometry } from '../lib/shapes'
import { averageRgb, pickContrastColor } from '../lib/color'
import { isOpen as isCardOpen, toggleOpen, togglePin, openCard } from '../lib/accordion'
import { AccordionContext, CollapsibleCard } from './Accordion'

const CANVAS_SIZE = 600

// Optional Google Fonts API key for the font-search typeahead. Read from the
// Vite env by default; a host embedding the component can pass its own.
const ENV_GOOGLE_FONTS_API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY

const DEFAULT_STATE = {
  backgroundImage: null,
  backgroundImageData: null,
  texts: [],
  images: [],
  shapes: [],
  grid: {
    enabled: false,
    spacing: 20,
    majorEvery: 5,
  },
  snapToGrid: true,
  fonts: [],
}

let nextId = 1

// Base64-encode an ArrayBuffer (for inlining font files as data URIs).
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

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

// Shared SVG dragging. Returns an onMouseDown handler that converts pointer
// movement into snapped, clamped canvas coordinates. getAnchor() reads the
// element's position at drag start; onMove(nx, ny) receives the new position;
// onStart() runs once on press (used to select).
function useSvgDrag({ getAnchor, onMove, onStart, snapToGrid, gridSpacing, canvasSize, bounds }) {
  const dragging = useRef(false)
  const start = useRef({ mx: 0, my: 0, ax: 0, ay: 0 })

  return useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    onStart?.()
    dragging.current = true
    const svg = e.currentTarget.closest('svg')
    const toSvg = (clientX, clientY) => {
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      return p.matrixTransform(svg.getScreenCTM().inverse())
    }
    const sp = toSvg(e.clientX, e.clientY)
    const anchor = getAnchor()
    start.current = { mx: sp.x, my: sp.y, ax: anchor.x, ay: anchor.y }

    const onMouseMove = (ev) => {
      if (!dragging.current) return
      const m = toSvg(ev.clientX, ev.clientY)
      let nx = start.current.ax + (m.x - start.current.mx)
      let ny = start.current.ay + (m.y - start.current.my)
      nx = snapValue(nx, gridSpacing, snapToGrid)
      ny = snapValue(ny, gridSpacing, snapToGrid)
      const minX = bounds ? bounds.minX : 0
      const minY = bounds ? bounds.minY : 0
      const maxX = bounds ? bounds.maxX : canvasSize
      const maxY = bounds ? bounds.maxY : canvasSize
      nx = Math.max(minX, Math.min(maxX, nx))
      ny = Math.max(minY, Math.min(maxY, ny))
      onMove(nx, ny)
    }
    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [getAnchor, onMove, onStart, snapToGrid, gridSpacing, canvasSize, bounds])
}

function TextElement({ text, selected, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: text.x, y: text.y }),
    onMove: (nx, ny) => onDrag(text.id, nx, ny),
    onStart: () => onSelect(text.id),
    snapToGrid, gridSpacing, canvasSize,
  })

  const shadow = textShadowFilter(text)

  return (
    <text
      x={text.x}
      y={text.y}
      fontFamily={text.fontFamily}
      fontSize={text.fontSize}
      fill={text.color}
      {...textStrokeAttrs(text)}
      filter={shadow ? `url(#${shadow.id})` : undefined}
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

function ImageElement({ image, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: image.x, y: image.y }),
    onMove: (nx, ny) => onDrag(image.id, nx, ny),
    onStart: () => onSelect(image.id),
    snapToGrid, gridSpacing, canvasSize,
    bounds: offCanvasBounds(image.width, image.height, canvasSize),
  })

  if (!image.data) return null

  return (
    <image
      href={image.data}
      x={image.x}
      y={image.y}
      width={image.width}
      height={image.height}
      opacity={image.opacity}
      preserveAspectRatio="none"
      style={{ cursor: 'move', mixBlendMode: image.blendMode !== 'normal' ? image.blendMode : undefined }}
      onMouseDown={handleMouseDown}
      data-image-id={image.id}
    />
  )
}

// Corner handles for resizing the selected image. The opposite corner stays
// fixed; holding Shift locks the aspect ratio. Tagged via the wrapping group so
// exports strip them.
function ResizeHandles({ box, ratio, onResize }) {
  const SIZE = 12
  const corners = [
    { key: 'tl', x: box.x, y: box.y, fx: box.x + box.width, fy: box.y + box.height, cursor: 'nwse-resize' },
    { key: 'tr', x: box.x + box.width, y: box.y, fx: box.x, fy: box.y + box.height, cursor: 'nesw-resize' },
    { key: 'bl', x: box.x, y: box.y + box.height, fx: box.x + box.width, fy: box.y, cursor: 'nesw-resize' },
    { key: 'br', x: box.x + box.width, y: box.y + box.height, fx: box.x, fy: box.y, cursor: 'nwse-resize' },
  ]
  const startResize = (e, corner) => {
    e.preventDefault()
    e.stopPropagation()
    const svg = e.currentTarget.closest('svg')
    const toSvg = (clientX, clientY) => {
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      return p.matrixTransform(svg.getScreenCTM().inverse())
    }
    const onMove = (ev) => {
      const m = toSvg(ev.clientX, ev.clientY)
      onResize(resizeFromCorner(corner.fx, corner.fy, m.x, m.y, { ratio, lockAspect: ev.shiftKey }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  return corners.map(c => (
    <rect
      key={c.key}
      x={c.x - SIZE / 2}
      y={c.y - SIZE / 2}
      width={SIZE}
      height={SIZE}
      fill="#ffffff"
      stroke="#3b82f6"
      strokeWidth={1.5}
      style={{ cursor: c.cursor }}
      onMouseDown={e => startResize(e, c)}
    />
  ))
}

function ShapeElement({ shape, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: shape.x, y: shape.y }),
    onMove: (nx, ny) => onDrag(shape.id, nx, ny),
    onStart: () => onSelect(shape.id),
    snapToGrid, gridSpacing, canvasSize,
    bounds: offCanvasBounds(shape.width, shape.height, canvasSize),
  })

  const common = {
    fill: shape.fill,
    stroke: shape.strokeWidth > 0 ? shape.stroke : 'none',
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    style: { cursor: 'move' },
    onMouseDown: handleMouseDown,
    'data-shape-id': shape.id,
  }

  if (shape.type === 'circle') {
    const g = ellipseGeometry(shape)
    return <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />
  }
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...common} />
}

function SVGCanvas({ state, selectedTextId, selectedImageId, selectedShapeId, onSelectText, onSelectImage, onSelectShape, onDragText, onDragImage, onDragShape, onResizeImage, displaySize }) {
  const svgRef = useRef(null)
  const [textBox, setTextBox] = useState(null)

  // Measure the selected text's real bounds (accounts for anchor, font, and
  // weight) instead of approximating, so the outline lines up exactly. Runs in
  // SVG user space, so it is independent of the on-screen scale.
  useLayoutEffect(() => {
    if (!selectedTextId || !svgRef.current) { setTextBox(null); return }
    const node = svgRef.current.querySelector(`[data-text-id="${selectedTextId}"]`)
    if (!node) { setTextBox(null); return }
    const b = node.getBBox()
    setTextBox({ x: b.x, y: b.y, width: b.width, height: b.height })
  }, [selectedTextId, state.texts])

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
      style={{ display: 'block', background: '#ffffff' }}
      onClick={(e) => {
        if (e.target.tagName === 'svg') {
          onSelectText(null)
          onSelectImage(null)
          onSelectShape(null)
        }
      }}
    >
      <defs>
        <clipPath id="canvas-clip">
          <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} />
        </clipPath>
        {state.texts.map(t => {
          const s = textShadowFilter(t)
          if (!s) return null
          return (
            <filter key={s.id} id={s.id} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={s.dx} dy={s.dy} stdDeviation={s.stdDeviation} floodColor={s.color} floodOpacity="1" />
            </filter>
          )
        })}
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

      {(state.images || []).map((image) => (
        <ImageElement
          key={image.id}
          image={image}
          selected={image.id === selectedImageId}
          onSelect={onSelectImage}
          onDrag={onDragImage}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasSize={CANVAS_SIZE}
        />
      ))}

      {(state.shapes || []).map((shape) => (
        <ShapeElement
          key={shape.id}
          shape={shape}
          onSelect={onSelectShape}
          onDrag={onDragShape}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasSize={CANVAS_SIZE}
        />
      ))}

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

      {selectedImageId && (state.images || []).find(i => i.id === selectedImageId) && (() => {
        const img = state.images.find(i => i.id === selectedImageId)
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : img.width / img.height
        return (
          <g data-layer="selection">
            <rect
              x={img.x}
              y={img.y}
              width={img.width}
              height={img.height}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
            <ResizeHandles box={img} ratio={ratio} onResize={(patch) => onResizeImage(img.id, patch)} />
          </g>
        )
      })()}

      {selectedShapeId && (state.shapes || []).find(s => s.id === selectedShapeId) && (() => {
        const shape = state.shapes.find(s => s.id === selectedShapeId)
        return (
          <rect
            data-layer="selection"
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}

      {textBox && selectedTextId && state.texts.some(t => t.id === selectedTextId) && (() => {
        const pad = 4
        return (
          <rect
            data-layer="selection"
            x={textBox.x - pad}
            y={textBox.y - pad}
            width={textBox.width + pad * 2}
            height={textBox.height + pad * 2}
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

export default function CoverGenerator({ initialState, onStateChange, className = '', googleFontsApiKey = ENV_GOOGLE_FONTS_API_KEY }) {
  const { state, canUndo, canRedo, commit, undo, redo } = useHistoryState({
    ...DEFAULT_STATE,
    ...initialState,
  })
  const update = commit
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [selectedShapeId, setSelectedShapeId] = useState(null)
  const [displaySize, setDisplaySize] = useState(CANVAS_SIZE)
  const [dragOverArrayIndex, setDragOverArrayIndex] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customFontInput, setCustomFontInput] = useState('')
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const jsonInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const dragIndexRef = useRef(null)
  const bgColorRef = useRef({ r: 255, g: 255, b: 255 })

  // Accordion: one unpinned control card open at a time; pinned cards stay open.
  const [accordion, setAccordion] = useState({ openId: 'background', pinned: [] })
  const accToggleOpen = useCallback((id) => setAccordion(s => toggleOpen(s, id)), [])
  const accTogglePin = useCallback((id) => setAccordion(s => togglePin(s, id)), [])
  const accOpenCard = useCallback((id) => setAccordion(s => openCard(s, id)), [])

  // Only one layer (text, image, or shape) is selected at a time. Selecting one
  // also opens its properties card so its controls are visible.
  const selectText = useCallback((id) => { setSelectedTextId(id); setSelectedImageId(null); setSelectedShapeId(null); if (id != null) accOpenCard('props-text') }, [accOpenCard])
  const selectImage = useCallback((id) => { setSelectedImageId(id); setSelectedTextId(null); setSelectedShapeId(null); if (id != null) accOpenCard('props-image') }, [accOpenCard])
  const selectShape = useCallback((id) => { setSelectedShapeId(id); setSelectedTextId(null); setSelectedImageId(null); if (id != null) accOpenCard('props-shape') }, [accOpenCard])

  // After adding a layer, scroll its freshly shown properties card into view.
  const [scrollTo, setScrollTo] = useState(null)
  useEffect(() => {
    if (!scrollTo) return
    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setScrollTo(null)
  }, [scrollTo])

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

  // Drop a selection that no longer exists (e.g. after an undo removes its layer).
  useEffect(() => {
    if (selectedTextId != null && !state.texts.some(t => t.id === selectedTextId)) {
      setSelectedTextId(null)
    }
  }, [state.texts, selectedTextId])

  useEffect(() => {
    if (selectedImageId != null && !(state.images || []).some(i => i.id === selectedImageId)) {
      setSelectedImageId(null)
    }
  }, [state.images, selectedImageId])

  useEffect(() => {
    if (selectedShapeId != null && !(state.shapes || []).some(s => s.id === selectedShapeId)) {
      setSelectedShapeId(null)
    }
  }, [state.shapes, selectedShapeId])

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

  // Load each custom (Google) font into the document so the live canvas can
  // render it. Idempotent: a <link> is injected once per family. Re-runs when
  // the font list changes (add, JSON import, undo/redo).
  useEffect(() => {
    for (const family of state.fonts || []) {
      const id = 'gf-' + family.replace(/\s+/g, '-').toLowerCase()
      if (document.getElementById(id)) continue
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = googleFontCssUrl(family)
      document.head.appendChild(link)
    }
  }, [state.fonts])

  // Sample the background image's average color so a new text layer can pick a
  // contrasting default. Falls back to white (the empty canvas) when no image.
  useEffect(() => {
    if (!state.backgroundImageData) { bgColorRef.current = { r: 255, g: 255, b: 255 }; return }
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 16
      c.height = 16
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, 16, 16)
      try {
        bgColorRef.current = averageRgb(ctx.getImageData(0, 0, 16, 16).data)
      } catch {
        bgColorRef.current = { r: 255, g: 255, b: 255 }
      }
    }
    img.src = state.backgroundImageData
  }, [state.backgroundImageData])

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
        color: pickContrastColor(bgColorRef.current),
        bold: false,
        italic: false,
        anchor: 'middle',
        stroke: '#000000',
        strokeWidth: 0,
        shadow: null,
      }]
    }))
    selectText(id)
    setScrollTo('props-text')
  }, [update, selectText])

  // Add a Google font by name to the picker (de-duplicated). The injection
  // effect loads it; embedding on export makes it portable.
  const handleAddFont = useCallback((name) => {
    update(prev => {
      const next = addFont(prev.fonts || [], name)
      return next === (prev.fonts || []) ? prev : { ...prev, fonts: next }
    })
    setCustomFontInput('')
  }, [update])

  // Lazily fetch the Google Fonts catalog once (for the typeahead) when a key is
  // configured. Filtering happens client-side; failures degrade to no suggestions.
  const [googleFonts, setGoogleFonts] = useState(null)
  const googleFontsLoading = useRef(false)
  const ensureFontCatalog = useCallback(() => {
    if (googleFonts !== null || googleFontsLoading.current || !googleFontsApiKey) return
    googleFontsLoading.current = true
    fetch(googleFontsListUrl(googleFontsApiKey))
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => setGoogleFonts(parseFontFamilies(json)))
      .catch(() => setGoogleFonts([]))
  }, [googleFonts, googleFontsApiKey])

  const fontSuggestions = useMemo(() => {
    if (!googleFonts || googleFonts.length === 0) return []
    const have = new Set([...BUILTIN_FONTS, ...(state.fonts || [])])
    return filterFontNames(googleFonts, customFontInput, 8).filter(n => !have.has(n))
  }, [googleFonts, customFontInput, state.fonts])

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

  // Image layers (logos, overlays). Stacked over the background; array order is
  // paint order, so the generic z-order helpers from layers.js apply.
  const addImageLayer = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target.result
      const probe = new Image()
      probe.onload = () => {
        const id = nextId++
        const { width, height } = coverDimensions(probe.naturalWidth, probe.naturalHeight, CANVAS_SIZE)
        const { x, y } = centeredPosition(CANVAS_SIZE, width, height)
        update(prev => ({
          ...prev,
          images: [...(prev.images || []), createImageLayer(id, { name: file.name, data, width, height, x, y, naturalWidth: probe.naturalWidth, naturalHeight: probe.naturalHeight })],
        }))
        selectImage(id)
        setScrollTo('props-image')
      }
      probe.src = data
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [update, selectImage])

  const updateImage = useCallback((id, patch, coalesceKey) => {
    update(prev => ({
      ...prev,
      images: (prev.images || []).map(i => i.id === id ? { ...i, ...patch } : i),
    }), coalesceKey)
  }, [update])

  const deleteImage = useCallback((id) => {
    update(prev => ({ ...prev, images: (prev.images || []).filter(i => i.id !== id) }))
    setSelectedImageId(null)
  }, [update])

  const handleDragImage = useCallback((id, x, y) => {
    update(prev => ({
      ...prev,
      images: (prev.images || []).map(i => i.id === id ? { ...i, x, y } : i),
    }), `img-drag-${id}`)
  }, [update])

  const handleResizeImage = useCallback((id, patch) => {
    updateImage(id, patch, `img-resize-${id}`)
  }, [updateImage])

  const handleImageToFront = useCallback((id) => {
    update(prev => {
      const next = bringToFront(prev.images || [], id)
      return next === prev.images ? prev : { ...prev, images: next }
    })
  }, [update])

  const handleImageToBack = useCallback((id) => {
    update(prev => {
      const next = sendToBack(prev.images || [], id)
      return next === prev.images ? prev : { ...prev, images: next }
    })
  }, [update])

  // Shape primitives (rectangles, circles). Same box model and z-order as images.
  const addShape = useCallback((type) => {
    const id = nextId++
    update(prev => ({ ...prev, shapes: [...(prev.shapes || []), createShape(id, type)] }))
    selectShape(id)
    setScrollTo('props-shape')
  }, [update, selectShape])

  const updateShape = useCallback((id, patch, coalesceKey) => {
    update(prev => ({
      ...prev,
      shapes: (prev.shapes || []).map(s => s.id === id ? { ...s, ...patch } : s),
    }), coalesceKey)
  }, [update])

  const deleteShape = useCallback((id) => {
    update(prev => ({ ...prev, shapes: (prev.shapes || []).filter(s => s.id !== id) }))
    setSelectedShapeId(null)
  }, [update])

  const handleDragShape = useCallback((id, x, y) => {
    update(prev => ({
      ...prev,
      shapes: (prev.shapes || []).map(s => s.id === id ? { ...s, x, y } : s),
    }), `shape-drag-${id}`)
  }, [update])

  const handleShapeToFront = useCallback((id) => {
    update(prev => {
      const next = bringToFront(prev.shapes || [], id)
      return next === prev.shapes ? prev : { ...prev, shapes: next }
    })
  }, [update])

  const handleShapeToBack = useCallback((id) => {
    update(prev => {
      const next = sendToBack(prev.shapes || [], id)
      return next === prev.shapes ? prev : { ...prev, shapes: next }
    })
  }, [update])

  // Grid
  const updateGrid = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, grid: { ...prev.grid, ...patch } }), coalesceKey)
  }, [update])

  // Build @font-face rules with base64-embedded font files for the custom fonts
  // actually used by text layers, and inject them into the cloned SVG so PNG and
  // SVG exports render correctly and stay portable. Fetch failures (e.g. CORS on
  // the Google CSS endpoint) are swallowed so export still succeeds with a
  // fallback font.
  const embedFontsInClone = useCallback(async (clone) => {
    const used = new Set(state.texts.map(t => t.fontFamily))
    const families = (state.fonts || []).filter(f => used.has(f))
    if (families.length === 0) return
    const rules = []
    for (const family of families) {
      try {
        const cssRes = await fetch(googleFontCssUrl(family))
        if (!cssRes.ok) continue
        const faces = parseFontFaces(await cssRes.text())
        for (const face of faces) {
          const fontRes = await fetch(face.url)
          if (!fontRes.ok) continue
          const dataUri = `data:font/woff2;base64,${bufferToBase64(await fontRes.arrayBuffer())}`
          rules.push(buildFontFaceRule(family, { ...face, url: dataUri }))
        }
      } catch {
        // Font could not be fetched; export proceeds with a fallback face.
      }
    }
    if (rules.length === 0) return
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.setAttribute('data-embedded-fonts', '')
    style.textContent = rules.join('\n')
    clone.insertBefore(style, clone.firstChild)
  }, [state.texts, state.fonts])

  // Export PNG
  const exportPNG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    clone.querySelectorAll('[data-layer="grid"], [data-layer="selection"]').forEach(el => el.remove())
    clone.setAttribute('width', CANVAS_SIZE)
    clone.setAttribute('height', CANVAS_SIZE)
    await embedFontsInClone(clone)

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
  }, [embedFontsInClone])

  // Export SVG
  const exportSVG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    clone.querySelectorAll('[data-layer="grid"], [data-layer="selection"]').forEach(el => el.remove())
    clone.querySelectorAll('[data-text-id]').forEach(el => {
      el.style.cursor = ''
      el.style.userSelect = ''
    })
    clone.setAttribute('width', CANVAS_SIZE)
    clone.setAttribute('height', CANVAS_SIZE)
    await embedFontsInClone(clone)

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.svg'
    a.click()
  }, [embedFontsInClone])

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
  const selectedImage = (state.images || []).find(i => i.id === selectedImageId)
  const selectedShape = (state.shapes || []).find(s => s.id === selectedShapeId)

  return (
    <div className={`flex flex-col lg:flex-row gap-6 p-4 lg:p-6 min-h-screen bg-gray-50 lg:items-start ${className}`}>
      {/* Canvas — square, stays visible on the left while the controls scroll */}
      <div className="w-full lg:w-[600px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start flex flex-col items-center gap-3">
        <div
          ref={containerRef}
          className="w-full max-w-[600px] aspect-square rounded-lg overflow-hidden shadow-md border border-gray-200"
        >
          <SVGCanvas
            state={state}
            selectedTextId={selectedTextId}
            selectedImageId={selectedImageId}
            selectedShapeId={selectedShapeId}
            onSelectText={selectText}
            onSelectImage={selectImage}
            onSelectShape={selectShape}
            onDragText={handleDragText}
            onDragImage={handleDragImage}
            onDragShape={handleDragShape}
            onResizeImage={handleResizeImage}
            displaySize={displaySize}
          />
        </div>
        <p className="text-xs text-gray-400">{CANVAS_SIZE}×{CANVAS_SIZE}px canvas · click a layer to select · drag to move · Ctrl+Z to undo</p>
      </div>

      {/* Controls */}
      <AccordionContext.Provider value={{ isOpen: (id) => isCardOpen(accordion, id), isPinned: (id) => accordion.pinned.includes(id), toggleOpen: accToggleOpen, togglePin: accTogglePin }}>
      <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col gap-3">

        {/* History */}
        <CollapsibleCard id="history" title="History">
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
        </CollapsibleCard>

        {/* Template */}
        <CollapsibleCard id="template" title="Template">
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
        </CollapsibleCard>

        {/* Fonts */}
        <CollapsibleCard id="fonts" title="Fonts">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={googleFontsApiKey ? 'Search Google Fonts…' : 'Google font name'}
              value={customFontInput}
              onFocus={ensureFontCatalog}
              onChange={e => { setCustomFontInput(e.target.value); ensureFontCatalog() }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddFont(customFontInput) }}
            />
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!customFontInput.trim()}
              onClick={() => handleAddFont(customFontInput)}
            >
              Add
            </button>
          </div>
          {fontSuggestions.length > 0 && (
            <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-48 overflow-auto">
              {fontSuggestions.map(name => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleAddFont(name)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(state.fonts || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(state.fonts || []).map(f => (
                <span key={f} className="text-[11px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5" style={{ fontFamily: f }}>{f}</span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 leading-tight">
            {googleFontsApiKey
              ? 'Type to search Google Fonts, or enter an exact name. Added fonts join the picker and embed into PNG and SVG exports.'
              : 'Enter an exact Google font name. Set VITE_GOOGLE_FONTS_API_KEY for live search suggestions.'}
          </p>
        </CollapsibleCard>

        {/* Background Image */}
        <CollapsibleCard id="background" title="Background Image">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            className="w-full btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            {state.backgroundImage ? `Change image (${state.backgroundImage})` : 'Upload image'}
          </button>
        </CollapsibleCard>

        {/* Grid */}
        <CollapsibleCard id="grid" title="Grid">
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
        </CollapsibleCard>

        {/* Text Layers */}
        <CollapsibleCard id="text-layers" title="Text Layers">
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
                onClick={() => selectText(selected ? null : t.id)}
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
        </CollapsibleCard>

        {/* Image Layers */}
        <CollapsibleCard id="image-layers" title="Image Layers">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={addImageLayer} />
          <button className="w-full btn-primary" onClick={() => imageInputRef.current?.click()}>+ Add image</button>
          {(state.images || []).length === 0 && <p className="text-xs text-gray-400 text-center py-1">No image layers yet</p>}
          {[...(state.images || [])].reverse().map((img) => {
            const selected = img.id === selectedImageId
            const isTop = (state.images || []).indexOf(img) === state.images.length - 1
            const isBottom = (state.images || []).indexOf(img) === 0
            return (
              <div
                key={img.id}
                className={`rounded border p-2 cursor-pointer text-sm transition-colors ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                onClick={() => selectImage(selected ? null : img.id)}
              >
                <div className="flex items-center gap-1">
                  <span className="truncate flex-1 text-gray-700">{img.name || 'image'}</span>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Bring to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleImageToFront(img.id) }}>⤒</button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Send to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleImageToBack(img.id) }}>⤓</button>
                  <button className="text-gray-400 hover:text-red-500 text-xs px-1" title="Delete" onClick={(e) => { e.stopPropagation(); deleteImage(img.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </CollapsibleCard>

        {/* Selected Image Properties */}
        {selectedImage && (() => {
          const nW = selectedImage.naturalWidth || selectedImage.width
          const nH = selectedImage.naturalHeight || selectedImage.height
          const setWidth = (v) => updateImage(selectedImage.id, selectedImage.lockAspect ? { width: v, height: aspectHeight(v, nW, nH) || selectedImage.height } : { width: v }, `img-w-${selectedImage.id}`)
          const setHeight = (v) => updateImage(selectedImage.id, selectedImage.lockAspect ? { height: v, width: aspectWidth(v, nW, nH) || selectedImage.width } : { height: v }, `img-h-${selectedImage.id}`)
          return (
          <CollapsibleCard id="props-image" title="Image Properties">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round((selectedImage.opacity ?? 1) * 100)}%)</label>
              <input
                type="range"
                className="w-full accent-blue-500"
                min={0}
                max={100}
                value={Math.round((selectedImage.opacity ?? 1) * 100)}
                onChange={e => updateImage(selectedImage.id, { opacity: clampOpacity(Number(e.target.value) / 100) }, `img-opacity-${selectedImage.id}`)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Blend mode</label>
              <select
                className="input w-full"
                value={selectedImage.blendMode}
                onChange={e => updateImage(selectedImage.id, { blendMode: e.target.value })}
              >
                {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Size ({dimensionPercent(selectedImage.width, nW)}% of original)</label>
              <input
                type="range"
                className="w-full accent-blue-500"
                min={5}
                max={300}
                value={Math.min(300, dimensionPercent(selectedImage.width, nW))}
                onChange={e => { const d = scaleDimensions(nW, nH, Number(e.target.value)); updateImage(selectedImage.id, { width: d.width, height: d.height }, `img-scale-${selectedImage.id}`) }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selectedImage.lockAspect} onChange={e => updateImage(selectedImage.id, { lockAspect: e.target.checked })} className="accent-blue-500" />
              Lock aspect ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Width" value={selectedImage.width} min={1} max={2000} onChange={setWidth} />
              <NumberInput label="Height" value={selectedImage.height} min={1} max={2000} onChange={setHeight} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X position" value={selectedImage.x} min={-CANVAS_SIZE} max={CANVAS_SIZE} onChange={v => updateImage(selectedImage.id, { x: v }, `img-x-${selectedImage.id}`)} />
              <NumberInput label="Y position" value={selectedImage.y} min={-CANVAS_SIZE} max={CANVAS_SIZE} onChange={v => updateImage(selectedImage.id, { y: v }, `img-y-${selectedImage.id}`)} />
            </div>
            <button className="w-full btn-secondary text-sm" onClick={() => deleteImage(selectedImage.id)}>Delete image</button>
          </CollapsibleCard>
          )
        })()}

        {/* Shapes */}
        <CollapsibleCard id="shapes" title="Shapes">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary text-sm" onClick={() => addShape('rect')}>+ Rectangle</button>
            <button className="btn-primary text-sm" onClick={() => addShape('circle')}>+ Circle</button>
          </div>
          {(state.shapes || []).length === 0 && <p className="text-xs text-gray-400 text-center py-1">No shapes yet</p>}
          {[...(state.shapes || [])].reverse().map((shape) => {
            const selected = shape.id === selectedShapeId
            const isTop = (state.shapes || []).indexOf(shape) === state.shapes.length - 1
            const isBottom = (state.shapes || []).indexOf(shape) === 0
            return (
              <div
                key={shape.id}
                className={`rounded border p-2 cursor-pointer text-sm transition-colors ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                onClick={() => selectShape(selected ? null : shape.id)}
              >
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border border-gray-300" style={{ background: shape.fill, borderRadius: shape.type === 'circle' ? '9999px' : '2px' }} aria-hidden="true" />
                  <span className="truncate flex-1 text-gray-700 capitalize">{shape.type}</span>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Bring to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleShapeToFront(shape.id) }}>⤒</button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1" title="Send to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleShapeToBack(shape.id) }}>⤓</button>
                  <button className="text-gray-400 hover:text-red-500 text-xs px-1" title="Delete" onClick={(e) => { e.stopPropagation(); deleteShape(shape.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </CollapsibleCard>

        {/* Selected Shape Properties */}
        {selectedShape && (
          <CollapsibleCard id="props-shape" title="Shape Properties">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fill</label>
                <input type="color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={selectedShape.fill} onChange={e => updateShape(selectedShape.id, { fill: e.target.value }, `shape-fill-${selectedShape.id}`)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stroke</label>
                <input type="color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={selectedShape.stroke} onChange={e => updateShape(selectedShape.id, { stroke: e.target.value }, `shape-stroke-${selectedShape.id}`)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Stroke width" value={selectedShape.strokeWidth} min={0} max={40} onChange={v => updateShape(selectedShape.id, { strokeWidth: v }, `shape-sw-${selectedShape.id}`)} hint="0 = off" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round((selectedShape.opacity ?? 1) * 100)}%)</label>
                <input type="range" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round((selectedShape.opacity ?? 1) * 100)} onChange={e => updateShape(selectedShape.id, { opacity: clampOpacity(Number(e.target.value) / 100) }, `shape-opacity-${selectedShape.id}`)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Width" value={selectedShape.width} min={1} max={CANVAS_SIZE} onChange={v => updateShape(selectedShape.id, { width: v }, `shape-w-${selectedShape.id}`)} />
              <NumberInput label="Height" value={selectedShape.height} min={1} max={CANVAS_SIZE} onChange={v => updateShape(selectedShape.id, { height: v }, `shape-h-${selectedShape.id}`)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X position" value={selectedShape.x} min={0} max={CANVAS_SIZE} onChange={v => updateShape(selectedShape.id, { x: v }, `shape-x-${selectedShape.id}`)} />
              <NumberInput label="Y position" value={selectedShape.y} min={0} max={CANVAS_SIZE} onChange={v => updateShape(selectedShape.id, { y: v }, `shape-y-${selectedShape.id}`)} />
            </div>
            <button className="w-full btn-secondary text-sm" onClick={() => deleteShape(selectedShape.id)}>Delete shape</button>
          </CollapsibleCard>
        )}

        {/* Selected Text Properties */}
        {selectedText && (
          <CollapsibleCard id="props-text" title="Text Properties">
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
                  {[...BUILTIN_FONTS, ...(state.fonts || [])].map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
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
              <NumberInput label="Stroke width" value={selectedText.strokeWidth || 0} min={0} max={40} onChange={v => updateText(selectedText.id, { strokeWidth: v }, `stroke-width-${selectedText.id}`)} hint="0 = off" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stroke color</label>
                <input
                  type="color"
                  className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                  value={selectedText.stroke || '#000000'}
                  onChange={e => updateText(selectedText.id, { stroke: e.target.value }, `stroke-color-${selectedText.id}`)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selectedText.shadow}
                onChange={e => updateText(selectedText.id, { shadow: e.target.checked ? { color: '#000000', blur: 4, dx: 2, dy: 2 } : null })}
                className="accent-blue-500"
              />
              Drop shadow
            </label>
            {selectedText.shadow && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Blur" value={selectedText.shadow.blur ?? 0} min={0} max={40} onChange={v => updateText(selectedText.id, { shadow: { ...selectedText.shadow, blur: v } }, `shadow-blur-${selectedText.id}`)} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Shadow color</label>
                    <input
                      type="color"
                      className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                      value={selectedText.shadow.color || '#000000'}
                      onChange={e => updateText(selectedText.id, { shadow: { ...selectedText.shadow, color: e.target.value } }, `shadow-color-${selectedText.id}`)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Offset X" value={selectedText.shadow.dx ?? 0} min={-40} max={40} onChange={v => updateText(selectedText.id, { shadow: { ...selectedText.shadow, dx: v } }, `shadow-dx-${selectedText.id}`)} />
                  <NumberInput label="Offset Y" value={selectedText.shadow.dy ?? 0} min={-40} max={40} onChange={v => updateText(selectedText.id, { shadow: { ...selectedText.shadow, dy: v } }, `shadow-dy-${selectedText.id}`)} />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumberInput label="X position" value={selectedText.x} min={0} max={CANVAS_SIZE} onChange={v => updateText(selectedText.id, { x: v }, `x-${selectedText.id}`)} />
              <NumberInput label="Y position" value={selectedText.y} min={0} max={CANVAS_SIZE} onChange={v => updateText(selectedText.id, { y: v }, `y-${selectedText.id}`)} />
            </div>
          </CollapsibleCard>
        )}

        {/* Export / Import */}
        <CollapsibleCard id="export" title="Export & Import">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary text-sm" onClick={exportPNG}>Export PNG</button>
            <button className="btn-secondary text-sm" onClick={exportSVG}>Export SVG</button>
          </div>
          <button className="w-full btn-secondary text-sm" onClick={exportJSON}>Save JSON state</button>
          <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJSONImport} />
          <button className="w-full btn-secondary text-sm" onClick={() => jsonInputRef.current?.click()}>Load JSON state</button>
        </CollapsibleCard>
      </div>
      </AccordionContext.Provider>
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
