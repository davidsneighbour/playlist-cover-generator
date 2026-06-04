import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, useId } from 'react'
import { reorder, bringToFront, sendToBack, displayIndexToArrayIndex, duplicateById } from '../lib/layers'
import { TEMPLATES, getTemplate, instantiateTemplate } from '../lib/templates'
import { textStrokeAttrs, textShadowFilter } from '../lib/text'
import { BUILTIN_FONTS, googleFontCssUrl, buildFontFaceRule, addFont, googleFontsListUrl, filterFontNames, fontVariantKey, variantFontFace, pickVariantFile } from '../lib/fonts'
import { BLEND_MODES, createImageLayer, clampOpacity, centeredPosition, coverDimensions, scaleDimensions, dimensionPercent, aspectHeight, aspectWidth, offCanvasBounds, resizeFromCorner } from '../lib/images'
import { createShape, ellipseGeometry } from '../lib/shapes'
import { DEFAULT_OVERLAY, OVERLAY_TYPES, gradientVector } from '../lib/overlay'
import { DEFAULT_BACKGROUND_GRADIENT, BACKGROUND_GRADIENT_TYPES, DEFAULT_BACKGROUND_TRANSFORM, backgroundCrop } from '../lib/background'
import { DEFAULT_FILTERS, isFilterActive, brightnessContrastTransfer } from '../lib/filters'
import { CANVAS_PRESETS, DEFAULT_EXPORT_SIZE, exportScale, clampExportSize } from '../lib/canvas'
import { rulerTicks } from '../lib/rulers'
import { SHORTCUTS, formatKeys, nudgeDelta, isDeleteKey, isEditableTarget } from '../lib/shortcuts'
import { clampMenuPosition } from '../lib/menu'
import { stripExportArtifacts } from '../lib/export'
import { mergeInitialState } from '../lib/state'
import { useHistoryState } from '../hooks/useHistoryState'
import { STORAGE_KEY, serializeState, serializeStateWithoutImage, parseStoredState } from '../lib/storage'
import { SHARE_PARAM, encodeShareState, decodeShareState, readShareToken } from '../lib/share'
import { buildZip } from '../lib/zip'
import { actionAnnouncement, describeLayer } from '../lib/a11y'
import { buildLayerList } from '../lib/layerList'
import { averageRgb, pickContrastColor } from '../lib/color'
import { isOpen as isCardOpen, toggleOpen, togglePin, openCard } from '../lib/accordion'
import { AccordionContext, CollapsibleCard } from './Accordion'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  Undo2, Redo2, LayoutTemplate, Plus, Search, Upload, Trash2, RotateCcw,
  Square, Circle, GripVertical, Copy, BringToFront, SendToBack,
  FileImage, FileCode, Save, FolderOpen, Link, Package, CircleHelp, X,
  Type, Blend, Image as ImageIcon,
} from 'lucide-react'
import { version as APP_VERSION } from '../../package.json'

const CANVAS_SIZE = 600
const RULER = 22 // px thickness of each ruler strip
const DUP_OFFSET = 16 // canvas units a duplicated layer is shifted so it is visible
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')

// Optional Google Fonts API key for the font-search typeahead. Read from the
// Vite env by default; a host embedding the component can pass its own.
const ENV_GOOGLE_FONTS_API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY

const DEFAULT_STATE = {
  backgroundImage: null,
  backgroundImageData: null,
  backgroundNaturalWidth: null,
  backgroundNaturalHeight: null,
  backgroundTransform: DEFAULT_BACKGROUND_TRANSFORM,
  backgroundFilters: DEFAULT_FILTERS,
  backgroundGradient: DEFAULT_BACKGROUND_GRADIENT,
  texts: [],
  images: [],
  shapes: [],
  overlay: DEFAULT_OVERLAY,
  grid: {
    enabled: false,
    spacing: 20,
    majorEvery: 5,
  },
  snapToGrid: true,
  fonts: [],
  exportSize: DEFAULT_EXPORT_SIZE,
}

let nextId = 1

// Base64-encode an ArrayBuffer (for inlining font files as data URIs).
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// Read an image File into a data URL plus its natural dimensions (for batch
// export, which swaps each uploaded image into the current layout).
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target.result
      const probe = new Image()
      probe.onload = () => resolve({ data, naturalWidth: probe.naturalWidth, naturalHeight: probe.naturalHeight })
      probe.onerror = () => reject(new Error('decode failed'))
      probe.src = data
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function snapValue(value, spacing, enabled) {
  if (!enabled) return value
  return Math.round(value / spacing) * spacing
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

// Rulers along the top and left of the canvas, showing canvas-unit coordinates
// (0..CANVAS_SIZE). They are plain chrome rendered outside the exported SVG, so
// they never appear in PNG or SVG output. Tick values come from the pure
// `rulerTicks`; pixel positions scale with the live `displaySize`.
function RulerMarks({ displaySize, axis }) {
  const ticks = rulerTicks(CANVAS_SIZE)
  return ticks.map(({ value, major }) => {
    const px = (value / CANVAS_SIZE) * displaySize
    const len = major ? 8 : 5
    const showLabel = major && value !== 0 && value !== CANVAS_SIZE
    if (axis === 'top') {
      return (
        <g key={value}>
          <line x1={px} y1={RULER - len} x2={px} y2={RULER} stroke="#cbd5e1" strokeWidth={0.75} />
          {showLabel && <text x={px} y={9} fontSize={8} fill="#9ca3af" textAnchor="middle">{value}</text>}
        </g>
      )
    }
    return (
      <g key={value}>
        <line x1={RULER - len} y1={px} x2={RULER} y2={px} stroke="#cbd5e1" strokeWidth={0.75} />
        {showLabel && <text x={11} y={px} fontSize={8} fill="#9ca3af" textAnchor="middle" transform={`rotate(-90 11 ${px})`}>{value}</text>}
      </g>
    )
  })
}

function TopRuler({ displaySize }) {
  return (
    <svg width={displaySize} height={RULER} className="block bg-gray-50" aria-hidden="true">
      <line x1={0} y1={RULER - 0.5} x2={displaySize} y2={RULER - 0.5} stroke="#e5e7eb" strokeWidth={1} />
      <RulerMarks displaySize={displaySize} axis="top" />
    </svg>
  )
}

function LeftRuler({ displaySize }) {
  return (
    <svg width={RULER} height={displaySize} className="block bg-gray-50" aria-hidden="true">
      <line x1={RULER - 0.5} y1={0} x2={RULER - 0.5} y2={displaySize} stroke="#e5e7eb" strokeWidth={1} />
      <RulerMarks displaySize={displaySize} axis="left" />
    </svg>
  )
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
      tabIndex={0}
      role="button"
      aria-label={describeLayer('text', text)}
      aria-pressed={selected}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(text.id) } }}
    >
      {text.content}
      {selected && (
        <title>Selected: drag to move</title>
      )}
    </text>
  )
}

function ImageElement({ image, selected, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
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
      tabIndex={0}
      role="button"
      aria-label={describeLayer('image', image)}
      aria-pressed={selected}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(image.id) } }}
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

function ShapeElement({ shape, selected, onSelect, onDrag, snapToGrid, gridSpacing, canvasSize }) {
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
    tabIndex: 0,
    role: 'button',
    'aria-label': describeLayer('shape', shape),
    'aria-pressed': selected,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(shape.id) } },
  }

  if (shape.type === 'circle') {
    const g = ellipseGeometry(shape)
    return <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />
  }
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...common} />
}

