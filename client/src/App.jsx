import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Hud from './components/Hud.jsx'
import Mascot from './components/Mascot.jsx'
import { useToast } from './components/Toast.jsx'
import { emergencyMonths, monthlySurplus } from './game/engine.js'
import { getEvent } from './game/events.js'
import { formatDelta, formatINR } from './game/format.js'
import BudgetScreen from './screens/BudgetScreen.jsx'
import CharacterSelect from './screens/CharacterSelect.jsx'
import EventScreen from './screens/EventScreen.jsx'
import GameOver from './screens/GameOver.jsx'
import TitleScreen from './screens/TitleScreen.jsx'
import { useGame } from './store/useGameStore.jsx'
import useVoiceAgent from './voice/useVoiceAgent.js'

const IN_GAME = ['budget', 'event', 'end']

const CATEGORY_TIPS = {
  scam: 'Hmm, something about this smells fishy. Slow down before you tap anything.',
  medical: "Health first. Then let's work out who pays the bill.",
  investing: 'If it sounds too good to be true, it usually is.',
  job: 'Career moves ripple through everything. Check your safety net first.',
  family: 'Family stuff is never just about money. But it is also about money.',
  lifestyle: 'Want or need? Future you is watching.',
  windfall: 'Free money! Pay future you first, then celebrate.',
  tech: "Gadgets break at the worst time. That's what emergency funds are for.",
  education: 'Skills compound too, just like money.',
  tax: 'Tax stuff is boring. Boring stuff saves money.',
}

// Paisa Pal's take on the current card, before and after you choose
function eventLine(game) {
  const turn = game.turn
  const current = turn?.events[turn.index]
  const event = getEvent(current?.id)
  if (!event) return null
  const o = turn.outcome
  if (o) {
    if (o.notes?.some((n) => n.includes('emergency loan'))) return "Ouch, an 18% emergency loan. That's what happens when the safety net is empty."
    if (o.delta < -50000) return "Oof. That one really stung. Let's learn from it."
    if (o.delta < -1000) return 'That cost us a bit. Every choice has a price tag.'
    if (o.delta > 1000) return 'Cha-ching! Nice move.'
    return 'Nothing lost right now. But some choices echo later...'
  }
  if (current.cause != null) return 'Remember that choice from before? Life just sent the bill.'
  return CATEGORY_TIPS[event.category] ?? null
}

// What Paisa Pal says, based on where you are and how you're doing
function mascotLine(phase, game) {
  if (phase === 'title') return "Oink! I'm Paisa Pal. Let's crash-test your money before life does it for you."
  if (phase === 'character') return 'Pick a starting life. Student is hard mode. Family Earner juggles the most.'
  if (!game) return null
  if (phase === 'event') return eventLine(game)
  if (phase === 'end') {
    return game.status === 'bankrupt'
      ? 'Ouch. That was a debt spiral. Want to try again with a bigger safety net?'
      : 'Ten years done! Every rupee you saved early is now pulling its weight.'
  }
  const surplus = monthlySurplus(game)
  const em = emergencyMonths(game)
  if (surplus <= 0) return 'Uh oh, your costs are bigger than your salary. Hold on tight this year.'
  if (game.debt > 0 && game.debtRate >= 0.18) return `That loan charges ${Math.round(game.debtRate * 100)}% a year. Throw money at it before anything else!`
  if (em < 1) return 'Your safety net covers less than a month. Feed the emergency fund first!'
  if (em < 3) return `You can survive ${em.toFixed(1)} months without salary. Aim for 3 to 6.`
  if (game.year === 1) return 'Slide to split your leftover money. Tap any blue word if it sounds like jargon.'
  return 'Safety net looks solid. A steady SIP now becomes a big number by age 32.'
}

function mascotMood(phase, game) {
  if (phase === 'title') return 'happy'
  if (!game || phase === 'character') return 'idle'
  if (phase === 'end') return game.status === 'bankrupt' ? 'sad' : 'happy'
  if (phase === 'event') {
    const delta = game.turn?.outcome?.delta ?? 0
    return delta < -1000 ? 'sad' : delta > 1000 ? 'happy' : 'idle'
  }
  return monthlySurplus(game) <= 0 || emergencyMonths(game) < 1 ? 'sad' : 'idle'
}

export default function App() {
  const { phase, game, dispatch, canContinue, savedPhase, lastReport } = useGame()
  const { toast } = useToast()
  const [typing, setTyping] = useState(false)
  const voice = useVoiceAgent()

  // Year-end feedback until the full Year Summary screen lands
  useEffect(() => {
    if (!lastReport) return
    const nw = lastReport.after.netWorth - lastReport.before.netWorth
    toast(`LEVEL UP! AGE ${lastReport.age + 1}`, { kind: 'level' })
    toast(`Net worth ${formatINR(lastReport.after.netWorth)} (${formatDelta(nw)})`, { kind: nw >= 0 ? 'success' : 'danger' })
    for (const note of lastReport.notes) toast(note, { kind: note.startsWith('🎉') ? 'success' : 'danger', ms: 4500 })
  }, [lastReport, toast])

  const showHud = game && IN_GAME.includes(phase)
  const screenKey = phase === 'budget' || phase === 'event' ? `${phase}-${game?.year}` : phase

  let screen
  if (phase === 'title') {
    screen = (
      <TitleScreen
        canContinue={canContinue}
        savedGame={savedPhase ? game : null}
        onNew={() => dispatch({ type: 'NEW_GAME' })}
        onContinue={() => dispatch({ type: 'CONTINUE' })}
      />
    )
  } else if (phase === 'character') {
    screen = (
      <CharacterSelect
        onStart={(payload) => dispatch({ type: 'START_GAME', payload })}
        onBack={() => dispatch({ type: 'GO_TITLE' })}
      />
    )
  } else if (phase === 'budget' && game) {
    screen = <BudgetScreen game={game} onConfirm={(budget) => dispatch({ type: 'CONFIRM_BUDGET', budget, year: game.year })} />
  } else if (phase === 'event' && game?.turn) {
    screen = (
      <EventScreen
        game={game}
        onChoose={(eventId, choiceId) => dispatch({ type: 'CHOOSE', eventId, choiceId })}
        onNext={(index) => dispatch({ type: 'NEXT_EVENT', index })}
        onTypingChange={setTyping}
      />
    )
  } else if (phase === 'end' && game) {
    screen = <GameOver game={game} onNewGame={() => dispatch({ type: 'NEW_GAME' })} />
  }

  return (
    <>
      <div className="starfield" aria-hidden />
      <div className="app">
        {showHud && (
          <Hud game={game} voice={voice}>
            <button className="hud__home" onClick={() => dispatch({ type: 'GO_TITLE' })} aria-label="Pause and go to title">
              ⏸
            </button>
          </Hud>
        )}
        <main className="stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={screenKey}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </main>
        <Mascot
          mood={voice.status === 'speaking' || (typing && phase === 'event') ? 'talking' : mascotMood(phase, game)}
          message={voice.connected && voice.agentLine ? voice.agentLine : mascotLine(phase, game)}
        />
      </div>
      <div className="scanlines" aria-hidden />
    </>
  )
}
