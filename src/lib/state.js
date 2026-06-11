/**
 * @module state
 * @description Assemble the editor's initial state from its precedence chain. Later sources
 * win per key: defaults &lt; restored session &lt; shared link &lt; explicit initialState.
 * Null/undefined sources are skipped, so a missing session or share token is a
 * no-op. Kept pure so the precedence is unit-tested.
 */
export function mergeInitialState(defaults, restored, shared, initialState) {
  return {
    ...defaults,
    ...(restored || {}),
    ...(shared || {}),
    ...(initialState || {}),
  }
}
