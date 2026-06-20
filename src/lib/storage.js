/**
 * @module storage
 * @description Pure helpers for auto-saving the editor state to localStorage. The component
 * owns the actual read/write and debouncing; this module only builds and parses
 * the stored payload, which is what we unit-test. The key is versioned so a
 * future, incompatible state shape can be ignored rather than crash a restore.
 */

export const STORAGE_KEY = 'posterboy-image-generator:v1'

// Schema version written into exported JSON files. Increment when the state
// shape changes in an incompatible way and add a migration in parseExportedState.
export const EXPORT_VERSION = '1'

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

// Serialize state for JSON export: strips backgroundImageData (kept small) and
// adds a top-level "version" field so future readers can migrate old files.
export function serializeStateForExport(state) {
  const { backgroundImageData, ...rest } = state
  return JSON.stringify({ version: EXPORT_VERSION, ...rest }, null, 2)
}

// Parse an exported JSON string back into a plain state object, or null on
// failure. Strips the "version" field (it is metadata, not state). Files
// without a version field are assumed to be pre-versioned (v0) and loaded
// as-is; callers can add migrations here as the schema evolves.
export function parseExportedState(text) {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const { version: _version, ...state } = parsed
    return state
  } catch {
    return null
  }
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
