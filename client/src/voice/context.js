// Turns game state into text for the voice agent. Pure functions, no React.
// `context` is a silent state update; `say` is a [GAME EVENT] the agent reacts to out loud.
import {
  PROFILES, TOTAL_YEARS, availableChoices, emergencyMonths, getStats, monthlySurplus, resolve, survivalDays,
} from '../game/engine.js'
import { getEvent } from '../game/events.js'
import { formatDelta, formatINR } from '../game/format.js'

const yn = (v) => (v ? 'yes' : 'no')
const TRACKED_FLAGS = [
  'hasHealthInsurance', 'hasTermInsurance', 'hasSIP', 'hasCreditCard', 'hasCreditCardDebt',
  'fellForScam', 'scamAware', 'hasSideHustle', 'married', 'ownsBike', 'panicSold',
  'skippedHealthInsurance', 'tookForcedLoan',
]

const profileTitle = (game) => PROFILES.find((p) => p.id === game.profileId)?.title ?? 'Player'

// ElevenLabs dynamic variables for the system prompt. All must be defined at session start.
export function dynamicVariables(game) {
  if (!game) {
    return {
      player_name: 'friend', player_age: '22', game_year: '1', player_profile: 'Fresher',
      cash: 'unknown', net_worth: 'unknown', safety_net_months: '0', credit_score: '700',
      has_health_insurance: 'no', has_term_insurance: 'no', loans: 'none',
    }
  }
  const st = getStats(game)
  return {
    player_name: game.name,
    player_age: String(game.age),
    game_year: String(Math.min(game.year, TOTAL_YEARS)),
    player_profile: profileTitle(game),
    cash: formatINR(st.cash),
    net_worth: formatINR(st.netWorth),
    safety_net_months: st.emergencyMonths.toFixed(1),
    credit_score: String(st.creditScore),
    has_health_insurance: yn(game.flags.hasHealthInsurance),
    has_term_insurance: yn(game.flags.hasTermInsurance),
    loans: st.loans > 0 ? formatINR(st.loans) : 'none',
  }
}

// One compact paragraph the agent can reason over
export function snapshot(game) {
  const st = getStats(game)
  const flags = TRACKED_FLAGS.filter((f) => game.flags[f])
  return [
    `PLAYER: ${game.name}, ${profileTitle(game)}, age ${game.age}, year ${Math.min(game.year, TOTAL_YEARS)} of ${TOTAL_YEARS}.`,
    `Cash ${formatINR(st.cash)}, invested ${formatINR(st.investments)}, loans ${formatINR(st.loans)}, net worth ${formatINR(st.netWorth)}.`,
    `Salary ${formatINR(st.monthlyIncome)}/month, living costs ${formatINR(st.monthlyExpenses)}/month, EMIs ${formatINR(st.monthlyEMI)}/month, left over ${formatINR(st.monthlySurplus)}/month.`,
    `Safety net ${st.emergencyMonths.toFixed(1)} months. Survives ${survivalDays(game)} days without salary.`,
    `CIBIL ${st.creditScore}, health ${st.health}/100, happiness ${st.happiness}/100, stress ${st.stress}/100.`,
    `Facts: ${flags.length ? flags.join(', ') : 'none yet'}.`,
  ].join(' ')
}

function optionLines(game, event) {
  return availableChoices(game, event).map((c, i) => {
    const hint = resolve(c.hint, game)
    return `${i + 1}) id=${c.id}: ${resolve(c.label, game)}${hint ? ` (${hint})` : ''}`
  })
}

// What the on-screen card looks like right now, used by get_game_state too
export function currentCard(game) {
  const turn = game?.turn
  const current = turn?.events?.[turn.index]
  const event = current && getEvent(current.id)
  if (!event || turn.outcome) return null
  const cause = current.cause != null ? game.history[current.cause] : null
  return {
    eventId: event.id,
    title: event.title,
    category: event.category,
    narration: resolve(event.narration, game),
    options: optionLines(game, event),
    consequenceOf: cause ? `year ${cause.year} choice "${cause.label}"` : null,
  }
}

function judgement(o) {
  if (o.notes?.some((n) => n.includes('emergency loan'))) return 'BAD: it forced an 18% emergency loan'
  if (o.delta <= -5000) return 'COSTLY (money gone; use the lesson to decide if it was unavoidable bad luck or a reckless choice)'
  if (o.delta >= 1000) return 'GOOD'
  return 'NO IMMEDIATE MONEY CHANGE (judge by the lesson: was it the wise or the reckless option?)'
}

