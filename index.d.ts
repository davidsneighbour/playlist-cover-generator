// Type definitions for posterboy-image-generator
// The state object is the contract for JSON import/export and the `initialState` prop.

import type { ComponentType } from 'react'

export interface BackgroundTransform {
  zoom: number
  panX: number
  panY: number
}

export interface BackgroundFilters {
  brightness: number
  contrast: number
  saturate: number
  blur: number
}

export interface BackgroundGradient {
  enabled: boolean
  type: 'linear' | 'radial'
  color: string
  color2: string
  angle: number
}

export interface TextShadow {
  color: string
  blur: number
  dx: number
  dy: number
}

export interface TextLayer {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  anchor: 'start' | 'middle' | 'end'
  stroke: string
  strokeWidth: number
  shadow: TextShadow | null
  lineHeight?: number
  hidden?: boolean
  locked?: boolean
}

export interface ImageLayer {
  id: string
  name: string
  data: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  blendMode: string
  naturalWidth: number | null
  naturalHeight: number | null
  lockAspect: boolean
  hidden?: boolean
  locked?: boolean
}

export interface ShapeLayer {
  id: string
  type: 'rect' | 'circle' | 'triangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  radius?: number
  hidden?: boolean
  locked?: boolean
}

export interface Overlay {
  enabled: boolean
  type: 'solid' | 'linear' | 'radial'
  color: string
  opacity: number
  color2: string
  opacity2: number
  angle: number
  blendMode: string
}

export interface Grid {
  enabled: boolean
  spacing: number
  majorEvery: number
}

export interface TemplateField {
  name: string
  type: 'text' | 'image'
  textLayerIndex?: number
}

export interface Template {
  id: string
  name: string
  category?: string
  description?: string
  canvasWidth?: number
  canvasHeight?: number
  exportWidth?: number
  exportHeight?: number
  fields?: TemplateField[]
  layout: Record<string, unknown>
}

export interface CoverState {
  backgroundImage: string | null
  backgroundImageData: string | null
  backgroundNaturalWidth: number | null
  backgroundNaturalHeight: number | null
  backgroundTransform: BackgroundTransform
  backgroundFilters: BackgroundFilters
  backgroundGradient: BackgroundGradient
  texts: TextLayer[]
  images: ImageLayer[]
  shapes: ShapeLayer[]
  overlay: Overlay
  grid: Grid
  snapToGrid: boolean
  fonts: string[]
  canvasWidth: number
  canvasHeight: number
  exportWidth: number
  exportHeight: number
  /** @deprecated Use exportWidth/exportHeight */
  exportSize?: number
}

export interface TemplateInputs {
  backgroundImageData?: string
  [fieldName: string]: string | undefined
}

export interface ImageGeneratorProps {
  /** Partial state to seed the editor. Merged over defaults. */
  initialState?: Partial<CoverState>
  /** Called with the full state object on every change. */
  onStateChange?: (state: CoverState) => void
  /** Extra classes applied to the component's root element. */
  className?: string
  /** Google Fonts API key for the font-search typeahead. */
  googleFontsApiKey?: string
  /** Persist the session to localStorage and restore it on mount. Defaults to true. */
  autoSave?: boolean
}

/** @deprecated Use ImageGeneratorProps */
export type CoverGeneratorProps = ImageGeneratorProps

export const ImageGenerator: ComponentType<ImageGeneratorProps>
/** @deprecated Use ImageGenerator */
export const CoverGenerator: ComponentType<ImageGeneratorProps>

export const TEMPLATES: Template[]
export function getTemplate(id: string): Template | undefined

/**
 * Build a complete editor state from a template id (or template object) and
 * named inputs. Pure function; safe for use in Node.js.
 */
export function buildStateFromTemplate(
  templateOrId: string | Template,
  inputs?: TemplateInputs
): CoverState

/**
 * Generate a PNG Blob from a template and inputs. Browser-only.
 */
export function generateFromTemplate(
  templateOrId: string | Template,
  inputs?: TemplateInputs
): Promise<Blob>

/**
 * Render editor state to a clean SVG string. Browser-only.
 */
export function renderStateToSvgString(state: CoverState): string
