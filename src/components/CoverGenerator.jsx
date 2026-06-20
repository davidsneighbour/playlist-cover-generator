import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { reorder, bringToFront, sendToBack, displayIndexToArrayIndex, duplicateById } from '../lib/layers'
import { TEMPLATES, getTemplate, instantiateTemplate } from '../lib/templates'
import { BUILTIN_FONTS, googleFontCssUrl, addFont, googleFontsListUrl, filterFontNames } from '../lib/fonts'
import { BLEND_MODES, createImageLayer, clampOpacity, centeredPosition, coverDimensions, scaleDimensions, dimensionPercent, aspectHeight, aspectWidth } from '../lib/images'
import { createShape } from '../lib/shapes'
import { DEFAULT_OVERLAY, OVERLAY_TYPES } from '../lib/overlay'
import { DEFAULT_BACKGROUND_GRADIENT, BACKGROUND_GRADIENT_TYPES, DEFAULT_BACKGROUND_TRANSFORM, backgroundCrop } from '../lib/background'
import { DEFAULT_FILTERS, isFilterActive } from '../lib/filters'
import { CANVAS_PRESETS, DEFAULT_EXPORT_WIDTH, DEFAULT_EXPORT_HEIGHT, clampExportSize } from '../lib/canvas'
import { nudgeDelta, isDeleteKey, isEditableTarget } from '../lib/shortcuts'
import { prepareCloneForExport, clearInteractionStyles, embedFontsInClone, svgCloneToPngBlob } from '../lib/export'
import { mergeInitialState } from '../lib/state'
import { snapValue } from '../lib/grid'
import { useHistoryState } from '../hooks/useHistoryState'
import { useDebounce } from '../hooks/useDebounce'
import { STORAGE_KEY, serializeStateWithoutImage, parseStoredState } from '../lib/storage'
import { saveImageToIdb, loadImageFromIdb, deleteImageFromIdb } from '../lib/idb'
import { SHARE_PARAM, encodeShareState, decodeShareState, readShareToken } from '../lib/share'
import { buildZip } from '../lib/zip'
import { actionAnnouncement, layerNoun } from '../lib/a11y'
import { buildLayerList } from '../lib/layerList'
import { averageRgb, pickContrastColor } from '../lib/color'
import { isOpen as isCardOpen, toggleOpen, togglePin, openCard } from '../lib/accordion'
import { AccordionContext, CollapsibleCard } from './Accordion'
import {
  Undo2, Redo2, LayoutTemplate, Plus, Search, Upload, Trash2, RotateCcw,
  Square, Circle, Triangle, GripVertical, Copy, BringToFront, SendToBack,
  FileImage, FileCode, Save, FolderOpen, Link, Package, CircleHelp,
  Type, Blend, Image as ImageIcon, Eye, EyeOff, Lock, LockOpen, Loader2, Check, FilePlus, Minus,
} from 'lucide-react'
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, RULER, DUP_OFFSET } from '../lib/constants'
import { TopRuler, LeftRuler } from './Rulers'
import { NumberInput } from './NumberInput'
import { HelpDialog } from './HelpDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { ContextMenu } from './ContextMenu'
import { SVGCanvas } from './SVGCanvas'

// Optional Google Fonts API key for the font-search typeahead. Read from the
// Vite env by default; a host embedding the component can pass its own.
const ENV_GOOGLE_FONTS_API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY
// IndexedDB key for persisting the background image separately from localStorage.
const IDB_IMAGE_KEY = `${STORAGE_KEY}-image`

// Module-level catalog cache: one promise per API key, persists across mounts
// so the Google Fonts API is called at most once per browser session.
const _fontCatalogCache = new Map()

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
  canvasWidth: DEFAULT_CANVAS_WIDTH,
  canvasHeight: DEFAULT_CANVAS_HEIGHT,
  exportWidth: DEFAULT_EXPORT_WIDTH,
  exportHeight: DEFAULT_EXPORT_HEIGHT,
}

let nextId = 1

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

// Help overlay: app info, version, keyboard shortcuts, and mouse tips. Opened
// and closed with F1 (handled by the component); also closes on Escape, on a
// click outside the panel (both via Headless UI Dialog's onClose), and on the X.
// Icon glyphs for the Layers overview rows, keyed by the entry's `icon` string
// from buildLayerList (kept out of the lib so it stays DOM-free and testable).
const LAYER_ICONS = { type: Type, square: Square, circle: Circle, triangle: Triangle, minus: Minus, image: ImageIcon, blend: Blend }

