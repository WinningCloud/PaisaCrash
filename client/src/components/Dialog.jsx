import { useEffect, useRef } from 'react'
import useTypewriter from './useTypewriter.js'

// RPG-style dialog box with typewriter text. Click/tap anywhere to skip.
// onTypingChange(isTyping, text) fires when typing starts/stops for this text.
export default function Dialog({ speaker, emoji, title, text, animate = true, onTypingChange, tone }) {
  const { shown, done, skip } = useTypewriter(text, { enabled: animate })
  const report = useRef(onTypingChange)
  report.current = onTypingChange

  useEffect(() => {
    report.current?.(!done, text)
  }, [done, text])

  // Never leave the mascot stuck "talking" after this box goes away
  useEffect(() => () => report.current?.(false, null), [])

  return (
    <div className={`dialog${tone ? ` dialog--${tone}` : ''}`} onClick={done ? undefined : skip}>
      {speaker && <span className="dialog__speaker">{speaker}</span>}
      {(emoji || title) && (
        <div className="dialog__head">
          {emoji && <span className="dialog__emoji" aria-hidden>{emoji}</span>}
          {title && <h2 className="dialog__title">{title}</h2>}
        </div>
      )}
      <p className="dialog__text">
        <span className="sr-only">{text}</span>
        <span aria-hidden>{shown}</span>
        {!done && <span className="dialog__caret" aria-hidden />}
      </p>
      {!done && (
        <button type="button" className="dialog__skip" onClick={skip}>
          ▼ <span className="dim">tap to skip</span>
        </button>
      )}
    </div>
  )
}