function yearRecap(r) {
  const ret = r.crash
    ? `markets CRASHED (${(r.returnPct * 100).toFixed(0)}%)`
    : `investments returned ${(r.returnPct * 100).toFixed(1)}%`
  const parts = [
    `Year ${r.year} (age ${r.age}) just ended.`,
    `Earned ${formatINR(r.income)}${r.gapMonths ? ` (${r.gapMonths} months with no salary)` : ''}, living costs ${formatINR(r.living)}, EMIs ${formatINR(r.emiPaid)}.`,
    `Budget split: fun ${r.budget.fun}%, emergency fund ${r.budget.emergency}%, SIP ${r.budget.invest}%, loan prepayment ${r.budget.debt}%. ${ret}.`,
    r.interest > 0 ? `Debt interest charged ${formatINR(r.interest)}.` : '',
    `Net worth ${formatINR(r.before.netWorth)} to ${formatINR(r.after.netWorth)} (${formatDelta(r.after.netWorth - r.before.netWorth)}).`,
    ...r.notes.map((n) => n.replace(/^🎉\s*/, '')),
    `Lesson: ${r.lesson}`,
  ]
  return parts.filter(Boolean).join(' ')
}

// Decide what the agent should know and say for the current moment.
// Returns { key, context, say } or null. `key` changes once per step, so each step is announced once.
export function describeStep({ phase, game, lastReport }) {
  if (!game) return null

  if (phase === 'budget') {
    const recap = lastReport && lastReport.year === game.year - 1 ? yearRecap(lastReport) : null
    const budgetLine = `Year ${game.year} budget screen: the player splits ${formatINR(monthlySurplus(game))}/month between fun, emergency fund, SIP and loan prepayment. Safety net is ${emergencyMonths(game).toFixed(1)} months.`
    return {
      key: `budget-${game.year}`,
      context: `${snapshot(game)} SCREEN: ${budgetLine}`,
      say: recap
        ? `[GAME EVENT] ${recap} ${budgetLine} Give a 3 sentence year-end report card: praise or roast how the year went, then one pointed tip for how to split the budget now.`
        : `[GAME EVENT] ${budgetLine} Give one short, teasing tip about how to split it. Max 2 sentences.`,
    }
  }

  if (phase === 'event' && game.turn) {
    const o = game.turn.outcome
    const current = game.turn.events[game.turn.index]
    const event = getEvent(current?.id)
    if (!event) return null

    if (o) {
      const impact = `Net worth impact ${formatDelta(o.delta)}.`
      return {
        key: `out-${game.year}-${game.turn.index}`,
        context: `${snapshot(game)} SCREEN: outcome of "${event.title}" is showing; waiting for the player to press Next.`,
        say: `[GAME EVENT] On "${event.title}" the player chose "${o.label}". Result: ${o.text} ${impact} Verdict hint: ${judgement(o)}. ${o.notes?.join(' ') ?? ''} Money lesson: ${o.lesson} Roast or praise this decision in 2 short sentences, then give the lesson in one line.`,
      }
    }

    const card = currentCard(game)
    if (!card) return null
    return {
      key: `card-${game.year}-${game.turn.index}-${card.eventId}`,
      context: `${snapshot(game)} SCREEN: card ${game.turn.index + 1} of ${game.turn.events.length}, "${card.title}". Options: ${card.options.join(' | ')}. Use the id with make_choice.`,
      say: `[GAME EVENT] New card (${card.category}): "${card.title}". ${card.narration}${card.consequenceOf ? ` This is a CONSEQUENCE of their ${card.consequenceOf}.` : ''} Options: ${card.options.join('; ')}. Tease the stakes in 1 or 2 sentences, name the options in a few words each so they can choose by voice. Do not read the card out.`,
    }
  }

  if (phase === 'end') {
    const st = getStats(game)
    const recap = lastReport ? yearRecap(lastReport) : ''
    const verdict = game.status === 'bankrupt'
      ? 'The player fell into a DEBT SPIRAL and the game is over.'
      : `The player finished all ${TOTAL_YEARS} years.`
    return {
      key: `end-${game.status}`,
      context: `${snapshot(game)} SCREEN: game over (${game.status}).`,
      say: `[GAME EVENT] ${recap} ${verdict} Final net worth ${formatINR(st.netWorth)}, safety net ${st.emergencyMonths.toFixed(1)} months, ${survivalDays(game)} days of survival without income. Deliver a final verdict in 3 sentences: the biggest thing they did right, the biggest mistake, and one parting line.`,
    }
  }
  return null
}

// Result of the get_game_state client tool
export function gameStateForAgent(game, phase) {
  if (!game) return 'No game is running yet. The player is on the title or setup screen.'
  const card = phase === 'event' ? currentCard(game) : null
  return [
    snapshot(game),
    `SCREEN: ${phase}.`,
    card ? `CARD: "${card.title}". ${card.narration} Options: ${card.options.join(' | ')}.` : '',
    game.history.length
      ? `RECENT DECISIONS: ${game.history.slice(-4).map((h) => `y${h.year} "${h.label}" (${formatDelta(h.delta)})`).join('; ')}.`
      : '',
  ].filter(Boolean).join(' ')
}
