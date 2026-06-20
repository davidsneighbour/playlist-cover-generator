import { useState, useRef, useCallback } from 'react'

const HISTORY_LIMIT = 50
const COALESCE_MS = 600

// Undo/redo history wrapper around a single state object. Discrete edits push a
// new entry; rapid edits that share a coalesceKey (dragging, typing in a field)
// collapse into one so a single undo reverts the whole gesture rather than one
// pixel or one keystroke at a time.
export function useHistoryState(initial) {
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

  const reset = useCallback((newState) => {
    lastKey.current = null
    setHistory({ past: [], present: newState, future: [] })
  }, [])

  return {
    state: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo,
    redo,
    reset,
  }
}
