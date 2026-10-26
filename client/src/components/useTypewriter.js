import { useEffect, useState } from 'react'

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Reveals `text` a couple of characters per tick. skip() shows it all at once.
export default function useTypewriter(text = '', { speed = 18, step = 2, enabled = true } = {}) {
  const instant = !enabled || reducedMotion()
  const [state, setState] = useState({ text, count: instant ? text.length : 0 })

  // New text restarts the animation (derived-state reset, no extra render pass)
  if (state.text !== text) setState({ text, count: instant ? text.length : 0 })

  const count = state.text === text ? state.count : 0
  const done = count >= text.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setState((s) => ({ ...s, count: s.count + step })), speed)
    return () => clearTimeout(t)
  }, [count, done, speed, step])

  return {
    shown: text.slice(0, count),
    done,
    skip: () => setState({ text, count: text.length }),
  }
}
