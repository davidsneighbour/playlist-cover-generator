import { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { clampMenuPosition } from '../lib/menu'

// Right-click context menu for a layer. Positioned at the cursor and clamped to
// the viewport once measured. Closes on an outside mousedown, Escape, scroll, or
// after an action runs. Each action supplies its own icon component and onClick.
export function ContextMenu({ x, y, actions, onClose }) {
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
