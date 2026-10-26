import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
import Dialog from '../components/Dialog.jsx'
import EffectChips from '../components/EffectChips.jsx'
import PixelButton from '../components/PixelButton.jsx'
import useTypewriter from '../components/useTypewriter.js'
import { availableChoices, previewChoice, resolve } from '../game/engine.js'
import { CATEGORY_STYLE, getEvent } from '../game/events.js'
import { formatDelta, formatINR } from '../game/format.js'

const BIG_HIT = 1000

function ChoiceButton({ choice, index, game, onPick, disabled }) {
  const label = resolve(choice.label, game)
  const hint = resolve(choice.hint, game)
  const preview = useMemo(() => previewChoice(game, choice), [game, choice])
  return (
    <motion.button
      type="button"
      className="choice"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onPick(choice.id)}
      disabled={disabled}
    >
      <span className="choice__key" aria-hidden>{index + 1}</span>
      <span className="choice__body">
        <span className="choice__label">{label}</span>
        {hint && <span className="choice__hint">{hint}</span>}
        <EffectChips fx={preview.fx} />
        {preview.loan > 0 && (
          <span className="choice__warn">
            ⚠ Not enough cash{preview.sell > 0 ? `: sells ${formatINR(preview.sell)} of investments, then` : ':'} {formatINR(preview.loan)} becomes an 18% loan
          </span>
        )}
        {preview.loan <= 0 && preview.sell > 0 && (
          <span className="choice__warn">⚠ Not enough cash: sells {formatINR(preview.sell)} of your investments</span>
        )}
      </span>
    </motion.button>
  )
}

function OutcomePanel({ outcome, isLast, onNext, fresh }) {
  const { shown, done, skip } = useTypewriter(outcome.text ?? '', { enabled: fresh })
  const tone = outcome.delta < -BIG_HIT ? 'red' : outcome.delta > BIG_HIT ? 'green' : 'cyan'
  return (
    <motion.section
      className={`pcard pcard--${tone} outcome`}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={done ? undefined : skip}
    >
      <p className="outcome__choice">
        <span className="dim">YOU CHOSE:</span> {outcome.label}
      </p>
      <p className="outcome__text">
        <span className="sr-only">{outcome.text}</span>
        <span aria-hidden>{shown}</span>
      </p>
      <div className="outcome__impact">
        <EffectChips fx={outcome.fx} empty="No change right now" />
        <span className="outcome__nw">
          Net worth <b className={outcome.delta < 0 ? 'red' : outcome.delta > 0 ? 'green' : ''}>{formatDelta(outcome.delta)}</b>
        </span>
      </div>
      {outcome.notes?.map((n) => (
        <p key={n} className="outcome__note">⚠ {n}</p>
      ))}
      {outcome.triggered > 0 && (
        <p className="outcome__trigger">⚡ That choice just set something in motion...</p>
      )}
      <div className="lesson">
        <span className="lesson__tag">💡 MONEY LESSON</span>
        <p>{outcome.lesson}</p>
      </div>
      <div className="row actions">
        <PixelButton variant="yellow" size="lg" onClick={onNext} autoFocus>
          {isLast ? 'Finish the year ▶' : 'Next card ▶'}
        </PixelButton>
      </div>
    </motion.section>
  )
}

export default function EventScreen({ game, onChoose, onNext, onTypingChange }) {
  const turn = game.turn
  const current = turn.events[turn.index]
  const event = getEvent(current.id)
  const outcome = turn.outcome
  const cause = current.cause != null ? game.history[current.cause] : null
  const cat = CATEGORY_STYLE[event.category] ?? CATEGORY_STYLE.lifestyle
  const choices = availableChoices(game, event)
  const isLast = turn.index >= turn.events.length - 1

  // Freeze the narration once a choice is made (state has moved on by then)
  const narration = outcome?.narration ?? resolve(event.narration, game)

  // Choices appear once *this* card's narration has finished typing
  const [readText, setReadText] = useState(null)
  const typing = !outcome && readText !== narration
  const [flash, setFlash] = useState(null)
  const [scope, animate] = useAnimate()
  const shownOutcome = useRef(outcome)
  const resumedOutcome = useRef(outcome)

  const handleTyping = useCallback((isTyping, text) => {
    if (!isTyping && text) setReadText(text)
    onTypingChange?.(isTyping)
  }, [onTypingChange])

  // React to a fresh outcome: shake and flash red on losses, flash green on gains
  useEffect(() => {
    if (!outcome || shownOutcome.current === outcome) return
    shownOutcome.current = outcome
    if (outcome.delta < -BIG_HIT) {
      setFlash('loss')
      if (scope.current) animate(scope.current, { x: [0, -14, 12, -9, 7, -4, 0] }, { duration: 0.45 })
    } else if (outcome.delta > BIG_HIT) {
      setFlash('gain')
    }
  }, [outcome, animate, scope])

  const pick = useCallback((choiceId) => onChoose(event.id, choiceId), [onChoose, event.id])
  const next = useCallback(() => onNext(turn.index), [onNext, turn.index])

  // Keyboard: 1-4 picks a choice, Enter/Space moves on
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea')) return
      if (!outcome && !typing && /^[1-9]$/.test(e.key)) {
        const c = choices[Number(e.key) - 1]
        if (c) pick(c.id)
      } else if (outcome && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choices, outcome, typing, pick, next])

  return (
    <div className="event" ref={scope}>
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash + turn.index}
            className={`flash flash--${flash}`}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onAnimationComplete={() => setFlash(null)}
          />
        )}
      </AnimatePresence>

      <div className="event__meta">
        <span className="event__count">
          CARD {turn.index + 1}/{turn.events.length}
        </span>
        <span className="event__pips" aria-hidden>
          {turn.events.map((e, i) => (
            <span key={`${e.id}-${i}`} className={`pip${i < turn.index ? ' pip--done' : i === turn.index ? ' pip--now' : ''}`} />
          ))}
        </span>
        <span className="event__cat" style={{ '--cat': cat.color }}>{cat.label}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${game.year}-${turn.index}`}
          className="stack"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          {cause && (
            <div className="consequence">
              <span className="consequence__tag">⏳ CONSEQUENCE</span>
              <span>
                Year {cause.year}, you chose: <b>"{cause.label}"</b>
              </span>
            </div>
          )}

          <Dialog
            speaker={cause ? 'LIFE REMEMBERS...' : 'LIFE HAPPENS'}
            emoji={event.emoji}
            title={event.title}
            text={narration}
            animate={!outcome}
            onTypingChange={handleTyping}
            tone={event.category === 'scam' ? 'danger' : undefined}
          />

          {!outcome && !typing && (
            <div className="choices" role="group" aria-label="Your choices">
              {choices.map((c, i) => (
                <ChoiceButton key={c.id} choice={c} index={i} game={game} onPick={pick} disabled={Boolean(outcome)} />
              ))}
            </div>
          )}

          {outcome && <OutcomePanel outcome={outcome} isLast={isLast} onNext={next} fresh={outcome !== resumedOutcome.current} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