// One row in the Layers overview panel. Clicking it jumps to that layer's
// controls (selecting it, or opening the background/overlay card). Selection is
// reflected like the per-type lists; singletons that are off/empty are muted.
function LayerRow({ entry, onSelect, onToggleVisibility, onToggleLock, onRename, onDragStart, onDragEnd, onDragOver, onDrop, dropHighlight }) {
  const Icon = LAYER_ICONS[entry.icon]
  // Real layers (text/image/shape) carry an id; singletons (overlay/background) do not.
  const toggleable = entry.id != null
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = (e) => {
    e.stopPropagation()
    setEditValue(entry.name || '')
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== (entry.name || '')) onRename(entry, trimmed)
  }

  const cancelEdit = () => setEditing(false)

  const draggable = toggleable && !editing

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(entry) } : undefined}
      onDragEnd={draggable ? () => onDragEnd?.() : undefined}
      onDragOver={toggleable ? (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const rect = e.currentTarget.getBoundingClientRect()
        onDragOver?.(entry, e.clientY < rect.top + rect.height / 2)
      } : undefined}
      onDrop={toggleable ? (e) => {
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        onDrop?.(entry, e.clientY < rect.top + rect.height / 2)
      } : undefined}
      className={`flex w-full items-center gap-1.5 rounded border px-2 py-1.5 text-sm transition-colors
        ${entry.selected ? 'border-blue-400 bg-blue-50 text-gray-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}
        ${dropHighlight === 'above' ? 'border-t-2 border-t-blue-500' : ''}
        ${dropHighlight === 'below' ? 'border-b-2 border-b-blue-500' : ''}`}
    >
      {toggleable && !editing
        ? <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 cursor-grab" aria-hidden="true" />
        : <span className="w-3.5 shrink-0" aria-hidden="true" />
      }
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-0 bg-transparent border-b border-blue-400 outline-none text-sm py-0 px-0"
          value={editValue}
          placeholder={entry.label}
          aria-label="Layer name"
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect(entry)}
          onDoubleClick={toggleable ? startEdit : undefined}
          aria-pressed={entry.selected}
          title={toggleable ? 'Click to select · double-click to rename' : undefined}
          className="flex flex-1 items-center gap-2 text-left cursor-pointer min-w-0"
        >
          {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${entry.muted ? 'text-gray-300' : 'text-gray-400'}`} aria-hidden="true" />}
          <span className={`truncate flex-1 ${entry.muted ? 'text-gray-400 italic' : ''}`}>{entry.label}</span>
        </button>
      )}
      {toggleable && !editing && (
        <>
          <button
            type="button"
            onClick={() => onToggleLock(entry)}
            aria-pressed={entry.locked}
            title={entry.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={entry.locked ? 'Unlock layer' : 'Lock layer'}
            className="shrink-0 btn-icon text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            {entry.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onToggleVisibility(entry)}
            aria-pressed={!entry.hidden}
            title={entry.hidden ? 'Show layer' : 'Hide layer'}
            aria-label={entry.hidden ? 'Show layer' : 'Hide layer'}
            className="shrink-0 btn-icon text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            {entry.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </>
      )}
    </div>
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
  const { state, canUndo, canRedo, commit, undo, redo, reset } = useHistoryState(
    mergeInitialState(DEFAULT_STATE, restored, sharedFromUrl, initialState),
  )
  const update = commit
  // Speak a message through the ARIA live region (re-announces repeats via the
  // changing nonce, see the rendered region below).
  const announce = useCallback((msg) => setLive(l => ({ msg, n: l.n + 1 })), [])
  const doUndo = useCallback(() => { undo(); announce('Undo') }, [undo, announce])
  const doRedo = useCallback(() => { redo(); announce('Redo') }, [redo, announce])
  const handleNewProject = useCallback(() => {
    reset(DEFAULT_STATE)
    if (autoSave && typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    if (autoSave && typeof indexedDB !== 'undefined') deleteImageFromIdb(IDB_IMAGE_KEY).catch(() => {})
    setSelectedTextId(null)
    setSelectedImageId(null)
    setSelectedShapeId(null)
    setCustomSizeMode(false)
    announce('New project')
  }, [reset, autoSave, announce])
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [selectedShapeId, setSelectedShapeId] = useState(null)
  const [displayWidth, setDisplayWidth] = useState(DEFAULT_CANVAS_WIDTH)
  const [displayHeight, setDisplayHeight] = useState(DEFAULT_CANVAS_HEIGHT)
  const [showRulers, setShowRulers] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const layerDraggingRef = useRef(null) // { kind, id } while a layer row drag is in progress
  const [layerDropTarget, setLayerDropTarget] = useState(null) // { key, before } | null
  const [shareCopied, setShareCopied] = useState(false)
  const [customSizeMode, setCustomSizeMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'pending'
  const [batchBusy, setBatchBusy] = useState(false)
  const [live, setLive] = useState({ msg: '', n: 0 })
  const [dragOverArrayIndex, setDragOverArrayIndex] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
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

  // Map a layer-list entry kind to its array key in state. Only text/image/shape
  // are stored as arrays of layers; returns null for the singletons.
  const layerArrayKey = (kind) => (kind === 'text' ? 'texts' : kind === 'image' ? 'images' : kind === 'shape' ? 'shapes' : null)

  // Drag-to-reorder handlers for the unified Layers panel. Identity of the
  // dragged layer lives in a ref (not state) to avoid stale closures in the
  // dragover/drop callbacks which are called many times per second.
  const handleLayerDragStart = useCallback((entry) => {
    layerDraggingRef.current = { kind: entry.kind, id: entry.id }
  }, [])

  const handleLayerDragEnd = useCallback(() => {
    layerDraggingRef.current = null
    setLayerDropTarget(null)
  }, [])

  const handleLayerDragOver = useCallback((toEntry, before) => {
    const from = layerDraggingRef.current
    if (!from || from.kind !== toEntry.kind || from.id === toEntry.id) {
      setLayerDropTarget(null)
      return
    }
    setLayerDropTarget({ key: toEntry.key, before })
  }, [])

  const handleLayerDrop = useCallback((toEntry, before) => {
    const from = layerDraggingRef.current
    layerDraggingRef.current = null
    setLayerDropTarget(null)
    if (!from || from.kind !== toEntry.kind || from.id === toEntry.id) return

    const arrKey = layerArrayKey(from.kind)
    if (!arrKey) return

    update(prev => {
      const arr = prev[arrKey] || []
      const fromArrIdx = arr.findIndex(l => l.id === from.id)
      const toArrIdx = arr.findIndex(l => l.id === toEntry.id)
      if (fromArrIdx < 0 || toArrIdx < 0) return prev
      // Display is front-to-back = reverse of the paint-order array. Dropping
      // 'before' a row in display means the item goes in front of that row in
      // z-order (higher array index); 'after' means one step further back.
      const targetArrIdx = before ? toArrIdx : Math.max(0, toArrIdx - 1)
      const next = reorder(arr, fromArrIdx, targetArrIdx)
      if (next === arr) return prev
      return { ...prev, [arrKey]: next }
    })
  }, [update])

  // Toggle a per-layer boolean flag (hidden/locked) by id. One undo step each.
  const setLayerFlag = useCallback((entry, flag, value) => {
    const key = layerArrayKey(entry.kind)
    if (!key) return
    update(prev => ({ ...prev, [key]: (prev[key] || []).map(l => l.id === entry.id ? { ...l, [flag]: value } : l) }))
  }, [update])

  const toggleLayerVisibility = useCallback((entry) => {
    setLayerFlag(entry, 'hidden', !entry.hidden)
    announce(`${layerNoun(entry.kind)} ${entry.hidden ? 'shown' : 'hidden'}`)
  }, [setLayerFlag, announce])

  const toggleLayerLock = useCallback((entry) => {
    setLayerFlag(entry, 'locked', !entry.locked)
    announce(`${layerNoun(entry.kind)} ${entry.locked ? 'unlocked' : 'locked'}`)
  }, [setLayerFlag, announce])

  const renameLayer = useCallback((entry, name) => {
    const key = layerArrayKey(entry.kind)
    if (!key) return
    update(prev => ({ ...prev, [key]: (prev[key] || []).map(l => l.id === entry.id ? { ...l, name } : l) }))
  }, [update])

  // Fit the canvas to the column, preserving the template's aspect ratio and
  // leaving room for the rulers when shown. Re-runs when the ruler toggle or the
  // canvas dimensions change so it recalculates immediately.
  useEffect(() => {
    const cw = state.canvasWidth || DEFAULT_CANVAS_WIDTH
    const ch = state.canvasHeight || DEFAULT_CANVAS_HEIGHT
    const measure = (colW) => {
      const available = Math.max(0, colW - (showRulers ? RULER : 0))
      const dw = Math.min(cw, available)
      const dh = Math.round(dw * ch / cw)
      setDisplayWidth(dw)
      setDisplayHeight(dh)
    }
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) measure(entry.contentRect.width)
    })
    const el = canvasColRef.current
    if (el) {
      obs.observe(el)
      measure(el.getBoundingClientRect().width)
    }
    return () => obs.disconnect()
  }, [showRulers, state.canvasWidth, state.canvasHeight])

  // Notify the host of state changes, skipping the initial mount.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onStateChange?.(state)
  }, [state, onStateChange])

  // Auto-save the session: layout (without image) to localStorage, background
  // image to IndexedDB. Keeping the large data URL out of localStorage avoids
  // quota issues entirely. Both writes are best-effort.
  const didMountSave = useRef(false)
  useEffect(() => {
    if (!autoSave || typeof localStorage === 'undefined') return
    // Skip the first run — the mounted state is already persisted.
    if (!didMountSave.current) { didMountSave.current = true; return }
    setSaveStatus('pending')
    const id = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, serializeStateWithoutImage(state)) } catch { /* quota */ }
      if (typeof indexedDB !== 'undefined') {
        const idbOp = state.backgroundImageData
          ? saveImageToIdb(IDB_IMAGE_KEY, state.backgroundImageData)
          : deleteImageFromIdb(IDB_IMAGE_KEY)
        idbOp.catch(() => {}) // fire and forget; degrade gracefully on failure
      }
      setSaveStatus('saved')
    }, 500)
    return () => clearTimeout(id)
  }, [state, autoSave])

  // On mount, load the background image from IndexedDB and merge it into the
  // restored state without creating a history entry. Skipped when an explicit
  // initialState or a share link is used (they provide their own content) and
  // when IndexedDB is unavailable.
  useEffect(() => {
    if (!autoSave || initialState || sharedFromUrl || typeof indexedDB === 'undefined') return
    ;(async () => {
      try {
        const data = await loadImageFromIdb(IDB_IMAGE_KEY)
        if (data) {
          // Use reset() so the image load is the initial history entry, not an
          // undoable step. `state` here is the layout already restored from
          // localStorage (the effect captures it from the first render).
          reset({ ...state, backgroundImageData: data })
        }
      } catch { /* ignore — image simply won't be restored */ }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once at mount

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
        name: '',
        content: 'New text',
        x: snapValue((prev.canvasWidth || DEFAULT_CANVAS_WIDTH) / 2, prev.grid.spacing, prev.snapToGrid),
        y: snapValue((prev.canvasHeight || DEFAULT_CANVAS_HEIGHT) / 2, prev.grid.spacing, prev.snapToGrid),
        fontSize: 48,
        fontFamily: 'sans-serif',
        color: pickContrastColor(bgColorRef.current),
        bold: false,
        italic: false,
        anchor: 'middle',
        stroke: '#000000',
        strokeWidth: 0,
        shadow: null,
        lineHeight: 1.2,
        opacity: 1,
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

  // Fetch the Google Fonts catalog once per session (module-level cache keyed
  // by API key), shared by the typeahead and by export embedding. Each item
  // carries its gstatic font-file URLs, which are CORS-enabled and inlinable.
  const loadFontCatalog = useCallback(() => {
    if (!googleFontsApiKey) return Promise.resolve([])
    if (!_fontCatalogCache.has(googleFontsApiKey)) {
      _fontCatalogCache.set(
        googleFontsApiKey,
        fetch(googleFontsListUrl(googleFontsApiKey))
          .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
          .then(json => json.items || [])
          .catch(() => [])
      )
    }
    return _fontCatalogCache.get(googleFontsApiKey)
  }, [googleFontsApiKey])

  // Lazily populate the typeahead name list from the catalog. Failures (or no
  // key) degrade to no suggestions.
  const [googleFonts, setGoogleFonts] = useState(null)
  const ensureFontCatalog = useCallback(() => {
    if (googleFonts !== null || !googleFontsApiKey) return
    loadFontCatalog().then(items => setGoogleFonts(items.map(i => i.family)))
  }, [googleFonts, googleFontsApiKey, loadFontCatalog])

  const debouncedFontInput = useDebounce(customFontInput, 150)
  const fontSuggestions = useMemo(() => {
    if (!googleFonts || googleFonts.length === 0) return []
    const have = new Set([...BUILTIN_FONTS, ...(state.fonts || [])])
    return filterFontNames(googleFonts, debouncedFontInput, 8).filter(n => !have.has(n))
  }, [googleFonts, debouncedFontInput, state.fonts])

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
        update(prev => {
          const cw = prev.canvasWidth || DEFAULT_CANVAS_WIDTH
          const ch = prev.canvasHeight || DEFAULT_CANVAS_HEIGHT
          const { width, height } = coverDimensions(probe.naturalWidth, probe.naturalHeight, cw, ch)
          const { x, y } = centeredPosition(cw, ch, width, height)
          return {
            ...prev,
            images: [...(prev.images || []), createImageLayer(id, { name: file.name, data, width, height, x, y, naturalWidth: probe.naturalWidth, naturalHeight: probe.naturalHeight })],
          }
        })
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

  const handleResizeShape = useCallback((id, patch) => {
    update(prev => ({
      ...prev,
      shapes: (prev.shapes || []).map(s => s.id === id ? { ...s, ...patch } : s),
    }), `shape-resize-${id}`)
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
      // Locked layers stay put even when selected via the panel.
      if (selectedTextId != null) return { ...prev, texts: prev.texts.map(t => t.id === selectedTextId && !t.locked ? { ...t, x: t.x + dx, y: t.y + dy } : t) }
      if (selectedImageId != null) return { ...prev, images: (prev.images || []).map(i => i.id === selectedImageId && !i.locked ? { ...i, x: i.x + dx, y: i.y + dy } : i) }
      if (selectedShapeId != null) return { ...prev, shapes: (prev.shapes || []).map(s => s.id === selectedShapeId && !s.locked ? { ...s, x: s.x + dx, y: s.y + dy } : s) }
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
        // Locked layers are not removed by the keyboard; unlock them first.
        if (selectedTextId != null) { if (!state.texts.find(t => t.id === selectedTextId)?.locked) deleteText(selectedTextId) }
        else if (selectedImageId != null) { if (!(state.images || []).find(i => i.id === selectedImageId)?.locked) deleteImage(selectedImageId) }
        else if (selectedShapeId != null) { if (!(state.shapes || []).find(s => s.id === selectedShapeId)?.locked) deleteShape(selectedShapeId) }
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
  }, [helpOpen, contextMenu, selectedTextId, selectedImageId, selectedShapeId, selectText, deleteText, deleteImage, deleteShape, nudgeSelected, state.grid.spacing, state.texts, state.images, state.shapes])

  // Export PNG
  const exportPNG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const ew = clampExportSize(state.exportWidth)
    const eh = clampExportSize(state.exportHeight)
    const clone = prepareCloneForExport(svgEl, ew, eh)
    await embedFontsInClone(clone, state.texts, state.fonts, loadFontCatalog)
    const blob = await svgCloneToPngBlob(clone, ew, eh, state.canvasWidth || DEFAULT_CANVAS_WIDTH, state.canvasHeight || DEFAULT_CANVAS_HEIGHT)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.png'
    a.click()
  }, [state.exportWidth, state.exportHeight, state.texts, state.fonts, loadFontCatalog, state.canvasWidth, state.canvasHeight])

  // Batch export: apply the current layout to several uploaded images and
  // download them as a ZIP. Each image is swapped into a clone of the live SVG
  // as the background (cropped with the current zoom/pan and filtered the same),
  // rasterized to PNG, and stored (uncompressed) in the archive.
  const batchExport = useCallback(async (files) => {
    const list = Array.from(files || [])
    const svgEl = containerRef.current?.querySelector('svg')
    if (list.length === 0 || !svgEl) return
    setBatchBusy(true)
    const ew = clampExportSize(state.exportWidth)
    const eh = clampExportSize(state.exportHeight)
    const bcw = state.canvasWidth || DEFAULT_CANVAS_WIDTH
    const bch = state.canvasHeight || DEFAULT_CANVAS_HEIGHT
    try {
      const filterActive = isFilterActive(state.backgroundFilters)
      const entries = []
      for (let i = 0; i < list.length; i++) {
        let loaded
        try { loaded = await loadImageFile(list[i]) } catch { continue }
        const clone = prepareCloneForExport(svgEl, bcw, bch)
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
        const crop = backgroundCrop(loaded.naturalWidth, loaded.naturalHeight, bcw, bch, state.backgroundTransform || undefined)
        bg.setAttribute('href', loaded.data)
        bg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', loaded.data)
        bg.setAttribute('x', crop.x)
        bg.setAttribute('y', crop.y)
        bg.setAttribute('width', crop.width)
        bg.setAttribute('height', crop.height)
        bg.setAttribute('preserveAspectRatio', 'none')
        if (filterActive) bg.setAttribute('filter', 'url(#bg-filter)')
        await embedFontsInClone(clone, state.texts, state.fonts, loadFontCatalog)
        let blob
        try { blob = await svgCloneToPngBlob(clone, ew, eh, bcw, bch) } catch { continue }
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
  }, [state.exportWidth, state.exportHeight, state.canvasWidth, state.canvasHeight, state.backgroundFilters, state.backgroundTransform, state.texts, state.fonts, loadFontCatalog])

  // Export SVG
  const exportSVG = useCallback(async () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const ew = clampExportSize(state.exportWidth)
    const eh = clampExportSize(state.exportHeight)
    const clone = prepareCloneForExport(svgEl, ew, eh)
    clearInteractionStyles(clone)
    await embedFontsInClone(clone, state.texts, state.fonts, loadFontCatalog)
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cover.svg'
    a.click()
  }, [state.exportWidth, state.exportHeight, state.texts, state.fonts, loadFontCatalog])

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
  const exportWidth = clampExportSize(state.exportWidth)
  const exportHeight = clampExportSize(state.exportHeight)
  const canvasW = state.canvasWidth || DEFAULT_CANVAS_WIDTH
  const canvasH = state.canvasHeight || DEFAULT_CANVAS_HEIGHT
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
    <div className={`flex flex-col md:flex-row gap-6 p-4 md:p-6 min-h-screen bg-gray-50 md:items-start ${className}`}>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onConfirm={handleNewProject}
        title="Start a new project?"
        message="This will clear the canvas, all layers, and the background image. This cannot be undone."
        confirmLabel="New project"
        danger
      />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} actions={ctxActions} onClose={closeContextMenu} />}
      {/* Screen-reader announcements for layer and history changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live.msg + (live.n % 2 ? ' ' : '')}
      </div>
      {/* Canvas — adapts to the template's aspect ratio, stays on the left while controls scroll */}
      <div ref={canvasColRef} className="w-full md:w-[45%] md:shrink-0 md:sticky md:top-6 md:self-start lg:w-125 flex flex-col items-center gap-3">
        <div
          className={showRulers ? 'inline-grid' : 'w-full max-w-[600px]'}
          style={showRulers ? { gridTemplateColumns: `${RULER}px auto`, gridTemplateRows: `${RULER}px auto` } : undefined}
        >
          {showRulers && <div className="bg-gray-50" aria-hidden="true" />}
          {showRulers && <TopRuler displayWidth={displayWidth} canvasWidth={canvasW} />}
          {showRulers && <LeftRuler displayHeight={displayHeight} canvasHeight={canvasH} />}
          <div
            ref={containerRef}
            className={`rounded-lg overflow-hidden shadow-md border border-gray-200 ${showRulers ? '' : 'w-full'}`}
            style={showRulers
              ? { width: displayWidth, height: displayHeight }
              : { aspectRatio: `${canvasW} / ${canvasH}` }}
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
              onResizeShape={handleResizeShape}
              onContextMenuLayer={openContextMenu}
              displayWidth={displayWidth}
              displayHeight={displayHeight}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">Exports at {exportWidth}×{exportHeight}px · click a layer to select · drag to move · Ctrl+Z to undo</p>
          {autoSave && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0" aria-live="polite">
              {saveStatus === 'pending'
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Saving…</>
                : <><Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />Saved</>}
            </span>
          )}
        </div>
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
      <div className="w-full md:flex-1 md:min-w-0 flex flex-col gap-3">

        {/* Layers — overview of everything on the canvas; click an entry to open its controls */}
        <CollapsibleCard id="layers" title="Layers">
          {layerList.map(entry => (
            <LayerRow
              key={entry.key}
              entry={entry}
              onSelect={goToLayer}
              onToggleVisibility={toggleLayerVisibility}
              onToggleLock={toggleLayerLock}
              onRename={renameLayer}
              onDragStart={handleLayerDragStart}
              onDragEnd={handleLayerDragEnd}
              onDragOver={handleLayerDragOver}
              onDrop={handleLayerDrop}
              dropHighlight={layerDropTarget?.key === entry.key ? (layerDropTarget.before ? 'above' : 'below') : null}
            />
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
                    {t.name || t.content || '(empty)'}
                  </button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700" title="Duplicate" aria-label="Duplicate text layer" onClick={(e) => { e.stopPropagation(); duplicateText(t.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Bring to front" aria-label="Bring text layer to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleBringToFront(t.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Send to back" aria-label="Send text layer to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleSendToBack(t.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-red-500" title="Delete" aria-label="Delete text layer" onClick={(e) => { e.stopPropagation(); deleteText(t.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </CollapsibleCard>

        {/* Selected Text Properties */}
        {selectedText && (
          <CollapsibleCard id="props-text" title="Text Properties">
            <label className="block text-xs text-gray-500 mb-1">Content</label>
            <textarea
              className="input w-full resize-y"
              aria-label="Text content"
              rows={2}
              value={selectedText.content}
              onChange={e => updateText(selectedText.id, { content: e.target.value }, `content-${selectedText.id}`)}
            />
            <p className="text-[11px] text-gray-400 leading-tight mt-1">Press Enter for a new line.</p>

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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Line height</label>
                <input
                  type="number"
                  className="input w-full"
                  aria-label="Line height"
                  value={selectedText.lineHeight ?? 1.2}
                  min={0.5} max={3} step={0.1}
                  onChange={e => updateText(selectedText.id, { lineHeight: Number(e.target.value) }, `line-height-${selectedText.id}`)}
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
              <NumberInput label="X position" value={selectedText.x} min={0} max={canvasW} onChange={v => updateText(selectedText.id, { x: v }, `x-${selectedText.id}`)} />
              <NumberInput label="Y position" value={selectedText.y} min={0} max={canvasH} onChange={v => updateText(selectedText.id, { y: v }, `y-${selectedText.id}`)} />
            </div>
            <NumberInput label="Rotation (°)" value={selectedText.rotation ?? 0} min={-180} max={180} onChange={v => updateText(selectedText.id, { rotation: v }, `text-rotation-${selectedText.id}`)} hint="−180 to 180" />

            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round((selectedText.opacity ?? 1) * 100)}%)</label>
              <input type="range" aria-label="Text opacity" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round((selectedText.opacity ?? 1) * 100)} onChange={e => updateText(selectedText.id, { opacity: clampOpacity(Number(e.target.value) / 100) }, `text-opacity-${selectedText.id}`)} />
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
                  <button className="btn-icon text-gray-400 hover:text-gray-700" title="Duplicate" aria-label="Duplicate image layer" onClick={(e) => { e.stopPropagation(); duplicateImage(img.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Bring to front" aria-label="Bring image layer to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleImageToFront(img.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Send to back" aria-label="Send image layer to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleImageToBack(img.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-red-500" title="Delete" aria-label="Delete image layer" onClick={(e) => { e.stopPropagation(); deleteImage(img.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
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
              <NumberInput label="X position" value={selectedImage.x} min={-canvasW} max={canvasW} onChange={v => updateImage(selectedImage.id, { x: v }, `img-x-${selectedImage.id}`)} />
              <NumberInput label="Y position" value={selectedImage.y} min={-canvasH} max={canvasH} onChange={v => updateImage(selectedImage.id, { y: v }, `img-y-${selectedImage.id}`)} />
            </div>
            <NumberInput label="Rotation (°)" value={selectedImage.rotation ?? 0} min={-180} max={180} onChange={v => updateImage(selectedImage.id, { rotation: v }, `img-rotation-${selectedImage.id}`)} hint="−180 to 180" />
            <button className="w-full btn-secondary text-sm" onClick={() => deleteImage(selectedImage.id)}><Trash2 className="h-4 w-4" />Delete image</button>
          </CollapsibleCard>
          )
        })()}

        {/* Shapes */}
        <CollapsibleCard id="shapes" title="Shapes">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary text-sm" onClick={() => addShape('rect')}><Square className="h-4 w-4" />Rectangle</button>
            <button className="btn-primary text-sm" onClick={() => addShape('circle')}><Circle className="h-4 w-4" />Circle</button>
            <button className="btn-primary text-sm" onClick={() => addShape('triangle')}><Triangle className="h-4 w-4" />Triangle</button>
            <button className="btn-primary text-sm" onClick={() => addShape('line')}><Minus className="h-4 w-4" />Line</button>
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
                  {shape.type === 'line'
                    ? <span className="inline-block w-4 h-0 border-t-2 shrink-0" style={{ borderColor: shape.stroke }} aria-hidden="true" />
                    : <span className="inline-block w-3 h-3 border border-gray-300 shrink-0" style={{ background: shape.fill, borderRadius: shape.type === 'circle' ? '9999px' : '2px' }} aria-hidden="true" />
                  }
                  <button
                    type="button"
                    className="truncate flex-1 text-left text-gray-700 capitalize bg-transparent border-0 p-0 cursor-pointer"
                    aria-pressed={selected}
                    onClick={(e) => { e.stopPropagation(); selectShape(selected ? null : shape.id) }}
                  >
                    {shape.name || shape.type}
                  </button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700" title="Duplicate" aria-label="Duplicate shape" onClick={(e) => { e.stopPropagation(); duplicateShape(shape.id) }}><Copy className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Bring to front" aria-label="Bring shape to front" disabled={isTop} onClick={(e) => { e.stopPropagation(); handleShapeToFront(shape.id) }}><BringToFront className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400" title="Send to back" aria-label="Send shape to back" disabled={isBottom} onClick={(e) => { e.stopPropagation(); handleShapeToBack(shape.id) }}><SendToBack className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon text-gray-400 hover:text-red-500" title="Delete" aria-label="Delete shape" onClick={(e) => { e.stopPropagation(); deleteShape(shape.id) }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </CollapsibleCard>

        {/* Selected Shape Properties */}
        {selectedShape && (
          <CollapsibleCard id="props-shape" title="Shape Properties">
            {selectedShape.type === 'line' ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stroke color</label>
                <input type="color" aria-label="Line stroke color" className="w-full h-8 rounded border border-gray-200 cursor-pointer" value={selectedShape.stroke} onChange={e => updateShape(selectedShape.id, { stroke: e.target.value }, `shape-stroke-${selectedShape.id}`)} />
              </div>
            ) : (
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
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Stroke width" value={selectedShape.strokeWidth} min={0} max={40} onChange={v => updateShape(selectedShape.id, { strokeWidth: v }, `shape-sw-${selectedShape.id}`)} hint="0 = off" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round((selectedShape.opacity ?? 1) * 100)}%)</label>
                <input type="range" aria-label="Shape opacity" className="w-full accent-blue-500 mt-1.5" min={0} max={100} value={Math.round((selectedShape.opacity ?? 1) * 100)} onChange={e => updateShape(selectedShape.id, { opacity: clampOpacity(Number(e.target.value) / 100) }, `shape-opacity-${selectedShape.id}`)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Width" value={selectedShape.width} min={1} max={canvasW} onChange={v => updateShape(selectedShape.id, { width: v }, `shape-w-${selectedShape.id}`)} />
              <NumberInput label="Height" value={selectedShape.height} min={1} max={canvasH} onChange={v => updateShape(selectedShape.id, { height: v }, `shape-h-${selectedShape.id}`)} />
            </div>
            {selectedShape.type === 'rect' && (
              <NumberInput label="Corner radius" value={selectedShape.radius ?? 0} min={0} max={Math.floor(Math.min(selectedShape.width, selectedShape.height) / 2)} onChange={v => updateShape(selectedShape.id, { radius: v }, `shape-radius-${selectedShape.id}`)} hint="0 = sharp" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X position" value={selectedShape.x} min={0} max={canvasW} onChange={v => updateShape(selectedShape.id, { x: v }, `shape-x-${selectedShape.id}`)} />
              <NumberInput label="Y position" value={selectedShape.y} min={0} max={canvasH} onChange={v => updateShape(selectedShape.id, { y: v }, `shape-y-${selectedShape.id}`)} />
            </div>
            <NumberInput label="Rotation (°)" value={selectedShape.rotation ?? 0} min={-180} max={180} onChange={v => updateShape(selectedShape.id, { rotation: v }, `shape-rotation-${selectedShape.id}`)} hint="−180 to 180" />
            <button className="w-full btn-secondary text-sm" onClick={() => deleteShape(selectedShape.id)}><Trash2 className="h-4 w-4" />Delete shape</button>
          </CollapsibleCard>
        )}

        {/* Template */}
        <CollapsibleCard id="template" title="Template">
          {(() => {
            const cats = ['all', ...new Set(TEMPLATES.map(t => t.category).filter(Boolean))]
            const filtered = filterCategory === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === filterCategory)
            return (
              <>
                <div className="flex gap-1 flex-wrap">
                  {cats.map(cat => (
                    <button
                      key={cat}
                      aria-label={`Filter templates: ${cat}`}
                      aria-pressed={filterCategory === cat}
                      onClick={() => {
                        setFilterCategory(cat)
                        setSelectedTemplate('')
                      }}
                      className={`text-xs px-2 py-0.5 rounded capitalize ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <select
                  className="input w-full"
                  value={selectedTemplate}
                  aria-label="Template"
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Select a template…</option>
                  {filtered.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  className="w-full btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!selectedTemplate}
                  onClick={() => handleApplyTemplate(selectedTemplate)}
                >
                  <LayoutTemplate className="h-4 w-4" />Apply template
                </button>
                <p className="text-[11px] text-gray-400 leading-tight">Replaces text layers, grid, and canvas size; keeps your image. Undo with Ctrl+Z.</p>
              </>
            )
          })()}
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
            {canvasW === canvasH ? (
              <>
                <label className="block text-xs text-gray-500 mb-1">Export size</label>
                <select
                  className="input w-full"
                  value={customSizeMode || !CANVAS_PRESETS.some(p => p.size === exportWidth) ? 'custom' : exportWidth}
                  aria-label="Export size"
                  onChange={e => {
                    if (e.target.value === 'custom') { setCustomSizeMode(true); return }
                    setCustomSizeMode(false)
                    const s = clampExportSize(Number(e.target.value))
                    update({ exportWidth: s, exportHeight: s })
                  }}
                >
                  {CANVAS_PRESETS.map(p => <option key={p.id} value={p.size}>{p.label}</option>)}
                  <option value="custom">Custom…</option>
                </select>
                {(customSizeMode || !CANVAS_PRESETS.some(p => p.size === exportWidth)) && (
                  <div className="mt-2">
                    <NumberInput
                      label="Custom size (px)"
                      value={state.exportWidth}
                      min={16}
                      max={8000}
                      onChange={v => update({ exportWidth: v, exportHeight: v }, 'export-size')}
                      hint="16–8000, square"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <NumberInput
                  label="Export width (px)"
                  value={state.exportWidth}
                  min={16}
                  max={8000}
                  onChange={v => update({ exportWidth: v }, 'export-width')}
                />
                <NumberInput
                  label="Export height (px)"
                  value={state.exportHeight}
                  min={16}
                  max={8000}
                  onChange={v => update({ exportHeight: v }, 'export-height')}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-400 leading-tight mt-1">Sets the PNG pixel dimensions and the SVG width/height.</p>
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
          <hr className="border-gray-100" />
          <button
            className="w-full btn-secondary text-sm text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
            onClick={() => setNewProjectOpen(true)}
          >
            <FilePlus className="h-4 w-4" />New project
          </button>
        </CollapsibleCard>
      </div>
      </AccordionContext.Provider>
    </div>
  )
}

