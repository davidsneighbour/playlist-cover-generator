import { describe, it, expect } from 'vitest'
import { mergeInitialState } from '../src/lib/state'

const defaults = { a: 1, b: 2, c: 3 }

describe('mergeInitialState', () => {
  it('returns the defaults when every other source is null', () => {
    expect(mergeInitialState(defaults, null, null, null)).toEqual(defaults)
  })

  it('applies precedence defaults < restored < shared < initialState', () => {
    const merged = mergeInitialState(
      defaults,
      { a: 10, b: 20 },
      { b: 200 },
      { a: 1000 },
    )
    expect(merged).toEqual({ a: 1000, b: 200, c: 3 })
  })

  it('lets a later source override per key without dropping untouched keys', () => {
    expect(mergeInitialState(defaults, { a: 10 }, null, undefined)).toEqual({ a: 10, b: 2, c: 3 })
  })

  it('does not mutate the defaults', () => {
    const snapshot = { ...defaults }
    mergeInitialState(defaults, { a: 99 }, null, null)
    expect(defaults).toEqual(snapshot)
  })
})