// Two-stop gradient that fills the canvas beneath the background image, so it
// shows through when no image is loaded (an opaque image covers it). Reuses the
// same gradient-axis math as the overlay. pointer-events stay off.
function GradientBackground({ gradient, size }) {
  if (!gradient || !gradient.enabled) return null
  const id = 'background-gradient'
  const stops = (
    <>
      <stop offset="0%" stopColor={gradient.color} />
      <stop offset="100%" stopColor={gradient.color2} />
    </>
  )
  const v = gradientVector(gradient.angle)
  return (
    <>
      <defs>
        {gradient.type === 'radial' ? (
          <radialGradient id={id} cx="50%" cy="50%" r="50%">{stops}</radialGradient>
        ) : (
          <linearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>{stops}</linearGradient>
        )}
      </defs>
      <rect
        x={0} y={0} width={size} height={size}
        fill={`url(#${id})`}
        style={{ pointerEvents: 'none' }}
        data-layer="background-gradient"
      />
    </>
  )
}

// Full-canvas color overlay painted over the background (under every other
// layer) to improve text legibility. Solid is a single color; linear/radial are
// two-stop gradients whose stops carry their own alpha. The blend mode applies
// to the overlay rect, so e.g. "multiply" darkens only the background beneath.
// pointer-events stay off so clicks fall through to the canvas for deselection.
function ColorOverlay({ overlay, size }) {
  if (!overlay || !overlay.enabled) return null
  const blend = overlay.blendMode && overlay.blendMode !== 'normal' ? overlay.blendMode : undefined

  if (overlay.type === 'solid') {
    return (
      <rect
        x={0} y={0} width={size} height={size}
        fill={overlay.color}
        opacity={clampOpacity(overlay.opacity)}
        style={{ mixBlendMode: blend, pointerEvents: 'none' }}
        data-layer="overlay"
      />
    )
  }

  const gradId = 'overlay-gradient'
  const stops = (
    <>
      <stop offset="0%" stopColor={overlay.color} stopOpacity={clampOpacity(overlay.opacity)} />
      <stop offset="100%" stopColor={overlay.color2} stopOpacity={clampOpacity(overlay.opacity2)} />
    </>
  )
  const v = gradientVector(overlay.angle)
  return (
    <>
      <defs>
        {overlay.type === 'radial' ? (
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">{stops}</radialGradient>
        ) : (
          <linearGradient id={gradId} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>{stops}</linearGradient>
        )}
      </defs>
      <rect
        x={0} y={0} width={size} height={size}
        fill={`url(#${gradId})`}
        style={{ mixBlendMode: blend, pointerEvents: 'none' }}
        data-layer="overlay"
      />
    </>
  )
}

function SVGCanvas({ state, selectedTextId, selectedImageId, selectedShapeId, onSelectText, onSelectImage, onSelectShape, onDragText, onDragImage, onDragShape, onResizeImage, onContextMenuLayer, displaySize }) {
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

  const bgFilters = state.backgroundFilters || DEFAULT_FILTERS
  const bgFilterActive = isFilterActive(bgFilters)
  const bgFilterRef = bgFilterActive ? 'url(#bg-filter)' : undefined
  const bgTransfer = brightnessContrastTransfer(bgFilters.brightness, bgFilters.contrast)

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
      style={{ display: 'block', background: '#ffffff' }}
      role="group"
      aria-label="Cover canvas"
      onClick={(e) => {
        if (e.target.tagName === 'svg') {
          onSelectText(null)
          onSelectImage(null)
          onSelectShape(null)
        }
      }}
      onContextMenu={(e) => {
        const el = e.target.closest && e.target.closest('[data-text-id],[data-image-id],[data-shape-id]')
        if (!el) return
        e.preventDefault()
        const d = el.dataset
        if (d.textId !== undefined) onContextMenuLayer('text', Number(d.textId), e.clientX, e.clientY)
        else if (d.imageId !== undefined) onContextMenuLayer('image', Number(d.imageId), e.clientX, e.clientY)
        else if (d.shapeId !== undefined) onContextMenuLayer('shape', Number(d.shapeId), e.clientX, e.clientY)
      }}
    >
      <defs>
        <clipPath id="canvas-clip">
          <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} />
        </clipPath>
        {bgFilterActive && (
          <filter id="bg-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values={bgFilters.saturate} />
            <feComponentTransfer>
              <feFuncR type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
              <feFuncG type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
              <feFuncB type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
            </feComponentTransfer>
            {bgFilters.blur > 0 && <feGaussianBlur stdDeviation={bgFilters.blur} />}
          </filter>
        )}
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

      <GradientBackground gradient={state.backgroundGradient} size={CANVAS_SIZE} />

      {state.backgroundImageData && (() => {
        const nW = state.backgroundNaturalWidth
        const nH = state.backgroundNaturalHeight
        // Fall back to slice when the natural size is unknown (e.g. an image
        // supplied via initialState rather than the uploader).
        if (!nW || !nH) {
          return (
            <image
              href={state.backgroundImageData}
              x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#canvas-clip)"
              filter={bgFilterRef}
              data-layer="background"
            />
          )
        }
        const c = backgroundCrop(nW, nH, CANVAS_SIZE, state.backgroundTransform || undefined)
        return (
          <image
            href={state.backgroundImageData}
            x={c.x} y={c.y} width={c.width} height={c.height}
            preserveAspectRatio="none"
            clipPath="url(#canvas-clip)"
            filter={bgFilterRef}
            data-layer="background"
          />
        )
      })()}

      <ColorOverlay overlay={state.overlay} size={CANVAS_SIZE} />

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
          selected={shape.id === selectedShapeId}
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

