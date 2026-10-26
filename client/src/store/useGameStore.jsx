import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { createInitialState, drawDueNow, drawEvents, resolveChoice, setBudget, simulateYear } from '../game/engine.js'
import { DECK, getEvent } from '../game/events.js'

const SAVE_KEY = 'paisa-crash-test/save-v1'
const RESUMABLE = ['budget', 'event', 'end']

const validTurn = (game) =>
  Boolean(game?.turn?.events?.length) &&
  game.turn.index < game.turn.events.length &&
  game.turn.events.every((e) => getEvent(e.id))

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const save = JSON.parse(raw)
    if (save?.game?.version !== 1 || !RESUMABLE.includes(save.phase)) return null
    // A save from mid-year whose cards no longer exist falls back to the budget screen
    if (save.phase === 'event' && !validTurn(save.game)) {
      return { phase: 'budget', game: { ...save.game, turn: null } }
    }
    return save
  } catch {
    return null
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // storage full or blocked: the game still works, it just won't resume
  }
}

function init() {
  const save = loadSave()
  return { phase: 'title', game: save?.game ?? null, savedPhase: save?.phase ?? null, lastReport: null }
}

// Close the year's books and move on to the next budget (or the ending)
function finishYear(state, game) {
  const { state: next, report } = simulateYear({ ...game, turn: null })
  return { ...state, game: next, lastReport: report, phase: next.status === 'playing' ? 'budget' : 'end' }
}

// Every action checks the current phase (and year/card), so double clicks are harmless
function reducer(state, action) {
  switch (action.type) {
    case 'GO_TITLE':
      return { ...state, phase: 'title', savedPhase: RESUMABLE.includes(state.phase) ? state.phase : state.savedPhase }
    case 'NEW_GAME':
      return { ...state, phase: 'character' }
    case 'CONTINUE':
      return state.game && state.savedPhase ? { ...state, phase: state.savedPhase } : state
    case 'START_GAME':
      if (state.phase !== 'character') return state
      return { phase: 'budget', game: createInitialState(action.payload), savedPhase: null, lastReport: null }
    case 'SET_BUDGET':
      if (state.phase !== 'budget') return state
      return { ...state, game: setBudget(state.game, action.budget) }
    case 'CONFIRM_BUDGET': {
      if (state.phase !== 'budget' || action.year !== state.game.year) return state
      const drawn = drawEvents(setBudget(state.game, action.budget ?? state.game.budget), DECK)
      if (!drawn.events.length) return finishYear(state, drawn.state)
      return { ...state, phase: 'event', game: { ...drawn.state, turn: { events: drawn.events, index: 0, outcome: null } } }
    }
    case 'CHOOSE': {
      const turn = state.game?.turn
      if (state.phase !== 'event' || !turn || turn.outcome) return state
      const current = turn.events[turn.index]
      const event = getEvent(current?.id)
      if (!event || (action.eventId && action.eventId !== event.id)) return state
      const { state: game, outcome } = resolveChoice(state.game, event, action.choiceId, current.cause)
      if (!outcome) return state
      // Same-year consequences (inYears: 0) join this year's queue right away
      const due = drawDueNow(game, DECK, turn.events)
      const events = [...turn.events, ...due.events]
      return { ...state, game: { ...due.state, turn: { ...turn, events, outcome: { ...outcome, triggered: due.events.length } } } }
    }
    case 'NEXT_EVENT': {
      const turn = state.game?.turn
      if (state.phase !== 'event' || !turn?.outcome || (action.index != null && action.index !== turn.index)) return state
      const index = turn.index + 1
      if (index >= turn.events.length) return finishYear(state, state.game)
      return { ...state, game: { ...state.game, turn: { ...turn, index, outcome: null } } }
    }
    default:
      return state
  }
}

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  // Auto-save after every step
  useEffect(() => {
    if (state.game && RESUMABLE.includes(state.phase)) {
      writeSave({ phase: state.phase, game: state.game })
    }
  }, [state.game, state.phase])

  const value = useMemo(
    () => ({ ...state, dispatch, canContinue: Boolean(state.game && state.savedPhase) }),
    [state],
  )
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
