import { describe, it, expect } from 'vitest'
import { rulerTicks } from '../src/lib/rulers'

describe('rulerTicks', () => {
  it('covers 0..canvasSize at the given step', () => {
    const ticks = rulerTicks(600)
    expect(ticks[0].value).toBe(0)
    expect(ticks[ticks.length - 1].value).toBe(600)
    expect(ticks).toHaveLength(13) // 0,50,...,600
  })

  it('marks multiples of majorEvery as major', () => {
    const majors = rulerTicks(600).filter(t => t.major).map(t => t.value)
    expect(majors).toEqual([0, 100, 200, 300, 400, 500, 600])
  })

  it('honors custom step and majorEvery', () => {
    const ticks = rulerTicks(200, { step: 100, majorEvery: 200 })
    expect(ticks.map(t => t.value)).toEqual([0, 100, 200])
    expect(ticks.filter(t => t.major).map(t => t.value)).toEqual([0, 200])
  })

  it('treats majorEvery of 0 as no majors', () => {
    expect(rulerTicks(100, { step: 50, majorEvery: 0 }).every(t => t.major === false)).toBe(true)
  })

  it('returns nothing for a non-positive step', () => {
    expect(rulerTicks(600, { step: 0 })).toEqual([])
    expect(rulerTicks(600, { step: -10 })).toEqual([])
  })
})
