// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistoryState } from '../src/hooks/useHistoryState'

describe('useHistoryState', () => {
  it('starts with the initial state and nothing to undo or redo', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    expect(result.current.state).toEqual({ n: 0 })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('commits a patch and can undo and redo it', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    act(() => result.current.commit({ n: 1 }))
    expect(result.current.state).toEqual({ n: 1 })
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    expect(result.current.state).toEqual({ n: 0 })
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect(result.current.state).toEqual({ n: 1 })
  })

  it('accepts a functional patch', () => {
    const { result } = renderHook(() => useHistoryState({ n: 1 }))
    act(() => result.current.commit((s) => ({ n: s.n + 5 })))
    expect(result.current.state).toEqual({ n: 6 })
  })

  it('collapses rapid edits that share a coalesce key into one undo step', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    act(() => result.current.commit({ n: 1 }, 'drag'))
    act(() => result.current.commit({ n: 2 }, 'drag'))
    act(() => result.current.commit({ n: 3 }, 'drag'))
    expect(result.current.state).toEqual({ n: 3 })

    // One undo reverts the whole gesture back to before it started.
    act(() => result.current.undo())
    expect(result.current.state).toEqual({ n: 0 })
  })

  it('keeps discrete edits (no coalesce key) as separate steps', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    act(() => result.current.commit({ n: 1 }))
    act(() => result.current.commit({ n: 2 }))
    act(() => result.current.undo())
    expect(result.current.state).toEqual({ n: 1 })
  })

  it('ignores a patch that does not change the present (no empty history entry)', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    act(() => result.current.commit((s) => s))
    expect(result.current.canUndo).toBe(false)
  })

  it('clears the redo future once a new edit is committed', () => {
    const { result } = renderHook(() => useHistoryState({ n: 0 }))
    act(() => result.current.commit({ n: 1 }))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.commit({ n: 9 }))
    expect(result.current.canRedo).toBe(false)
  })
})
