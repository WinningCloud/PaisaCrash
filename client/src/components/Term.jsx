import { useState } from 'react'
import { GLOSSARY } from '../game/glossary.js'

// Jargon with a one-line explanation on hover, focus or tap
export default function Term({ k, children }) {
  const [open, setOpen] = useState(false)
  const tip = GLOSSARY[k]
  if (!tip) return children ?? k
  return (
    <button
      type="button"
      className="term"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
      aria-label={`${k}: ${tip}`}
    >
      {children ?? k}
      {open && (
        <span className="term__tip" role="tooltip">
          <b>{k}:</b> {tip}
        </span>
      )}
    </button>
  )
}
