import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-5">
            <DialogTitle className="text-base font-semibold text-gray-900 mb-2">{title}</DialogTitle>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className={`text-sm px-3 py-1.5 rounded font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}`}
              onClick={() => { onConfirm(); onClose() }}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
