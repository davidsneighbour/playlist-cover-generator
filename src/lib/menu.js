/**
 * @module menu
 * @description Pure helper for the right-click context menu. Given the desired top-left
 * corner and the menu's measured size, keeps it fully inside the viewport with a
 * small margin. Used by the component, which measures the rendered menu and
 * supplies the live viewport size.
 */
export function clampMenuPosition(x, y, menuW, menuH, viewW, viewH, margin = 8) {
  return {
    x: Math.max(margin, Math.min(x, viewW - menuW - margin)),
    y: Math.max(margin, Math.min(y, viewH - menuH - margin)),
  }
}
