import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { SHORTCUTS, formatKeys } from '../lib/shortcuts'
import { IS_MAC } from '../lib/constants'
import { version as APP_VERSION } from '../../package.json'

// Transient help overlay (F1): the app version, the keyboard shortcuts, and a
// few mouse tips. Not part of the document. The shortcut list and platform-aware
// key formatting come from the pure, tested src/lib/shortcuts.js.
export function HelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[85vh] overflow-auto">
          <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-100">
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">Playlist cover generator</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">Version {APP_VERSION}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 -m-1" aria-label="Close help"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-sm text-gray-600">Build a square playlist cover: set a background, layer text, shapes, and images, then export to PNG, SVG, or a re-loadable JSON project.</p>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Keyboard shortcuts</h3>
              <ul className="flex flex-col gap-1.5">
                {SHORTCUTS.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-600">{s.description}</span>
                    <span className="flex gap-1">
                      {formatKeys(s.keys, IS_MAC).map((k, i) => (
                        <kbd key={i} className="px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 border border-gray-200 rounded text-gray-700">{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tips</h3>
              <ul className="flex flex-col gap-1 text-sm text-gray-600 list-disc pl-4">
                <li>Drag a layer on the canvas to move it; enable snap to grid for alignment.</li>
                <li>Hold Shift while dragging an image corner to lock its aspect ratio.</li>
                <li>Click an empty area of the canvas to deselect.</li>
              </ul>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
