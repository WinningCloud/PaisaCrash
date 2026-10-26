import { useEffect, useRef, useState } from 'react'
import { formatINR } from '../game/format.js'

// Counts up/down to the new value and flashes green on gains, red on losses
export default function CoinCounter({ value }) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState('')
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    setFlash(value > from ? 'gain' : 'loss')
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min(1, (now - start) / 700)
      setShown(Math.round(from + (value - from) * (1 - (1 - t) ** 3)))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const clear = setTimeout(() => setFlash(''), 700)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(clear)
      setShown(value)
    }
  }, [value])

  return (
    <div className={`coins${flash ? ` coins--${flash}` : ''}`} aria-label={`Cash ${formatINR(value)}`}>
      <span className="coin" />
      <span>{formatINR(shown)}</span>
    </div>
  )
}
