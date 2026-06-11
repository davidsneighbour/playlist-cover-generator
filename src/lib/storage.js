/**
 * @module storage
 * @description Pure helpers for auto-saving the editor state to localStorage. The component
 * owns the actual read/write and debouncing; this module only builds and parses
 * the stored payload, which is what we unit-test. The key is versioned so a
 * future, incompatible state shape can be ignored rather than crash a restore.
 */

export const STORAGE_KEY = 'posterboy-image-generator:v1'

// Full state, including the background image data URL, so a refresh restores
// everything. Large images can exceed the localStorage quota; the component
// falls back to serializeStateWithoutImage when a write throws.
export function serializeState(state) {
  return JSON.stringify(state)
}

// State without the (potentially large) background image data URL, as a quota
// fallback: the layout still persists, the image does not.
export function serializeStateWithoutImage(state) {
  const { backgroundImageData, ...rest } = state
  return JSON.stringify(rest)
}

// Parse a stored payload back into a state object, or null when it is missing,
// malformed, or not a plain object (so callers can simply fall back to defaults).
// Also runs lightweight migrations so old payloads still load correctly.
export function parseStoredState(text) {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    // v0.1 → v0.2: exportSize (single number) → exportWidth + exportHeight
    if (parsed.exportSize != null && parsed.exportWidth == null) {
      parsed.exportWidth = parsed.exportSize
      parsed.exportHeight = parsed.exportSize
    }
    return parsed
  } catch {
    return null
  }
}
