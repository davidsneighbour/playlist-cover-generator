import { createContext, useContext, useId } from 'react'
import { Transition } from '@headlessui/react'
import { ChevronRight, Pin } from 'lucide-react'

// Provided by the host: { isOpen(id), isPinned(id), toggleOpen(id), togglePin(id) }.
export const AccordionContext = createContext(null)

function Chevron({ open }) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    />
  )
}

// A single collapsible control card. Open/pin state is owned by the host through
// AccordionContext so the cards can behave as an accordion (one open at a time,
// pinned cards exempt). The outer element carries `id` so the host can scroll to
// a card after opening it.
export function CollapsibleCard({ id, title, children }) {
  const acc = useContext(AccordionContext)
  const open = acc.isOpen(id)
  const pinned = acc.isPinned(id)
  const panelId = useId()
  const headerId = useId()

  return (
    <div id={id} className="bg-white rounded-lg border border-gray-200 shadow-sm scroll-mt-4">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          id={headerId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => acc.toggleOpen(id)}
          className="flex flex-1 items-center gap-2 text-left cursor-pointer"
        >
          <Chevron open={open} />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        </button>
        <label
          className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer select-none"
          title="Keep this card open"
        >
          <input type="checkbox" checked={pinned} onChange={() => acc.togglePin(id)} className="accent-blue-500" />
          <Pin className="h-3 w-3" aria-hidden="true" />
          Pin
        </label>
      </div>
      <Transition
        show={open}
        enter="transition duration-150 ease-out"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-100 ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <div id={panelId} role="region" aria-labelledby={headerId} className="flex flex-col gap-2 px-3 pb-3">
          {children}
        </div>
      </Transition>
    </div>
  )
}
