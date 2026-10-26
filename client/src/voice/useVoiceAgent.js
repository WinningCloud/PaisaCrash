import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import { useToast } from '../components/Toast.jsx'
import { availableChoices, resolve } from '../game/engine.js'
import { getEvent } from '../game/events.js'
import { explainTerm, GLOSSARY } from '../game/glossary.js'
import { useGame } from '../store/useGameStore.jsx'
import { describeStep, dynamicVariables, gameStateForAgent } from './context.js'

const FIRST_LINE_FALLBACK_MS = 6000 // if no greeting is heard, start reacting anyway
const FLUSH_DELAY_MS = 350
const MIN_GAP_MS = 2500 // after a line is sent, give her time to start answering

// Find the option the agent meant: exact id, "2", or a label/id fragment
function matchChoice(choices, raw, game) {
  const q = String(raw ?? '').trim().toLowerCase()
  if (!q) return null
  const byId = choices.find((c) => c.id.toLowerCase() === q)
  if (byId) return byId
  if (/^\d+$/.test(q)) return choices[Number(q) - 1] ?? null
  return choices.find((c) => String(resolve(c.label, game)).toLowerCase().includes(q) || q.includes(c.id.toLowerCase())) ?? null
}

/**
 * Paisa Pal voice agent. Never blocks gameplay: any failure just shows a toast
 * and the game carries on in text mode.
 * status: 'idle' | 'connecting' | 'listening' | 'speaking'
 */
