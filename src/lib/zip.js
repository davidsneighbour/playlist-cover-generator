// Minimal, dependency-free ZIP writer using the STORE method (no compression).
// PNGs are already compressed, so storing them as-is keeps the archive small
// without pulling in a deflate implementation. The byte layout is pure and
// unit-tested; the component supplies the file bytes and triggers the download.

let CRC_TABLE = null
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  CRC_TABLE = t
  return t
}

// CRC-32 (IEEE) of a byte array, as required by each ZIP entry.
export function crc32(bytes) {
  const t = crcTable()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Build a ZIP archive (Uint8Array) from [{ name, data: Uint8Array }] entries,
// each stored uncompressed.
export function buildZip(files) {
  const enc = new TextEncoder()
  const local = []
  const central = []
  let offset = 0

  for (const f of files) {
    const nameBytes = enc.encode(f.name)
    const data = f.data
    const crc = crc32(data)
    const size = data.length

    const header = new Uint8Array(30 + nameBytes.length)
    const hv = new DataView(header.buffer)
    hv.setUint32(0, 0x04034b50, true) // local file header signature
    hv.setUint16(4, 20, true) // version needed
    hv.setUint16(6, 0, true) // flags
    hv.setUint16(8, 0, true) // method: store
    hv.setUint16(10, 0, true) // mod time
    hv.setUint16(12, 0, true) // mod date
    hv.setUint32(14, crc, true)
    hv.setUint32(18, size, true) // compressed size
    hv.setUint32(22, size, true) // uncompressed size
    hv.setUint16(26, nameBytes.length, true)
    hv.setUint16(28, 0, true) // extra length
    header.set(nameBytes, 30)
    local.push(header, data)

    const record = new Uint8Array(46 + nameBytes.length)
    const rv = new DataView(record.buffer)
    rv.setUint32(0, 0x02014b50, true) // central directory signature
    rv.setUint16(4, 20, true) // version made by
    rv.setUint16(6, 20, true) // version needed
    rv.setUint16(8, 0, true) // flags
    rv.setUint16(10, 0, true) // method
    rv.setUint16(12, 0, true) // time
    rv.setUint16(14, 0, true) // date
    rv.setUint32(16, crc, true)
    rv.setUint32(20, size, true)
    rv.setUint32(24, size, true)
    rv.setUint16(28, nameBytes.length, true)
    rv.setUint16(30, 0, true) // extra length
    rv.setUint16(32, 0, true) // comment length
    rv.setUint16(34, 0, true) // disk number start
    rv.setUint16(36, 0, true) // internal attrs
    rv.setUint32(38, 0, true) // external attrs
    rv.setUint32(42, offset, true) // offset of local header
    record.set(nameBytes, 46)
    central.push(record)

    offset += header.length + data.length
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0)
  const centralOffset = offset

  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true) // end of central directory signature
  ev.setUint16(4, 0, true) // this disk
  ev.setUint16(6, 0, true) // disk with central directory
  ev.setUint16(8, files.length, true) // entries on this disk
  ev.setUint16(10, files.length, true) // total entries
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, centralOffset, true)
  ev.setUint16(20, 0, true) // comment length

  const total = offset + centralSize + eocd.length
  const out = new Uint8Array(total)
  let p = 0
  for (const chunk of local) { out.set(chunk, p); p += chunk.length }
  for (const chunk of central) { out.set(chunk, p); p += chunk.length }
  out.set(eocd, p)
  return out
}
