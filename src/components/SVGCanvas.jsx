import { useState, useRef, useLayoutEffect } from 'react'
import { textShadowFilter } from '../lib/text'
import { lineEndpoints } from '../lib/shapes'
import { ResizeHandles, LineResizeHandles } from './ResizeHandles'
import { backgroundCrop } from '../lib/background'
import { GradientBackground, ColorOverlay } from './CanvasBackground'
import { TextElement } from './TextElement'
import { ImageElement } from './ImageElement'
import { ShapeElement } from './ShapeElement'
import { DEFAULT_FILTERS, isFilterActive, brightnessContrastTransfer } from '../lib/filters'
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../lib/constants'
import { GridOverlay } from './GridOverlay'

// The SVG canvas. Accepts interactive props (selection ids, event handlers) for
// use inside the editor; pass nulls/no-ops for headless rendering.
export function SVGCanvas({ state, selectedTextId, selectedImageId, selectedShapeId, onSelectText, onSelectImage, onSelectShape, onDragText, onDragImage, onDragShape, onResizeImage, onResizeShape, onContextMenuLayer, displayWidth, displayHeight }) {
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

  const cw = state.canvasWidth || DEFAULT_CANVAS_WIDTH
  const ch = state.canvasHeight || DEFAULT_CANVAS_HEIGHT

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${cw} ${ch}`}
      style={{ display: 'block', background: '#ffffff' }}
      role="group"
      aria-label="Cover canvas"
      onClick={(e) => {
        if (e.target.tagName === 'svg') {
          onSelectText?.(null)
          onSelectImage?.(null)
          onSelectShape?.(null)
        }
      }}
      onContextMenu={(e) => {
        const el = e.target.closest && e.target.closest('[data-text-id],[data-image-id],[data-shape-id]')
        if (!el) return
        e.preventDefault()
        const d = el.dataset
        if (d.textId !== undefined) onContextMenuLayer?.('text', Number(d.textId), e.clientX, e.clientY)
        else if (d.imageId !== undefined) onContextMenuLayer?.('image', Number(d.imageId), e.clientX, e.clientY)
        else if (d.shapeId !== undefined) onContextMenuLayer?.('shape', Number(d.shapeId), e.clientX, e.clientY)
      }}
    >
      <defs>
        <clipPath id="canvas-clip">
          <rect x={0} y={0} width={cw} height={ch} />
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

      <GradientBackground gradient={state.backgroundGradient} canvasWidth={cw} canvasHeight={ch} />

      {state.backgroundImageData && (() => {
        const nW = state.backgroundNaturalWidth
        const nH = state.backgroundNaturalHeight
        // Fall back to slice when the natural size is unknown (e.g. an image
        // supplied via initialState rather than the uploader).
        if (!nW || !nH) {
          return (
            <image
              href={state.backgroundImageData}
              x={0} y={0} width={cw} height={ch}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#canvas-clip)"
              filter={bgFilterRef}
              data-layer="background"
            />
          )
        }
        const c = backgroundCrop(nW, nH, cw, ch, state.backgroundTransform || undefined)
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

      <ColorOverlay overlay={state.overlay} canvasWidth={cw} canvasHeight={ch} />

      {(state.images || []).filter(image => !image.hidden).map((image) => (
        <ImageElement
          key={image.id}
          image={image}
          selected={image.id === selectedImageId}
          locked={!!image.locked}
          onSelect={onSelectImage}
          onDrag={onDragImage}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      {(state.shapes || []).filter(shape => !shape.hidden).map((shape) => (
        <ShapeElement
          key={shape.id}
          shape={shape}
          selected={shape.id === selectedShapeId}
          locked={!!shape.locked}
          onSelect={onSelectShape}
          onDrag={onDragShape}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      <GridOverlay grid={state.grid} canvasWidth={cw} canvasHeight={ch} />

      {state.texts.filter(text => !text.hidden).map((text) => (
        <TextElement
          key={text.id}
          text={text}
          selected={text.id === selectedTextId}
          locked={!!text.locked}
          onSelect={onSelectText}
          onDrag={onDragText}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      {selectedImageId && (state.images || []).find(i => i.id === selectedImageId && !i.hidden) && (() => {
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
            {!img.locked && <ResizeHandles box={img} ratio={ratio} onResize={(patch) => onResizeImage(img.id, patch)} />}
          </g>
        )
      })()}

      {selectedShapeId && (state.shapes || []).find(s => s.id === selectedShapeId && !s.hidden) && (() => {
        const shape = state.shapes.find(s => s.id === selectedShapeId)
        if (shape.type === 'line') {
          const ep = lineEndpoints(shape)
          return (
            <g data-layer="selection">
              <line x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" style={{ pointerEvents: 'none' }} />
              {!shape.locked && <LineResizeHandles shape={shape} onResize={(patch) => onResizeShape?.(shape.id, patch)} />}
            </g>
          )
        }
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

      {textBox && selectedTextId && state.texts.some(t => t.id === selectedTextId && !t.hidden) && (() => {
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
