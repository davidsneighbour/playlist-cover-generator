import { describe, it, expect } from 'vitest'
import { isOpen, toggleOpen, togglePin, openCard } from '../src/lib/accordion'

const base = { openId: null, pinned: [] }

describe('isOpen', () => {
  it('is true for the accordion card and any pinned card', () => {
    expect(isOpen({ openId: 'a', pinned: ['b'] }, 'a')).toBe(true)
    expect(isOpen({ openId: 'a', pinned: ['b'] }, 'b')).toBe(true)
    expect(isOpen({ openId: 'a', pinned: ['b'] }, 'c')).toBe(false)
  })
})

describe('toggleOpen', () => {
  it('opens a closed card as the single accordion card', () => {
    expect(toggleOpen(base, 'a')).toEqual({ openId: 'a', pinned: [] })
  })

  it('opening another card collapses the previous accordion card', () => {
    const s = toggleOpen({ openId: 'a', pinned: [] }, 'b')
    expect(s).toEqual({ openId: 'b', pinned: [] })
  })

  it('leaves pinned cards open when another opens', () => {
    const s = toggleOpen({ openId: null, pinned: ['a'] }, 'b')
    expect(isOpen(s, 'a')).toBe(true)
    expect(isOpen(s, 'b')).toBe(true)
  })

  it('closing the accordion card clears it', () => {
    expect(toggleOpen({ openId: 'a', pinned: [] }, 'a')).toEqual({ openId: null, pinned: [] })
  })

  it('closing a pinned card unpins and closes it', () => {
    const s = toggleOpen({ openId: null, pinned: ['a', 'b'] }, 'a')
    expect(s.pinned).toEqual(['b'])
    expect(isOpen(s, 'a')).toBe(false)
  })
})

describe('togglePin', () => {
  it('pins a card and frees the accordion slot if it held it', () => {
    const s = togglePin({ openId: 'a', pinned: [] }, 'a')
    expect(s).toEqual({ openId: null, pinned: ['a'] })
    expect(isOpen(s, 'a')).toBe(true)
  })

  it('a pinned card stays open when another card opens', () => {
    let s = togglePin({ openId: 'a', pinned: [] }, 'a') // pin a
    s = toggleOpen(s, 'b') // open b
    expect(isOpen(s, 'a')).toBe(true)
    expect(isOpen(s, 'b')).toBe(true)
  })

  it('unpinning collapses the card when it is not the accordion card', () => {
    const s = togglePin({ openId: 'b', pinned: ['a'] }, 'a')
    expect(s).toEqual({ openId: 'b', pinned: [] })
    expect(isOpen(s, 'a')).toBe(false)
  })
})

describe('openCard', () => {
  it('opens a closed card', () => {
    expect(openCard(base, 'a')).toEqual({ openId: 'a', pinned: [] })
  })

  it('is a no-op for an already-open or null card', () => {
    const pinned = { openId: null, pinned: ['a'] }
    expect(openCard(pinned, 'a')).toBe(pinned)
    expect(openCard(base, null)).toBe(base)
  })
})
