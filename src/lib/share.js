/**
 * @module share
 * @description Pure helpers for shareable edit links: encode the editor state into a
 * URL-safe token and read it back. The background image data URL is dropped
 * (like JSON export) so the link stays within practical URL length limits; the
 * recipient loads the layout over their own image. The component handles the
 * actual clipboard and location work.
 */

// Query-style param name used inside the URL hash (e.g. `#s=...`).
export const SHARE_PARAM = 's'

// UTF-8-safe base64url (no '+', '/', or '=' so it is safe anywhere in a URL).
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(token) {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Encode the state (minus the background image) into a URL-safe token.
export function encodeShareState(state) {
  const { backgroundImageData, ...rest } = state
  return base64UrlEncode(JSON.stringify(rest))
}

// Decode a token back into a state object, or null when it is missing or invalid.
export function decodeShareState(token) {
  if (!token) return null
  try {
    const parsed = JSON.parse(base64UrlDecode(token))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

// Pull the share token out of a location hash (`#s=...`, possibly among others).
export function readShareToken(hash) {
  if (!hash) return null
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get(SHARE_PARAM)
}
