import { useId } from 'react'

// Labelled numeric input used throughout the controls. Associates its <label>
// with the <input> via a generated id so it is accessible.
export function NumberInput({ label, value, min, max, onChange, hint }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 mb-1">{label}{hint && <span className="text-gray-400 ml-1">({hint})</span>}</label>
      <input
        id={id}
        type="number"
        className="input w-full"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}
