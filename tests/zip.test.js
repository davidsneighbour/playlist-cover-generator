import { describe, it, expect } from 'vitest'
import { crc32, buildZip } from '../src/lib/zip'

const enc = (s) => new TextEncoder().encode(s)

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926)
  })

  it('is 0 for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('matches a known vector for a sentence', () => {
    expect(crc32(enc('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('buildZip', () => {
  const u16 = (buf, off) => new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint16(off, true)
  const u32 = (buf, off) => new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(off, true)

  it('starts with a local file header and ends with the EOCD record', () => {
    const out = buildZip([{ name: 'a.txt', data: enc('hello') }])
    expect(u32(out, 0)).toBe(0x04034b50)
    expect(u32(out, out.length - 22)).toBe(0x06054b50)
  })

  it('records the entry count and a valid central directory offset', () => {
    const out = buildZip([
      { name: 'one.png', data: enc('first') },
      { name: 'two.png', data: enc('second!!') },
    ])
    // EOCD: entries on disk and total entries
    expect(u16(out, out.length - 22 + 8)).toBe(2)
    expect(u16(out, out.length - 22 + 10)).toBe(2)
    const centralOffset = u32(out, out.length - 22 + 16)
    // central directory begins with the central directory signature
    expect(u32(out, centralOffset)).toBe(0x02014b50)
  })

  it('stores the data uncompressed with a matching crc and size', () => {
    const data = enc('payload')
    const out = buildZip([{ name: 'x', data }])
    expect(u16(out, 8)).toBe(0) // method = store
    expect(u32(out, 14)).toBe(crc32(data)) // crc32
    expect(u32(out, 18)).toBe(data.length) // compressed size
    expect(u32(out, 22)).toBe(data.length) // uncompressed size
    // filename + data follow the 30-byte header
    const nameLen = u16(out, 26)
    expect(nameLen).toBe(1)
    expect(out.slice(30 + nameLen, 30 + nameLen + data.length)).toEqual(data)
  })

  it('produces an empty but valid archive for no files', () => {
    const out = buildZip([])
    expect(u32(out, 0)).toBe(0x06054b50)
    expect(u16(out, 8)).toBe(0)
  })
})