export default function useVoiceAgent() {
  const { phase, game, lastReport, dispatch } = useGame()
  const { toast } = useToast()
  const [available, setAvailable] = useState(null) // null while checking
  const [starting, setStarting] = useState(false)
  const [agentLine, setAgentLine] = useState(null)

  // Latest game, read by client tools and timers without re-creating them
  const live = useRef({})
  live.current = { phase, game, lastReport, dispatch }

  const convo = useConversation({
    onConnect: () => setStarting(false),
    onDisconnect: () => {
      setStarting(false)
      setAgentLine(null)
    },
    onError: (message) => {
      console.warn('[voice]', message)
      setStarting(false)
      toast(/permission|denied|notallowed|microphone/i.test(String(message))
        ? 'Microphone blocked. Allow mic access in the address bar, then try again.'
        : 'Voice connection failed. Playing in text mode.', { kind: 'danger' })
    },
    onMessage: (m) => {
      // Expressive voice models add tags like [teasing]; they are not for the eyes
      if (m.role === 'agent' || m.source === 'ai') setAgentLine(m.message.replace(/\[[^\]]*\]\s*/g, '').trim() || null)
    },
  })
  const { status: connState, isSpeaking, isMuted } = convo
  const controls = useRef(convo)
  controls.current = convo

  const connected = connState === 'connected'

  // Is the server up with an agent configured? Re-checked every 5s until it is, so
  // starting the server after the page loaded fixes the button without a reload.
  const availableRef = useRef(null)
  availableRef.current = available
  useEffect(() => {
    let alive = true
    const check = () =>
      fetch('/api/health')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((h) => alive && setAvailable(Boolean(h.voice)))
        .catch(() => alive && setAvailable(false))
    check()
    const t = setInterval(() => availableRef.current !== true && check(), 5000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  /* ---------- Client tools the agent can call ---------- */

  const clientTools = useMemo(() => ({
    get_game_state: () => gameStateForAgent(live.current.game, live.current.phase),

    explain_term: ({ term } = {}) =>
      explainTerm(term) ?? `Unknown term "${term}". Known terms: ${Object.keys(GLOSSARY).join(', ')}.`,

    make_choice: (params = {}) => {
      const { phase: ph, game: g, dispatch: send } = live.current
      const turn = g?.turn
      const event = turn && getEvent(turn.events[turn.index]?.id)
      if (ph !== 'event' || !event) return 'There is no card on screen to choose from right now.'
      if (turn.outcome) return 'This card is already answered. The player must press Next card first.'
      const choices = availableChoices(g, event)
      const wanted = params.choice_id ?? params.choiceId ?? params.id
      const choice = matchChoice(choices, wanted, g)
      if (!choice) return `No option matches "${wanted}". Valid ids: ${choices.map((c) => c.id).join(', ')}.`
      send({ type: 'CHOOSE', eventId: event.id, choiceId: choice.id })
      return `Locked in option ${choice.id}.`
    },
  }), [])

  /* ---------- Talking to the agent, one thing at a time ---------- */

  const pending = useRef(null) // latest line waiting for its turn to speak
  const armed = useRef(false) // true once the greeting has finished
  const lastKey = useRef(null)
  const speakingRef = useRef(false)
  const flushTimer = useRef(null)
  const busyUntil = useRef(0)
  const heardGreeting = useRef(false)
  speakingRef.current = isSpeaking

  const flush = useCallback(() => {
    clearTimeout(flushTimer.current)
    const wait = Math.max(FLUSH_DELAY_MS, busyUntil.current - Date.now())
    flushTimer.current = setTimeout(() => {
      if (!pending.current || !armed.current || speakingRef.current) return
      const text = pending.current
      pending.current = null
      busyUntil.current = Date.now() + MIN_GAP_MS
      controls.current.sendUserMessage(text)
    }, wait)
  }, [])

  // Announce each new step once: silent state update now, spoken reaction when she's free
  useEffect(() => {
    if (!connected) return
    const step = describeStep({ phase, game, lastReport })
    if (!step || step.key === lastKey.current) return
    lastKey.current = step.key
    controls.current.sendContextualUpdate(step.context)
    pending.current = step.say // a newer step replaces a stale one that never got spoken
    flush()
  }, [connected, phase, game, lastReport, flush])

  // When she finishes talking, say the next queued thing. The first finish is the greeting.
  useEffect(() => {
    if (!connected) return
    if (isSpeaking) heardGreeting.current = true
    else if (heardGreeting.current) {
      armed.current = true
      flush()
    }
  }, [connected, isSpeaking, flush])

  // Session start/stop bookkeeping
  useEffect(() => {
    if (!connected) {
      lastKey.current = null
      pending.current = null
      armed.current = false
      heardGreeting.current = false
      busyUntil.current = 0
      return
    }
    // The agent may not speak a greeting; don't wait forever
    const t = setTimeout(() => {
      armed.current = true
      flush()
    }, FIRST_LINE_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [connected, flush])

  useEffect(() => () => clearTimeout(flushTimer.current), [])

  /* ---------- Controls ---------- */

  const connect = useCallback(async () => {
    if (starting || connected) return
    setStarting(true)
    try {
      const res = await fetch('/api/elevenlabs/signed-url').catch(() => null)
      const body = res ? await res.json().catch(() => null) : null
      if (!res || !res.ok || !body) {
        setAvailable(false)
        setStarting(false)
        toast(body?.error ?? 'Voice server not reachable. Start it with: cd server && npm run dev', { kind: 'danger', ms: 6000 })
        return
      }
      setAvailable(true)
      const cfg = body
      const session = cfg.signedUrl
        ? { signedUrl: cfg.signedUrl, connectionType: 'websocket' }
        : cfg.agentId
          ? { agentId: cfg.agentId, connectionType: 'webrtc' }
          : null
      if (!session) throw new Error('no agent in response')
      armed.current = false
      controls.current.startSession({
        ...session,
        dynamicVariables: dynamicVariables(live.current.game),
        clientTools,
      })
    } catch (err) {
      console.warn('[voice]', err)
      setStarting(false)
      toast('Voice connection failed. Playing in text mode.', { kind: 'danger' })
    }
  }, [starting, connected, clientTools, toast])

  const disconnect = useCallback(() => {
    controls.current.endSession()
    setStarting(false)
  }, [])

  const toggleMute = useCallback(() => controls.current.setMuted(!isMuted), [isMuted])

  // Leaving the page ends the session
  useEffect(() => () => controls.current.endSession(), [])

  const status = connected ? (isSpeaking ? 'speaking' : 'listening') : starting || connState === 'connecting' ? 'connecting' : 'idle'

  return { status, available, connected, muted: isMuted, agentLine, connect, disconnect, toggleMute }
}
