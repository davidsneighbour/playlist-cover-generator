import { memo } from 'react'
import { clampOpacity } from '../lib/images'
import { gradientVector } from '../lib/overlay'

// Two-stop gradient that fills the canvas beneath the background image, so it
// shows through when no image is loaded (an opaque image covers it).
export const GradientBackground = memo(function GradientBackground({ gradient, canvasWidth, canvasHeight }) {
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
        x={0} y={0} width={canvasWidth} height={canvasHeight}
        fill={`url(#${id})`}
        style={{ pointerEvents: 'none' }}
        data-layer="background-gradient"
      />
    </>
  )
})

// Full-canvas color overlay painted over the background (under every other
// layer) to improve text legibility. Solid is a single color; linear/radial are
// two-stop gradients whose stops carry their own alpha. The blend mode applies
// to the overlay rect, so e.g. "multiply" darkens only the background beneath.
export const ColorOverlay = memo(function ColorOverlay({ overlay, canvasWidth, canvasHeight }) {
  if (!overlay || !overlay.enabled) return null
  const blend = overlay.blendMode && overlay.blendMode !== 'normal' ? overlay.blendMode : undefined

  if (overlay.type === 'solid') {
    return (
      <rect
        x={0} y={0} width={canvasWidth} height={canvasHeight}
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
        x={0} y={0} width={canvasWidth} height={canvasHeight}
        fill={`url(#${gradId})`}
        style={{ mixBlendMode: blend, pointerEvents: 'none' }}
        data-layer="overlay"
      />
    </>
  )
})