// Help overlay: app info, version, keyboard shortcuts, and mouse tips. Opened
// and closed with F1 (handled by the component); also closes on Escape, on a
// click outside the panel (both via Headless UI Dialog's onClose), and on the X.
function HelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[85vh] overflow-auto">
          <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-100">
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">Playlist cover generator</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">Version {APP_VERSION}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 -m-1" aria-label="Close help"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-sm text-gray-600">Build a square playlist cover: set a background, layer text, shapes, and images, then export to PNG, SVG, or a re-loadable JSON project.</p>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Keyboard shortcuts</h3>
              <ul className="flex flex-col gap-1.5">
                {SHORTCUTS.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-600">{s.description}</span>
                    <span className="flex gap-1">
                      {formatKeys(s.keys, IS_MAC).map((k, i) => (
                        <kbd key={i} className="px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 border border-gray-200 rounded text-gray-700">{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tips</h3>
              <ul className="flex flex-col gap-1 text-sm text-gray-600 list-disc pl-4">
                <li>Drag a layer on the canvas to move it; enable snap to grid for alignment.</li>
                <li>Hold Shift while dragging an image corner to lock its aspect ratio.</li>
                <li>Click an empty area of the canvas to deselect.</li>
              </ul>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// Right-click context menu for a layer. Positioned at the cursor and clamped to
// the viewport once measured. Closes on an outside mousedown, Escape, scroll, or
// after an action runs.
function ContextMenu({ x, y, actions, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x, y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(clampMenuPosition(x, y, r.width, r.height, window.innerWidth, window.innerHeight))
  }, [x, y])

  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[10rem] bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm"
      style={{ top: pos.y, left: pos.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className={`flex w-full items-center gap-2 text-left px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${a.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
          onClick={() => { a.onClick(); onClose() }}
        >
          {a.icon && <a.icon className="h-4 w-4" aria-hidden="true" />}
          {a.label}
        </button>
      ))}
    </div>
  )
}

// Icon glyphs for the Layers overview rows, keyed by the entry's `icon` string
// from buildLayerList (kept out of the lib so it stays DOM-free and testable).
const LAYER_ICONS = { type: Type, square: Square, circle: Circle, image: ImageIcon, blend: Blend }

// One row in the Layers overview panel. Clicking it jumps to that layer's
// controls (selecting it, or opening the background/overlay card). Selection is
// reflected like the per-type lists; singletons that are off/empty are muted.
function LayerRow({ entry, onSelect }) {
  const Icon = LAYER_ICONS[entry.icon]
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-pressed={entry.selected}
      className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${entry.selected ? 'border-blue-400 bg-blue-50 text-gray-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
    >
      {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${entry.muted ? 'text-gray-300' : 'text-gray-400'}`} aria-hidden="true" />}
      <span className={`truncate flex-1 ${entry.muted ? 'text-gray-400 italic' : ''}`}>{entry.label}</span>
    </button>
  )
}

export default function CoverGenerator({ initialState, onStateChange, className = '', googleFontsApiKey = ENV_GOOGLE_FONTS_API_KEY, autoSave = true }) {
  // Restore an auto-saved session on mount (once). An explicit initialState prop
  // still wins per key; without one, the previous session is reloaded.
  const restored = useMemo(
    () => (autoSave && typeof localStorage !== 'undefined' ? parseStoredState(localStorage.getItem(STORAGE_KEY)) : null),
    [], // eslint-disable-line react-hooks/exhaustive-deps -- read once at mount
  )
  // A share link (#s=...) takes precedence over the saved session: the user
  // opened that link to see that design. An explicit initialState still wins.
  const sharedFromUrl = useMemo(
    () => (typeof window !== 'undefined' ? decodeShareState(readShareToken(window.location.hash)) : null),
    [], // read once at mount; decodeShareState/readShareToken are stable module imports
  )
  const { state, canUndo, canRedo, commit, undo, redo } = useHistoryState(
    mergeInitialState(DEFAULT_STATE, restored, sharedFromUrl, initialState),
  )
  const update = commit
  // Speak a message through the ARIA live region (re-announces repeats via the
  // changing nonce, see the rendered region below).
  const announce = useCallback((msg) => setLive(l => ({ msg, n: l.n + 1 })), [])
  const doUndo = useCallback(() => { undo(); announce('Undo') }, [undo, announce])
  const doRedo = useCallback(() => { redo(); announce('Redo') }, [redo, announce])
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [selectedShapeId, setSelectedShapeId] = useState(null)
  const [displaySize, setDisplaySize] = useState(CANVAS_SIZE)
  const [showRulers, setShowRulers] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)
  const [live, setLive] = useState({ msg: '', n: 0 })
  const [dragOverArrayIndex, setDragOverArrayIndex] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customFontInput, setCustomFontInput] = useState('')
  const containerRef = useRef(null)
  const canvasColRef = useRef(null)
  const fileInputRef = useRef(null)
  const jsonInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const batchFileInputRef = useRef(null)
  const dragIndexRef = useRef(null)
  const bgColorRef = useRef({ r: 255, g: 255, b: 255 })

  // Accordion: one unpinned control card open at a time; pinned cards stay open.
  const [accordion, setAccordion] = useState({ openId: 'layers', pinned: [] })
  const accToggleOpen = useCallback((id) => setAccordion(s => toggleOpen(s, id)), [])
  const accTogglePin = useCallback((id) => setAccordion(s => togglePin(s, id)), [])
  const accOpenCard = useCallback((id) => setAccordion(s => openCard(s, id)), [])

  // Only one layer (text, image, or shape) is selected at a time. Selecting one
  // also opens its properties card so its controls are visible.
  const selectText = useCallback((id) => { setSelectedTextId(id); setSelectedImageId(null); setSelectedShapeId(null); if (id != null) accOpenCard('props-text') }, [accOpenCard])
  const selectImage = useCallback((id) => { setSelectedImageId(id); setSelectedTextId(null); setSelectedShapeId(null); if (id != null) accOpenCard('props-image') }, [accOpenCard])
  const selectShape = useCallback((id) => { setSelectedShapeId(id); setSelectedTextId(null); setSelectedImageId(null); if (id != null) accOpenCard('props-shape') }, [accOpenCard])

  // Right-click a layer: select it and open the context menu at the cursor.
  const openContextMenu = useCallback((kind, id, x, y) => {
    if (kind === 'text') selectText(id)
    else if (kind === 'image') selectImage(id)
    else if (kind === 'shape') selectShape(id)
    setContextMenu({ kind, id, x, y })
  }, [selectText, selectImage, selectShape])
  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // After adding a layer, scroll its freshly shown properties card into view.
  const [scrollTo, setScrollTo] = useState(null)
  useEffect(() => {
    if (!scrollTo) return
    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setScrollTo(null)
  }, [scrollTo])

  // Navigate from the Layers overview to a layer's controls: select the layer
  // (which opens its properties card) for text/image/shape, or open the
  // background/overlay card, then scroll that card into view.
  const goToLayer = useCallback((entry) => {
    switch (entry.kind) {
      case 'text': selectText(entry.id); setScrollTo('props-text'); break
      case 'shape': selectShape(entry.id); setScrollTo('props-shape'); break
      case 'image': selectImage(entry.id); setScrollTo('props-image'); break
      case 'overlay': accOpenCard('overlay'); setScrollTo('overlay'); break
      case 'background': accOpenCard('background'); setScrollTo('background'); break
      default: break
    }
  }, [selectText, selectShape, selectImage, accOpenCard])

  // Fit the canvas to the column, leaving room for the rulers when shown. We
  // observe the column (its width comes from the page layout, not its children)
  // so sizing the canvas can never feed back into the measurement. Re-runs on
  // ruler toggle so the canvas reclaims or yields the ruler strip immediately.
  useEffect(() => {
    const measure = (w) => setDisplaySize(Math.max(0, Math.min(CANVAS_SIZE, w - (showRulers ? RULER : 0))))
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) measure(entry.contentRect.width)
    })
    const el = canvasColRef.current
    if (el) {
      obs.observe(el)
      measure(el.getBoundingClientRect().width)
    }
    return () => obs.disconnect()
  }, [showRulers])

  // Notify the host of state changes, skipping the initial mount.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onStateChange?.(state)
  }, [state, onStateChange])

  // Auto-save the session to localStorage, debounced so frequent edits (drags,
  // typing) do not write on every change. Falls back to saving without the
  // (large) background image if the full payload exceeds the storage quota.
  useEffect(() => {
    if (!autoSave || typeof localStorage === 'undefined') return
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeState(state))
      } catch {
        try {
          localStorage.setItem(STORAGE_KEY, serializeStateWithoutImage(state))
        } catch {
          // Storage unavailable or still over quota; skip this save.
        }
      }
    }, 500)
    return () => clearTimeout(id)
  }, [state, autoSave])

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
      if (e.key === 'F1') {
        e.preventDefault()
        setHelpOpen(o => !o)
        return
      }
      if (isEditableTarget(e.target)) return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        doUndo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        doRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doUndo, doRedo])

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

  // Background image upload. Probe the natural dimensions so the crop/pan/zoom
  // controls can size it, and reset the transform to centered cover.
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target.result
      const probe = new Image()
      probe.onload = () => {
        update({
          backgroundImage: file.name,
          backgroundImageData: data,
          backgroundNaturalWidth: probe.naturalWidth,
          backgroundNaturalHeight: probe.naturalHeight,
          backgroundTransform: DEFAULT_BACKGROUND_TRANSFORM,
        })
      }
      probe.src = data
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
    announce(actionAnnouncement('add', 'text'))
  }, [update, selectText, announce])

  // Add a Google font by name to the picker (de-duplicated). The injection
  // effect loads it; embedding on export makes it portable.
  const handleAddFont = useCallback((name) => {
    update(prev => {
      const next = addFont(prev.fonts || [], name)
      return next === (prev.fonts || []) ? prev : { ...prev, fonts: next }
    })
    setCustomFontInput('')
  }, [update])

  // Fetch the Google Fonts catalog once (cached promise), shared by the
  // typeahead and by export embedding. Each item carries its gstatic font-file
  // URLs, which (unlike the CSS endpoint) are CORS-enabled and can be inlined.
  const fontCatalogRef = useRef(null)
  const loadFontCatalog = useCallback(() => {
    if (!googleFontsApiKey) return Promise.resolve([])
    if (!fontCatalogRef.current) {
      fontCatalogRef.current = fetch(googleFontsListUrl(googleFontsApiKey))
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(json => json.items || [])
        .catch(() => [])
    }
    return fontCatalogRef.current
  }, [googleFontsApiKey])

  // Lazily populate the typeahead name list from the catalog. Failures (or no
  // key) degrade to no suggestions.
  const [googleFonts, setGoogleFonts] = useState(null)
  const ensureFontCatalog = useCallback(() => {
    if (googleFonts !== null || !googleFontsApiKey) return
    loadFontCatalog().then(items => setGoogleFonts(items.map(i => i.family)))
  }, [googleFonts, googleFontsApiKey, loadFontCatalog])

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
    announce(actionAnnouncement('delete', 'text'))
  }, [update, announce])

  const duplicateText = useCallback((id) => {
    const newId = nextId++
    update(prev => {
      const src = prev.texts
      const texts = duplicateById(src, id, (t) => ({ ...t, id: newId, x: t.x + DUP_OFFSET, y: t.y + DUP_OFFSET, shadow: t.shadow ? { ...t.shadow } : null }))
      return texts === src ? prev : { ...prev, texts }
    })
    selectText(newId)
    announce(actionAnnouncement('duplicate', 'text'))
  }, [update, selectText, announce])

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
        announce(actionAnnouncement('add', 'image'))
      }
      probe.src = data
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [update, selectImage, announce])

  const updateImage = useCallback((id, patch, coalesceKey) => {
    update(prev => ({
      ...prev,
      images: (prev.images || []).map(i => i.id === id ? { ...i, ...patch } : i),
    }), coalesceKey)
  }, [update])

  const deleteImage = useCallback((id) => {
    update(prev => ({ ...prev, images: (prev.images || []).filter(i => i.id !== id) }))
    setSelectedImageId(null)
    announce(actionAnnouncement('delete', 'image'))
  }, [update, announce])

  const duplicateImage = useCallback((id) => {
    const newId = nextId++
    update(prev => {
      const src = prev.images || []
      const images = duplicateById(src, id, (i) => ({ ...i, id: newId, x: i.x + DUP_OFFSET, y: i.y + DUP_OFFSET }))
      return images === src ? prev : { ...prev, images }
    })
    selectImage(newId)
    announce(actionAnnouncement('duplicate', 'image'))
  }, [update, selectImage, announce])

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
    announce(actionAnnouncement('add', 'shape'))
  }, [update, selectShape, announce])

  const updateShape = useCallback((id, patch, coalesceKey) => {
    update(prev => ({
      ...prev,
      shapes: (prev.shapes || []).map(s => s.id === id ? { ...s, ...patch } : s),
    }), coalesceKey)
  }, [update])

  const deleteShape = useCallback((id) => {
    update(prev => ({ ...prev, shapes: (prev.shapes || []).filter(s => s.id !== id) }))
    setSelectedShapeId(null)
    announce(actionAnnouncement('delete', 'shape'))
  }, [update, announce])

  const duplicateShape = useCallback((id) => {
    const newId = nextId++
    update(prev => {
      const src = prev.shapes || []
      const shapes = duplicateById(src, id, (s) => ({ ...s, id: newId, x: s.x + DUP_OFFSET, y: s.y + DUP_OFFSET }))
      return shapes === src ? prev : { ...prev, shapes }
    })
    selectShape(newId)
    announce(actionAnnouncement('duplicate', 'shape'))
  }, [update, selectShape, announce])

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

  // Color overlay (a single full-canvas fill). One object, edited in place.
  const updateOverlay = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, overlay: { ...(prev.overlay || DEFAULT_OVERLAY), ...patch } }), coalesceKey)
  }, [update])

  // Gradient background (shows beneath the image). One object, edited in place.
  const updateBackgroundGradient = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, backgroundGradient: { ...(prev.backgroundGradient || DEFAULT_BACKGROUND_GRADIENT), ...patch } }), coalesceKey)
  }, [update])

  // Background image crop/pan/zoom. One object, edited in place.
  const updateBackgroundTransform = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, backgroundTransform: { ...(prev.backgroundTransform || DEFAULT_BACKGROUND_TRANSFORM), ...patch } }), coalesceKey)
  }, [update])

  // Background image filters (brightness/contrast/saturation/blur).
  const updateBackgroundFilters = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, backgroundFilters: { ...(prev.backgroundFilters || DEFAULT_FILTERS), ...patch } }), coalesceKey)
  }, [update])

  const clearBackgroundImage = useCallback(() => {
    update({ backgroundImage: null, backgroundImageData: null, backgroundNaturalWidth: null, backgroundNaturalHeight: null })
  }, [update])

  // Grid
  const updateGrid = useCallback((patch, coalesceKey) => {
    update(prev => ({ ...prev, grid: { ...prev.grid, ...patch } }), coalesceKey)
  }, [update])

  // Move the selected layer (text, image, or shape) by a delta in canvas units.
  // Coalesced per layer so a burst of arrow presses is a single undo step.
  const nudgeSelected = useCallback((dx, dy) => {
    update(prev => {
      if (selectedTextId != null) return { ...prev, texts: prev.texts.map(t => t.id === selectedTextId ? { ...t, x: t.x + dx, y: t.y + dy } : t) }
      if (selectedImageId != null) return { ...prev, images: (prev.images || []).map(i => i.id === selectedImageId ? { ...i, x: i.x + dx, y: i.y + dy } : i) }
      if (selectedShapeId != null) return { ...prev, shapes: (prev.shapes || []).map(s => s.id === selectedShapeId ? { ...s, x: s.x + dx, y: s.y + dy } : s) }
      return prev
    }, `nudge-${selectedTextId ?? ''}-${selectedImageId ?? ''}-${selectedShapeId ?? ''}`)
  }, [update, selectedTextId, selectedImageId, selectedShapeId])

  // Delete the selected layer; arrow keys nudge it (Shift = by grid spacing).
  // Ignored while a field is focused or the help overlay is open, and only when
  // something is selected, so plain arrows still scroll the page otherwise.
  useEffect(() => {
    const onKey = (e) => {
      if (helpOpen || contextMenu) return
      if (isEditableTarget(e.target)) return
      if (selectedTextId == null && selectedImageId == null && selectedShapeId == null) return
      if (e.key === 'Escape') {
        selectText(null)
        return
      }
      if (isDeleteKey(e.key)) {
        e.preventDefault()
        if (selectedTextId != null) deleteText(selectedTextId)
        else if (selectedImageId != null) deleteImage(selectedImageId)
        else if (selectedShapeId != null) deleteShape(selectedShapeId)
        return
      }
      const delta = nudgeDelta(e.key, e.shiftKey ? state.grid.spacing : 1)
      if (delta) {
        e.preventDefault()
        nudgeSelected(delta[0], delta[1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [helpOpen, contextMenu, selectedTextId, selectedImageId, selectedShapeId, selectText, deleteText, deleteImage, deleteShape, nudgeSelected, state.grid.spacing])

  // Inline the custom fonts actually used by text layers as base64 @font-face
  // rules in the cloned SVG, so PNG and SVG exports render and stay portable.
  // Font files come from the Developer API catalog (gstatic URLs are CORS-
  // enabled, unlike the CSS endpoint). Only the weights/styles in use are
  // embedded. Fetch failures are swallowed so export still succeeds.
  const embedFontsInClone = useCallback(async (clone) => {
    const used = new Set(state.texts.map(t => t.fontFamily))
    const families = (state.fonts || []).filter(f => used.has(f))
    if (families.length === 0) return
    const catalog = await loadFontCatalog()
    const byFamily = new Map(catalog.map(item => [item.family, item]))
    const rules = []
    for (const family of families) {
      const item = byFamily.get(family)
      if (!item || !item.files) continue
      const variants = new Set(
        state.texts.filter(t => t.fontFamily === family).map(t => fontVariantKey(t.bold, t.italic))
      )
      for (const variant of variants) {
        const fileUrl = pickVariantFile(item.files, variant)
        if (!fileUrl) continue
        try {
          const res = await fetch(fileUrl.replace(/^http:/, 'https:'))
          if (!res.ok) continue
          const dataUri = `data:font/ttf;base64,${bufferToBase64(await res.arrayBuffer())}`
          const { weight, style } = variantFontFace(variant)
          rules.push(buildFontFaceRule(family, { url: dataUri, weight, style, format: 'truetype' }))
        } catch {
          // Could not fetch this face; export proceeds with a fallback.
        }
      }
    }
    if (rules.length === 0) return
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.setAttribute('data-embedded-fonts', '')
    style.textContent = rules.join('\n')
    clone.insertBefore(style, clone.firstChild)
  }, [state.texts, state.fonts, loadFontCatalog])

  // Rasterize a prepared SVG clone (grid/selection stripped, fonts embedded,
  // width/height set) to a PNG Blob at the chosen export size. Shared by the
  // single PNG export and batch export.
  const svgCloneToPngBlob = useCallback((clone) => {
    const size = clampExportSize(state.exportSize)
    const svgStr = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }))
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = exportScale(size, CANVAS_SIZE)
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
      img.src = url
    })
  }, [state.exportSize])

  // Export PNG
  const exportPNG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    stripExportArtifacts(clone)
    clone.setAttribute('width', CANVAS_SIZE)
    clone.setAttribute('height', CANVAS_SIZE)
    await embedFontsInClone(clone)
    const blob = await svgCloneToPngBlob(clone)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.png'
    a.click()
  }, [embedFontsInClone, svgCloneToPngBlob])

  // Batch export: apply the current layout to several uploaded images and
  // download them as a ZIP. Each image is swapped into a clone of the live SVG
  // as the background (cropped with the current zoom/pan and filtered the same),
  // rasterized to PNG, and stored (uncompressed) in the archive.
  const batchExport = useCallback(async (files) => {
    const list = Array.from(files || [])
    const svgEl = containerRef.current?.querySelector('svg')
    if (list.length === 0 || !svgEl) return
    setBatchBusy(true)
    try {
      const filterActive = isFilterActive(state.backgroundFilters)
      const entries = []
      for (let i = 0; i < list.length; i++) {
        let loaded
        try { loaded = await loadImageFile(list[i]) } catch { continue }
        const clone = svgEl.cloneNode(true)
        stripExportArtifacts(clone)
        clone.setAttribute('width', CANVAS_SIZE)
        clone.setAttribute('height', CANVAS_SIZE)
        let bg = clone.querySelector('[data-layer="background"]')
        if (!bg) {
          bg = document.createElementNS('http://www.w3.org/2000/svg', 'image')
          bg.setAttribute('data-layer', 'background')
          bg.setAttribute('clip-path', 'url(#canvas-clip)')
          const gradient = clone.querySelector('[data-layer="background-gradient"]')
          const defs = clone.querySelector('defs')
          const ref = gradient ? gradient.nextSibling : (defs ? defs.nextSibling : clone.firstChild)
          clone.insertBefore(bg, ref)
        }
        const crop = backgroundCrop(loaded.naturalWidth, loaded.naturalHeight, CANVAS_SIZE, state.backgroundTransform || undefined)
        bg.setAttribute('href', loaded.data)
        bg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', loaded.data)
        bg.setAttribute('x', crop.x)
        bg.setAttribute('y', crop.y)
        bg.setAttribute('width', crop.width)
        bg.setAttribute('height', crop.height)
        bg.setAttribute('preserveAspectRatio', 'none')
        if (filterActive) bg.setAttribute('filter', 'url(#bg-filter)')
        await embedFontsInClone(clone)
        let blob
        try { blob = await svgCloneToPngBlob(clone) } catch { continue }
        const buf = new Uint8Array(await blob.arrayBuffer())
        const base = (list[i].name || `image-${i + 1}`).replace(/\.[^.]+$/, '')
        entries.push({ name: `${String(i + 1).padStart(2, '0')}-${base}.png`, data: buf })
      }
      if (entries.length > 0) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([buildZip(entries)], { type: 'application/zip' }))
        a.download = 'covers.zip'
        a.click()
      }
    } finally {
      setBatchBusy(false)
    }
  }, [state.backgroundFilters, state.backgroundTransform, embedFontsInClone, svgCloneToPngBlob])

  // Export SVG
  const exportSVG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    stripExportArtifacts(clone)
    clone.querySelectorAll('[data-text-id]').forEach(el => {
      el.style.cursor = ''
      el.style.userSelect = ''
    })
    const size = clampExportSize(state.exportSize)
    clone.setAttribute('width', size)
    clone.setAttribute('height', size)
    await embedFontsInClone(clone)

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.svg'
    a.click()
  }, [embedFontsInClone, state.exportSize])

  // Build a shareable edit link (state encoded in the URL hash, image excluded)
  // and copy it to the clipboard, falling back to a prompt if that is blocked.
  const copyShareLink = useCallback(async () => {
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#${SHARE_PARAM}=${encodeShareState(state)}`
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      window.prompt('Copy this share link:', url)
    }
  }, [state])

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
  const overlay = state.overlay || DEFAULT_OVERLAY
  const bgGradient = state.backgroundGradient || DEFAULT_BACKGROUND_GRADIENT
  const bgTransform = state.backgroundTransform || DEFAULT_BACKGROUND_TRANSFORM
  const bgFilters = state.backgroundFilters || DEFAULT_FILTERS
  const exportSize = clampExportSize(state.exportSize)
  const layerList = buildLayerList(state, { selectedTextId, selectedImageId, selectedShapeId })

  // Actions for the right-click menu, resolved to the handlers for its layer kind.
  const ctxActions = useMemo(() => {
    if (!contextMenu) return []
    const { kind, id } = contextMenu
    const dup = kind === 'text' ? duplicateText : kind === 'image' ? duplicateImage : duplicateShape
    const toFront = kind === 'text' ? handleBringToFront : kind === 'image' ? handleImageToFront : handleShapeToFront
    const toBack = kind === 'text' ? handleSendToBack : kind === 'image' ? handleImageToBack : handleShapeToBack
    const del = kind === 'text' ? deleteText : kind === 'image' ? deleteImage : deleteShape
    return [
      { label: 'Duplicate', icon: Copy, onClick: () => dup(id) },
      { label: 'Bring to front', icon: BringToFront, onClick: () => toFront(id) },
      { label: 'Send to back', icon: SendToBack, onClick: () => toBack(id) },
      { label: 'Delete', icon: Trash2, onClick: () => del(id), danger: true },
    ]
  }, [contextMenu, duplicateText, duplicateImage, duplicateShape, handleBringToFront, handleImageToFront, handleShapeToFront, handleSendToBack, handleImageToBack, handleShapeToBack, deleteText, deleteImage, deleteShape])

  return (
    <div className={`flex flex-col lg:flex-row gap-6 p-4 lg:p-6 min-h-screen bg-gray-50 lg:items-start ${className}`}>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} actions={ctxActions} onClose={closeContextMenu} />}
      {/* Screen-reader announcements for layer and history changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live.msg + (live.n % 2 ? ' ' : '')}
      </div>
      {/* Canvas — square, stays visible on the left while the controls scroll */}
      <div ref={canvasColRef} className="w-full lg:w-[600px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start flex flex-col items-center gap-3">
        <div
          className={showRulers ? 'inline-grid' : 'w-full max-w-[600px]'}
          style={showRulers ? { gridTemplateColumns: `${RULER}px auto`, gridTemplateRows: `${RULER}px auto` } : undefined}
        >
          {showRulers && <div className="bg-gray-50" aria-hidden="true" />}
          {showRulers && <TopRuler displaySize={displaySize} />}
          {showRulers && <LeftRuler displaySize={displaySize} />}
          <div
            ref={containerRef}
            className={`aspect-square rounded-lg overflow-hidden shadow-md border border-gray-200 ${showRulers ? '' : 'w-full'}`}
            style={showRulers ? { width: displaySize, height: displaySize } : undefined}
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
              onContextMenuLayer={openContextMenu}
              displaySize={displaySize}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Exports at {exportSize}×{exportSize}px · click a layer to select · drag to move · Ctrl+Z to undo</p>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline cursor-pointer"
          onClick={() => setHelpOpen(true)}
        >
          <CircleHelp className="h-3.5 w-3.5" />Keyboard shortcuts &amp; help (F1)
        </button>
      </div>

      {/* Controls */}
      <AccordionContext.Provider value={{ isOpen: (id) => isCardOpen(accordion, id), isPinned: (id) => accordion.pinned.includes(id), toggleOpen: accToggleOpen, togglePin: accTogglePin }}>
      <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col gap-3">

        {/* Layers — overview of everything on the canvas; click an entry to open its controls */}
        <CollapsibleCard id="layers" title="Layers">
          {layerList.map(entry => (
            <LayerRow key={entry.key} entry={entry} onSelect={goToLayer} />
          ))}
          <p className="text-[11px] text-gray-400 leading-tight">Click a layer to open its controls. Listed front to back.</p>
        </CollapsibleCard>

        {/* Background */}
        <CollapsibleCard id="background" title="Background">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            className="w-full btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">{state.backgroundImage ? `Change image (${state.backgroundImage})` : 'Upload image'}</span>
          </button>
          {state.backgroundImage && (
            <button className="w-full btn-secondary text-sm" onClick={clearBackgroundImage}><Trash2 className="h-4 w-4" />Remove image</button>
          )}

          {state.backgroundImageData && state.backgroundNaturalWidth && (
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-2 mt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Crop &amp; position</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zoom ({Math.round(bgTransform.zoom * 100)}%)</label>
                <input type="range" aria-label="Background zoom" className="w-full accent-blue-500" min={100} max={400} value={Math.round(bgTransform.zoom * 100)} onChange={e => updateBackgroundTransform({ zoom: Number(e.target.value) / 100 }, 'bg-zoom')} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horizontal position</label>
                <input type="range" aria-label="Background horizontal position" className="w-full accent-blue-500" min={0} max={100} value={Math.round((bgTransform.panX ?? 0.5) * 100)} onChange={e => updateBackgroundTransform({ panX: Number(e.target.value) / 100 }, 'bg-panx')} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vertical position</label>
                <input type="range" aria-label="Background vertical position" className="w-full accent-blue-500" min={0} max={100} value={Math.round((bgTransform.panY ?? 0.5) * 100)} onChange={e => updateBackgroundTransform({ panY: Number(e.target.value) / 100 }, 'bg-pany')} />
              </div>
              <button className="w-full btn-secondary text-sm" onClick={() => updateBackgroundTransform(DEFAULT_BACKGROUND_TRANSFORM)}><RotateCcw className="h-4 w-4" />Reset crop</button>
            </div>
          )}

          {state.backgroundImageData && (
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-2 mt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Filters</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Brightness ({Math.round(bgFilters.brightness * 100)}%)</label>
                <input type="range" aria-label="Background brightness" className="w-full accent-blue-500" min={0} max={200} value={Math.round(bgFilters.brightness * 100)} onChange={e => updateBackgroundFilters({ brightness: Number(e.target.value) / 100 }, 'bg-brightness')} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contrast ({Math.round(bgFilters.contrast * 100)}%)</label>
                <input type="range" aria-label="Background contrast" className="w-full accent-blue-500" min={0} max={200} value={Math.round(bgFilters.contrast * 100)} onChange={e => updateBackgroundFilters({ contrast: Number(e.target.value) / 100 }, 'bg-contrast')} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Saturation ({Math.round(bgFilters.saturate * 100)}%)</label>
                <input type="range" aria-label="Background saturation" className="w-full accent-blue-500" min={0} max={200} value={Math.round(bgFilters.saturate * 100)} onChange={e => updateBackgroundFilters({ saturate: Number(e.target.value) / 100 }, 'bg-saturate')} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Blur ({bgFilters.blur}px)</label>
                <input type="range" aria-label="Background blur" className="w-full accent-blue-500" min={0} max={20} step={0.5} value={bgFilters.blur} onChange={e => updateBackgroundFilters({ blur: Number(e.target.value) }, 'bg-blur')} />
              </div>
              <button className="w-full btn-secondary text-sm" onClick={() => updateBackgroundFilters(DEFAULT_FILTERS)}><RotateCcw className="h-4 w-4" />Reset filters</button>
            </div>
          )}

          <div className="border-t border-gray-100 pt-2 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={bgGradient.enabled} onChange={e => updateBackgroundGradient({ enabled: e.target.checked })} className="accent-blue-500" />
              Gradient background
            </label>
            {bgGradient.enabled && (
              <div className="flex flex-col gap-2 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select className="input w-full" aria-label="Gradient type" value={bgGradient.type} onChange={e => updateBackgroundGradient({ type: e.target.value })}>
                    {BACKGROUND_GRADIENT_TYPES.map(t => <option key={t} value={t}>{t === 'linear' ? 'Linear' : 'Radial'}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start color</label>
                    <input type="color" aria-label="Gradient start color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={bgGradient.color} onChange={e => updateBackgroundGradient({ color: e.target.value }, 'bg-grad-color')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End color</label>
                    <input type="color" aria-label="Gradient end color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={bgGradient.color2} onChange={e => updateBackgroundGradient({ color2: e.target.value }, 'bg-grad-color2')} />
                  </div>
                </div>
                {bgGradient.type === 'linear' && (
                  <NumberInput label="Angle" value={bgGradient.angle} min={0} max={360} onChange={v => updateBackgroundGradient({ angle: v }, 'bg-grad-angle')} hint="0° top→bottom, 90° left→right" />
                )}
                {state.backgroundImage && (
                  <p className="text-[11px] text-gray-400 leading-tight">Hidden while a background image is loaded (it covers the canvas). Remove the image to see the gradient.</p>
                )}
              </div>
            )}
          </div>
        </CollapsibleCard>

        {/* Color overlay */}
        <CollapsibleCard id="overlay" title="Color Overlay">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={overlay.enabled} onChange={e => updateOverlay({ enabled: e.target.checked })} className="accent-blue-500" />
            Enable overlay
          </label>
          {overlay.enabled && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className="input w-full" aria-label="Overlay type" value={overlay.type} onChange={e => updateOverlay({ type: e.target.value })}>
                  {OVERLAY_TYPES.map(t => <option key={t} value={t}>{t === 'solid' ? 'Solid' : t === 'linear' ? 'Linear gradient' : 'Radial gradient'}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{overlay.type === 'solid' ? 'Color' : 'Start color'}</label>
                  <input type="color" aria-label="Overlay color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={overlay.color} onChange={e => updateOverlay({ color: e.target.value }, 'overlay-color')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{overlay.type === 'solid' ? 'Opacity' : 'Start opacity'} ({Math.round(clampOpacity(overlay.opacity) * 100)}%)</label>
                  <input type="range" aria-label="Overlay opacity" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round(clampOpacity(overlay.opacity) * 100)} onChange={e => updateOverlay({ opacity: clampOpacity(Number(e.target.value) / 100) }, 'overlay-opacity')} />
                </div>
              </div>
              {overlay.type !== 'solid' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End color</label>
                    <input type="color" aria-label="Overlay end color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={overlay.color2} onChange={e => updateOverlay({ color2: e.target.value }, 'overlay-color2')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End opacity ({Math.round(clampOpacity(overlay.opacity2) * 100)}%)</label>
                    <input type="range" aria-label="Overlay end opacity" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round(clampOpacity(overlay.opacity2) * 100)} onChange={e => updateOverlay({ opacity2: clampOpacity(Number(e.target.value) / 100) }, 'overlay-opacity2')} />
                  </div>
                </div>
              )}
              {overlay.type === 'linear' && (
                <NumberInput label="Angle" value={overlay.angle} min={0} max={360} onChange={v => updateOverlay({ angle: v }, 'overlay-angle')} hint="0° top→bottom, 90° left→right" />
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Blend mode</label>
                <select className="input w-full" aria-label="Overlay blend mode" value={overlay.blendMode} onChange={e => updateOverlay({ blendMode: e.target.value })}>
                  {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">Painted over the background, under your layers. Use a dark fill (or "multiply") to make text more legible.</p>
            </>
          )}
        </CollapsibleCard>

        {/* Text Layers */}
        <CollapsibleCard id="text-layers" title="Text Layers">
          <button className="w-full btn-primary" onClick={addText}><Plus className="h-4 w-4" />Add text</button>
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
                  <span className="select-none cursor-grab shrink-0" title="Drag to reorder" aria-hidden="true"><GripVertical className="h-4 w-4 text-gray-300" /></span>
                  <button
                    type="button"
                    className="truncate flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                    style={{ fontFamily: t.fontFamily, color: t.color !== '#ffffff' ? t.color : '#374151', fontWeight: t.bold ? 'bold' : 'normal', fontStyle: t.italic ? 'italic' : 'normal' }}
                    aria-pressed={selected}
                    onClick={(e) => { e.stopPropagation(); selectText(selected ? null : t.id) }}
                  >
                    {t.content || '(empty)'}
                  </button>
                  <button className="text-gray-400 hover:text-gray-700 inline-flex items-center px-1" title="Duplicate" aria-label="Duplicate text layer" onClick={(e) => { e.stopPropagation(); duplicateText(t.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Bring to front" aria-label="Bring text layer to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleBringToFront(t.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Send to back" aria-label="Send text layer to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleSendToBack(t.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-red-500 inline-flex items-center px-1" title="Delete" aria-label="Delete text layer" onClick={(e) => { e.stopPropagation(); deleteText(t.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </CollapsibleCard>

        {/* Selected Text Properties */}
        {selectedText && (
          <CollapsibleCard id="props-text" title="Text Properties">
            <label className="block text-xs text-gray-500 mb-1">Content</label>
            <input
              className="input w-full"
              aria-label="Text content"
              value={selectedText.content}
              onChange={e => updateText(selectedText.id, { content: e.target.value }, `content-${selectedText.id}`)}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Font</label>
                <select
                  className="input w-full"
                  aria-label="Font"
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
                  aria-label="Font size"
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
                  aria-label="Text color"
                  className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                  value={selectedText.color}
                  onChange={e => updateText(selectedText.id, { color: e.target.value }, `color-${selectedText.id}`)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Anchor</label>
                <select
                  className="input w-full"
                  aria-label="Text alignment"
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
                  aria-label="Text stroke color"
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
                      aria-label="Shadow color"
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

        {/* Image Layers */}
        <CollapsibleCard id="image-layers" title="Image Layers">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={addImageLayer} />
          <button className="w-full btn-primary" onClick={() => imageInputRef.current?.click()}><Plus className="h-4 w-4" />Add image</button>
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
                  <button
                    type="button"
                    className="truncate flex-1 text-left text-gray-700 bg-transparent border-0 p-0 cursor-pointer"
                    aria-pressed={selected}
                    onClick={(e) => { e.stopPropagation(); selectImage(selected ? null : img.id) }}
                  >
                    {img.name || 'image'}
                  </button>
                  <button className="text-gray-400 hover:text-gray-700 inline-flex items-center px-1" title="Duplicate" aria-label="Duplicate image layer" onClick={(e) => { e.stopPropagation(); duplicateImage(img.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Bring to front" aria-label="Bring image layer to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleImageToFront(img.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Send to back" aria-label="Send image layer to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleImageToBack(img.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-red-500 inline-flex items-center px-1" title="Delete" aria-label="Delete image layer" onClick={(e) => { e.stopPropagation(); deleteImage(img.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
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
                aria-label="Image opacity"
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
                aria-label="Image blend mode"
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
                aria-label="Image size"
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
            <button className="w-full btn-secondary text-sm" onClick={() => deleteImage(selectedImage.id)}><Trash2 className="h-4 w-4" />Delete image</button>
          </CollapsibleCard>
          )
        })()}

        {/* Shapes */}
        <CollapsibleCard id="shapes" title="Shapes">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary text-sm" onClick={() => addShape('rect')}><Square className="h-4 w-4" />Rectangle</button>
            <button className="btn-primary text-sm" onClick={() => addShape('circle')}><Circle className="h-4 w-4" />Circle</button>
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
                  <button
                    type="button"
                    className="truncate flex-1 text-left text-gray-700 capitalize bg-transparent border-0 p-0 cursor-pointer"
                    aria-pressed={selected}
                    onClick={(e) => { e.stopPropagation(); selectShape(selected ? null : shape.id) }}
                  >
                    {shape.type}
                  </button>
                  <button className="text-gray-400 hover:text-gray-700 inline-flex items-center px-1" title="Duplicate" aria-label="Duplicate shape" onClick={(e) => { e.stopPropagation(); duplicateShape(shape.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Bring to front" aria-label="Bring shape to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleShapeToFront(shape.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 inline-flex items-center px-1" title="Send to back" aria-label="Send shape to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleShapeToBack(shape.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="text-gray-400 hover:text-red-500 inline-flex items-center px-1" title="Delete" aria-label="Delete shape" onClick={(e) => { e.stopPropagation(); deleteShape(shape.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
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
                <input type="color" aria-label="Shape fill color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={selectedShape.fill} onChange={e => updateShape(selectedShape.id, { fill: e.target.value }, `shape-fill-${selectedShape.id}`)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stroke</label>
                <input type="color" aria-label="Shape stroke color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={selectedShape.stroke} onChange={e => updateShape(selectedShape.id, { stroke: e.target.value }, `shape-stroke-${selectedShape.id}`)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Stroke width" value={selectedShape.strokeWidth} min={0} max={40} onChange={v => updateShape(selectedShape.id, { strokeWidth: v }, `shape-sw-${selectedShape.id}`)} hint="0 = off" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round((selectedShape.opacity ?? 1) * 100)}%)</label>
                <input type="range" aria-label="Shape opacity" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round((selectedShape.opacity ?? 1) * 100)} onChange={e => updateShape(selectedShape.id, { opacity: clampOpacity(Number(e.target.value) / 100) }, `shape-opacity-${selectedShape.id}`)} />
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
            <button className="w-full btn-secondary text-sm" onClick={() => deleteShape(selectedShape.id)}><Trash2 className="h-4 w-4" />Delete shape</button>
          </CollapsibleCard>
        )}

        {/* Template */}
        <CollapsibleCard id="template" title="Template">
          <select
            className="input w-full"
            value={selectedTemplate}
            aria-label="Template"
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
            <LayoutTemplate className="h-4 w-4" />Apply template
          </button>
          <p className="text-[11px] text-gray-400 leading-tight">Replaces text layers and grid; keeps your image. Undo with Ctrl+Z.</p>
        </CollapsibleCard>

        {/* History */}
        <CollapsibleCard id="history" title="History">
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={doUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />Undo
            </button>
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={doRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />Redo
            </button>
          </div>
        </CollapsibleCard>

        {/* Fonts */}
        <CollapsibleCard id="fonts" title="Fonts">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <input
                className="input w-full pl-7"
                placeholder={googleFontsApiKey ? 'Search Google Fonts…' : 'Google font name'}
                aria-label="Search or add a Google font"
                value={customFontInput}
                onFocus={ensureFontCatalog}
                onChange={e => { setCustomFontInput(e.target.value); ensureFontCatalog() }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFont(customFontInput) }}
              />
            </div>
            <button
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!customFontInput.trim()}
              onClick={() => handleAddFont(customFontInput)}
            >
              <Plus className="h-4 w-4" />Add
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

        {/* Grid & rulers */}
        <CollapsibleCard id="grid" title="Grid & rulers">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.grid.enabled} onChange={e => updateGrid({ enabled: e.target.checked })} className="accent-blue-500" />
            Show grid
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.snapToGrid} onChange={e => update({ snapToGrid: e.target.checked })} className="accent-blue-500" />
            Snap to grid
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showRulers} onChange={e => setShowRulers(e.target.checked)} className="accent-blue-500" />
            Show rulers
          </label>
          {state.grid.enabled && (
            <>
              <NumberInput label="Spacing (px)" value={state.grid.spacing} min={5} max={100} onChange={v => updateGrid({ spacing: v }, 'grid-spacing')} />
              <NumberInput label="Major line every N" value={state.grid.majorEvery} min={0} max={20} onChange={v => updateGrid({ majorEvery: v }, 'grid-major')} hint="0 = off" />
            </>
          )}
        </CollapsibleCard>

        {/* Export / Import */}
        <CollapsibleCard id="export" title="Export & Import">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Export size</label>
            <select
              className="input w-full"
              value={exportSize}
              aria-label="Export size"
              onChange={e => update({ exportSize: clampExportSize(Number(e.target.value)) })}
            >
              {CANVAS_PRESETS.map(p => <option key={p.id} value={p.size}>{p.label}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 leading-tight mt-1">Sets the PNG pixel size and the SVG width/height. The editing canvas is always square.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary text-sm" onClick={exportPNG}><FileImage className="h-4 w-4" />Export PNG</button>
            <button className="btn-secondary text-sm" onClick={exportSVG}><FileCode className="h-4 w-4" />Export SVG</button>
          </div>
          <button className="w-full btn-secondary text-sm" onClick={exportJSON}><Save className="h-4 w-4" />Save JSON state</button>
          <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJSONImport} />
          <button className="w-full btn-secondary text-sm" onClick={() => jsonInputRef.current?.click()}><FolderOpen className="h-4 w-4" />Load JSON state</button>
          <button className="w-full btn-secondary text-sm" onClick={copyShareLink}><Link className="h-4 w-4" />{shareCopied ? 'Link copied!' : 'Copy share link'}</button>
          <p className="text-[11px] text-gray-400 leading-tight">The share link encodes the layout in the URL (the background image is not included).</p>
          <input ref={batchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { batchExport(e.target.files); e.target.value = '' }} />
          <button
            className="w-full btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={batchBusy}
            onClick={() => batchFileInputRef.current?.click()}
          >
            <Package className="h-4 w-4" />{batchBusy ? 'Exporting…' : 'Batch export (ZIP)'}
          </button>
          <p className="text-[11px] text-gray-400 leading-tight">Applies the current layout (text, shapes, crop, filters) to several images and downloads a ZIP of PNGs.</p>
        </CollapsibleCard>
      </div>
      </AccordionContext.Provider>
    </div>
  )
}

function NumberInput({ label, value, min, max, onChange, hint }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 mb-1">{label}{hint && <span className="text-gray-400 ml-1">({hint})</span>}</label>
      <input
        id={id}
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
