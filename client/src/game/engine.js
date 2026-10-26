// Pure game engine: no React, no DOM. Every function takes a state and
// returns a new one, so it is easy to test and the voice agent can read it.
import { createRng } from './rng.js'

export const SAVE_VERSION = 2
export const TOTAL_YEARS = 5
export const START_AGE = 22

const INFLATION = 0.06
const RAISE = 0.08
const SAVINGS_RATE = 0.03
const BASE_DEBT_RATE = 0.14
const FORCED_LOAN_RATE = 0.18
const ASSET_DEPRECIATION = 0.15
const CRASH_CHANCE = 0.12

export const BUDGET_KEYS = ['fun', 'emergency', 'invest', 'debt']

export const PROFILES = [
  {
    id: 'fresher',
    title: 'Fresher',
    emoji: '💼',
    blurb: 'First job in Bengaluru. The salary just landed, and so did the rent.',
    monthlyIncome: 30000,
    monthlyExpenses: 22000,
    cash: 20000,
    creditScore: 680,
  },
  {
    id: 'student',
    title: 'Student on Stipend',
    emoji: '🎓',
    blurb: 'Internship stipend, hostel maggi, very big dreams. Hard mode.',
    monthlyIncome: 12000,
    monthlyExpenses: 9000,
    cash: 5000,
    creditScore: 650,
  },
  {
    id: 'family',
    title: 'Family Earner',
    emoji: '👨‍👩‍👦',
    blurb: 'One salary, a parent who depends on you, and a car loan that never sleeps.',
    monthlyIncome: 60000,
    // ₹48k total outgo = ₹33k living costs + ₹15k car loan EMI
    monthlyExpenses: 33000,
    cash: 80000,
    dependents: 1,
    assets: 400000,
    emis: [{ id: 'car-loan', label: 'Car loan', amount: 15000, monthsLeft: 24 }],
    flags: { hasDependent: true, ownsCar: true },
    creditScore: 730,
  },
]

export const BUDGET_PRESETS = {
  yolo: { fun: 70, emergency: 20, invest: 10, debt: 0 },
  balanced: { fun: 30, emergency: 35, invest: 35, debt: 0 },
  safety: { fun: 10, emergency: 55, invest: 35, debt: 0 },
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const round = (v) => Math.round(Number.isFinite(v) ? v : 0)

/* ---------- Creation ---------- */

export function createInitialState({ profileId, name, avatar, seed }) {
  const p = PROFILES.find((x) => x.id === profileId) ?? PROFILES[0]
  return {
    version: SAVE_VERSION,
    seed,
    rngState: seed >>> 0,
    name: name.trim().slice(0, 14) || 'Player',
    avatar,
    profileId: p.id,
    year: 1,
    age: START_AGE,
    cash: p.cash,
    investments: 0,
    debt: 0,
    debtRate: BASE_DEBT_RATE,
    assets: p.assets ?? 0,
    monthlyIncome: p.monthlyIncome,
    monthlyExpenses: p.monthlyExpenses,
    emis: (p.emis ?? []).map((e) => ({ ...e })),
    dependents: p.dependents ?? 0,
    creditScore: p.creditScore,
    health: 80,
    happiness: 60,
    stress: 30,
    unemployedMonths: 0,
    sipYears: 0,
    budget: { ...BUDGET_PRESETS.balanced },
    flags: { ...(p.flags ?? {}) },
    scheduled: [], // delayed consequences: [{ eventId, year, cause }]
    turn: null, // this year's cards: { events: [{ id, cause }], index, outcome }
    seenEvents: [],
    history: [], // decisions, for the Crash Test Report
    years: [], // yearly report cards
    status: 'playing', // 'playing' | 'bankrupt' | 'complete'
    endReason: null,
  }
}

/* ---------- Derived stats ---------- */

export const monthlyEMI = (s) => s.emis.reduce((t, e) => t + e.amount, 0)
export const monthlyOutgo = (s) => s.monthlyExpenses + monthlyEMI(s)
export const monthlySurplus = (s) => s.monthlyIncome - monthlyOutgo(s)
export const emiBalance = (s) => s.emis.reduce((t, e) => t + e.amount * Math.max(0, e.monthsLeft), 0)
export const totalLiabilities = (s) => s.debt + emiBalance(s)
export const netWorth = (s) => s.cash + s.investments + s.assets - totalLiabilities(s)

// Months you could survive on cash alone (0 if outgo is somehow zero)
export const emergencyMonths = (s) => {
  const outgo = monthlyOutgo(s)
  return outgo > 0 ? Math.max(0, s.cash) / outgo : 0
}

export const survivalDays = (s) => {
  const daily = monthlyOutgo(s) / 30
  return daily > 0 ? Math.floor(Math.max(0, s.cash) / daily) : 0
}

export function getStats(s) {
  return {
    age: s.age,
    year: s.year,
    cash: s.cash,
    investments: s.investments,
    debt: s.debt,
    loans: totalLiabilities(s),
    assets: s.assets,
    monthlyIncome: s.monthlyIncome,
    monthlyExpenses: s.monthlyExpenses,
    monthlyEMI: monthlyEMI(s),
    monthlySurplus: monthlySurplus(s),
    emergencyMonths: emergencyMonths(s),
    netWorth: netWorth(s),
    creditScore: s.creditScore,
    health: s.health,
    happiness: s.happiness,
    stress: s.stress,
  }
}

/* ---------- Effects ---------- */

// Keep every stat inside its legal range
function sanitize(s) {
  return {
    ...s,
    cash: round(s.cash),
    investments: Math.max(0, round(s.investments)),
    debt: Math.max(0, round(s.debt)),
    debtRate: s.debt > 0 ? s.debtRate : BASE_DEBT_RATE,
    assets: Math.max(0, round(s.assets)),
    monthlyIncome: Math.max(0, round(s.monthlyIncome)),
    monthlyExpenses: Math.max(1000, round(s.monthlyExpenses)),
    creditScore: clamp(round(s.creditScore), 300, 900),
    health: clamp(round(s.health), 0, 100),
    happiness: clamp(round(s.happiness), 0, 100),
    stress: clamp(round(s.stress), 0, 100),
    unemployedMonths: clamp(round(s.unemployedMonths), 0, 12),
  }
}

const ADDITIVE = [
  'cash', 'investments', 'debt', 'assets', 'monthlyIncome', 'monthlyExpenses',
  'health', 'happiness', 'stress', 'creditScore', 'unemployedMonths',
]

// Event fields (narration, label, effects...) may be plain values or functions of state
export const resolve = (v, state) => (typeof v === 'function' ? v(state) : v)

// Apply an effects object (or a function of state returning one).
// Numbers are deltas. Extras: monthlyEMI + emiMonths / emi {label, amount, months}
// add a loan; debtRate sets the rate on revolving debt; payDownLoans prepays
// loans from cash.
export function applyEffects(state, effects) {
  const fx = resolve(effects, state)
  if (!fx) return state
  const s = { ...state, emis: state.emis.map((e) => ({ ...e })) }
  for (const key of ADDITIVE) if (fx[key]) s[key] += fx[key]
  const newEmi = (label, amount, months) => {
    if (amount > 0 && months > 0) {
      s.emis.push({ id: `emi-${s.year}-${s.history.length}-${s.emis.length}`, label, amount: round(amount), monthsLeft: months })
    }
  }
  if (fx.monthlyEMI > 0) newEmi(fx.emiLabel ?? 'Loan', fx.monthlyEMI, fx.emiMonths ?? 12)
  if (fx.emi) newEmi(fx.emi.label, fx.emi.amount, fx.emi.months)
  if (fx.payDownLoans > 0) s.cash -= prepayLoans(s, fx.payDownLoans)
  if (fx.debtRate) {
    // Blend the new loan's rate with whatever debt already exists
    const added = Math.max(0, fx.debt ?? 0)
    s.debtRate = added > 0 && s.debt > 0
      ? (state.debt * state.debtRate + added * fx.debtRate) / (state.debt + added)
      : Math.max(state.debt > 0 ? state.debtRate : 0, fx.debtRate)
  }
  return sanitize(s)
}

// If cash went negative: sell investments first, then take a forced 18% loan.
export function settleShortfall(state) {
  if (state.cash >= 0) return { state, notes: [] }
  const s = { ...state, flags: { ...state.flags } }
  const notes = []
  const sold = Math.min(s.investments, -s.cash)
  if (sold > 0) {
    s.investments -= sold
    s.cash += sold
    s.flags.brokeInvestments = true
    notes.push(`You sold ₹${round(sold).toLocaleString('en-IN')} of investments to cover the gap.`)
  }
  if (s.cash < 0) {
    const loan = -s.cash
    // Blend with existing debt so a cheap education loan isn't repriced at 18%
    s.debtRate = s.debt > 0 ? (s.debt * s.debtRate + loan * FORCED_LOAN_RATE) / (s.debt + loan) : FORCED_LOAN_RATE
    s.debt += loan
    s.cash = 0
    s.creditScore -= 40
    s.stress += 15
    s.flags.tookForcedLoan = true
    notes.push(`Out of cash! You took an emergency loan of ₹${round(loan).toLocaleString('en-IN')} at 18% interest.`)
  }
  return { state: sanitize(s), notes }
}

/* ---------- Budget ---------- */

// Set one slider and spread the rest across the unlocked others so the total stays 100
export function rebalanceBudget(budget, key, value, locked = []) {
  const v = clamp(Math.round(value), 0, 100)
  const others = BUDGET_KEYS.filter((k) => k !== key && !locked.includes(k))
  const lockedSum = locked.filter((k) => k !== key).reduce((t, k) => t + budget[k], 0)
  const capped = Math.min(v, 100 - lockedSum)
  const rest = 100 - capped - lockedSum
  const otherSum = others.reduce((t, k) => t + budget[k], 0)
  const raw = others.map((k) => rest * (otherSum > 0 ? budget[k] / otherSum : 1 / others.length))
  const floors = raw.map(Math.floor)
  let left = rest - floors.reduce((t, x) => t + x, 0)
  const order = raw.map((r, i) => [r - floors[i], i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) if (left-- > 0) floors[i]++
  const next = { ...budget, [key]: others.length ? capped : 100 - lockedSum }
  others.forEach((k, i) => (next[k] = floors[i]))
  return next
}

// Make any budget sum to exactly 100 (guards against bad saves)
export function normalizeBudget(budget, locked = []) {
  const b = { ...budget }
  for (const k of locked) b[k] = 0
  const total = BUDGET_KEYS.reduce((t, k) => t + Math.max(0, b[k] || 0), 0)
  if (total === 100) return b
  if (total === 0) return { ...BUDGET_PRESETS.balanced }
  const first = BUDGET_KEYS.find((k) => !locked.includes(k))
  return rebalanceBudget(b, first, ((b[first] || 0) * 100) / total, locked)
}

export const hasAnyDebt = (s) => s.debt > 0 || s.emis.length > 0

export function setBudget(state, budget) {
  const locked = hasAnyDebt(state) ? [] : ['debt']
  return { ...state, budget: normalizeBudget(budget, locked) }
}

/* ---------- Yearly tick ---------- */

const snapshot = (s) => ({ ...getStats(s) })

// Prepay revolving debt first, then shorten the costliest EMI. Returns amount used.
function prepayLoans(s, amount) {
  let left = amount
  const fromDebt = Math.min(left, s.debt)
  s.debt -= fromDebt
  left -= fromDebt
  const emis = [...s.emis].sort((a, b) => b.amount - a.amount)
  for (const e of emis) {
    if (left < e.amount) continue
    const months = Math.min(e.monthsLeft, Math.floor(left / e.amount))
    e.monthsLeft -= months
    left -= months * e.amount
  }
  s.emis = s.emis.filter((e) => e.monthsLeft > 0)
  return amount - left
}

function pickLesson(r, s) {
  if (r.gapMonths > 0) {
    return r.forcedLoan
      ? 'No salary and no emergency fund means borrowing at 18% just to buy groceries. Build the airbag before the crash.'
      : 'Your emergency fund paid the bills while there was no salary. That is exactly what it is for.'
  }
  if (r.crash && r.toInvest > 0) return 'Markets crashed, but your SIP kept buying units cheap. Pausing in panic is how crashes become real losses.'
  if (r.forcedLoan) return 'Running out of cash forces you into the worst loans. An emergency fund is cheaper than 18% interest.'
  if (r.surplus < 0) return 'Spending more than you earn means every month quietly borrows from future you.'
  if (r.interest > 0 && r.interest > Math.max(0, r.invGain)) return `Your debt cost you ${round(r.interest).toLocaleString('en-IN')} rupees in interest this year. Kill high-interest debt before investing.`
  if (emergencyMonths(s) < 3) return 'Aim for 3 to 6 months of expenses as an emergency fund. It is the airbag that stops one bad month becoming a bad year.'
  if (r.budget.fun >= 50) return 'Spending on joy is fine. Just pay future you first, then enjoy the rest guilt-free.'
  if (r.toInvest > 0 && r.invGain > 0) return 'Your money worked while you slept. Time in the market beats timing the market.'
  return 'Inflation ate about 6% of your money\'s value this year. Cash that just sits there slowly shrinks.'
}

// Close the books on the current year and move to the next one.
// Returns { state, report } where report is the Year Summary report card.
export function simulateYear(state) {
  const rng = createRng(state.rngState)
  const before = snapshot(state)
  const s = { ...state, flags: { ...state.flags }, emis: state.emis.map((e) => ({ ...e })) }
  const notes = []
  const budget = { ...s.budget }

  // Cash flow: EMIs run all year, salary only for the months you had a job
  const gapMonths = clamp(s.unemployedMonths, 0, 12)
  const workMonths = 12 - gapMonths
  const income = s.monthlyIncome * workMonths
  const living = s.monthlyExpenses * 12
  let emiPaid = 0
  for (const e of s.emis) {
    const m = Math.min(12, e.monthsLeft)
    emiPaid += m * e.amount
    e.monthsLeft -= m
    if (e.monthsLeft <= 0) notes.push(`🎉 ${e.label} fully paid off. That EMI is gone forever!`)
  }
  s.emis = s.emis.filter((e) => e.monthsLeft > 0)
  const emiPerMonth = emiPaid / 12
  const surplus = income - living - emiPaid

  // Months with no salary are paid straight from cash; if it runs dry, forced loan
  const gapCost = (s.monthlyExpenses + emiPerMonth) * gapMonths
  let gapLoan = false
  if (gapCost > 0) {
    s.cash -= gapCost
    const gap = settleShortfall(sanitize(s))
    Object.assign(s, gap.state)
    notes.push(...gap.notes)
    gapLoan = gap.notes.some((n) => n.includes('emergency loan'))
  }

  // Split the working months' surplus by the budget
  const workSurplus = surplus + gapCost
  let fun = 0, toInvest = 0, toDebt = 0, toCash = workSurplus
  const openingDebt = s.debt
  if (workSurplus > 0) {
    fun = (workSurplus * budget.fun) / 100
    toInvest = (workSurplus * budget.invest) / 100
    toDebt = prepayLoans(s, (workSurplus * budget.debt) / 100)
    toCash = workSurplus - fun - toInvest - toDebt
  }

  // Interest on revolving debt; prepayments happen through the year, so the
  // average balance sits halfway between opening and closing
  const avgDebt = (openingDebt + s.debt) / 2
  const interest = s.debt > 0 ? avgDebt * s.debtRate : 0
  s.debt += interest

  // Investments: 4-14% in a normal year, -12 to -25% in a crash year
  const crash = rng.chance(CRASH_CHANCE)
  const returnPct = crash ? rng.range(-0.25, -0.12) : rng.range(0.04, 0.14)
  const invGain = (s.investments + toInvest / 2) * returnPct
  s.investments += toInvest + invGain
  if (toInvest > 0) {
    s.sipYears += 1
    s.flags.hasSIP = true
  } else {
    s.flags.hasSIP = false
  }

  // Cash earns savings-account interest
  const cashInterest = Math.max(0, s.cash) * SAVINGS_RATE
  s.cash += toCash + cashInterest
  s.assets *= 1 - ASSET_DEPRECIATION

  // Cover any hole in the books
  const settled = settleShortfall(sanitize(s))
  Object.assign(s, settled.state)
  notes.push(...settled.notes)
  const forcedLoan = gapLoan || settled.notes.some((n) => n.includes('emergency loan'))

  // Life stats
  const funShare = surplus > 0 ? budget.fun / 100 : 0
  s.happiness += Math.round((funShare - 0.25) * 30) + (surplus < 0 ? -6 : 0)
  const em = emergencyMonths(s)
  s.stress += em < 1 ? 12 : em < 3 ? 5 : em >= 6 ? -10 : -3
  if (s.debt > s.monthlyIncome * 6) s.stress += 8
  s.health -= 2 + (s.stress > 70 ? 5 : 0)
  if (s.debt > 0 && s.debtRate >= 0.3) s.creditScore -= 25
  else if (!forcedLoan) s.creditScore += hasAnyDebt(s) ? 20 : 8

  // Next year: raise (unless you lost your job) and inflation
  const hadJobLoss = s.unemployedMonths > 0
  if (!hadJobLoss) s.monthlyIncome *= 1 + RAISE
  s.monthlyExpenses *= 1 + INFLATION
  s.unemployedMonths = 0

  s.age += 1
  s.year += 1
  s.rngState = rng.state

  let next = sanitize(s)

  // Debt Spiral: expensive (15%+) debt bigger than a year's salary, or all loans
  // bigger than 2.5 years of it (floor so a tiny stipend isn't instant death)
  const annualIncome = Math.max(next.monthlyIncome * 12, 200000)
  const expensive = next.debtRate >= 0.15 && next.debt > annualIncome
  if (next.debt > 0 && (expensive || totalLiabilities(next) > annualIncome * 2.5)) {
    next = { ...next, status: 'bankrupt', endReason: 'debt-spiral' }
  } else if (next.year > TOTAL_YEARS) {
    next = { ...next, status: 'complete', endReason: 'completed' }
  }

  const report = {
    year: state.year,
    age: state.age,
    before,
    after: snapshot(next),
    budget,
    income, living, emiPaid, surplus, gapMonths, gapCost,
    fun, toCash, toInvest, toDebt,
    interest, invGain, returnPct, crash, cashInterest,
    raise: !hadJobLoss,
    forcedLoan,
    notes,
  }
  report.lesson = pickLesson(report, next)
  next.years = [...next.years, report]
  return { state: next, report }
}

/* ---------- Events (deck lives in events.js) ---------- */

export const MAX_EVENTS_PER_YEAR = 5

const flagOn = (s, f) => Boolean(s.flags[f])

// One condition format shared by events, delayed consequences and single choices
export function meetsRequires(s, r) {
  if (!r) return true
  if (r.flags?.some((f) => !flagOn(s, f))) return false
  if (r.notFlags?.some((f) => flagOn(s, f))) return false
  if (r.anyFlags && !r.anyFlags.some((f) => flagOn(s, f))) return false
  if (r.minCash != null && s.cash < r.minCash) return false
  if (r.maxCash != null && s.cash > r.maxCash) return false
  if (r.minIncome != null && s.monthlyIncome < r.minIncome) return false
  if (r.maxIncome != null && s.monthlyIncome > r.maxIncome) return false
  if (r.minInvestments != null && s.investments < r.minInvestments) return false
  if (r.minDebt != null && s.debt < r.minDebt) return false
  if (r.hasLoans && !hasAnyDebt(s)) return false
  if (r.maxEmergencyMonths != null && emergencyMonths(s) > r.maxEmergencyMonths) return false
  if (r.minEmergencyMonths != null && emergencyMonths(s) < r.minEmergencyMonths) return false
  if (r.profiles && !r.profiles.includes(s.profileId)) return false
  return true
}

const lastSeenYear = (s, id) => s.history.reduce((y, h) => (h.eventId === id ? Math.max(y, h.year) : y), 0)

// Can this card be drawn at random this year?
export function isEligible(s, ev) {
  if (ev.scheduledOnly) return false
  if (s.year < (ev.minYear ?? 1) || s.year > (ev.maxYear ?? TOTAL_YEARS)) return false
  if (ev.repeatable) {
    const last = lastSeenYear(s, ev.id)
    if (last && s.year - last < (ev.cooldown ?? 3)) return false
  } else if (s.seenEvents.includes(ev.id)) {
    return false
  }
  return meetsRequires(s, ev.requires)
}

export function eventWeight(s, ev) {
  let w = ev.baseWeight ?? 1
  for (const m of ev.weightModifiers ?? []) {
    if (m.ifFlag && flagOn(s, m.ifFlag)) w *= m.multiply
    if (m.ifNotFlag && !flagOn(s, m.ifNotFlag)) w *= m.multiply
  }
  return w
}

// Choices whose own conditions pass (e.g. "Claim insurance" needs a policy)
export const availableChoices = (s, ev) =>
  ev.choices.filter((c) => meetsRequires(s, c.requires) && (!c.when || c.when(s)))

// Pull consequences that are due. Ones whose conditions no longer hold are
// dropped (you dodged them); extras beyond `limit` wait for the next draw.
function takeDue(state, byId, limit, exclude = []) {
  const events = []
  const keep = []
  for (const x of state.scheduled) {
    const ev = byId.get(x.eventId)
    if (!ev) continue
    if (x.year > state.year) keep.push(x)
    else if (!meetsRequires(state, ev.requires)) continue
    else if (events.length < limit && !exclude.includes(x.eventId) && !events.some((e) => e.id === x.eventId)) {
      events.push({ id: x.eventId, cause: x.cause })
    } else keep.push(x)
  }
  return { state: { ...state, scheduled: keep }, events }
}

// Draw this year's 2-3 cards: due consequences first, then weighted random picks.
export function drawEvents(state, deck) {
  if (!deck?.length) return { state, events: [] }
  const rng = createRng(state.rngState)
  const byId = new Map(deck.map((e) => [e.id, e]))
  const due = takeDue(state, byId, 3)
  const picked = [...due.events]
  const target = Math.max(rng.int(2, 3), picked.length)
  let pool = deck.filter((e) => isEligible(state, e) && !picked.some((p) => p.id === e.id))
  while (picked.length < target && pool.length) {
    const ev = rng.weighted(pool, (e) => eventWeight(state, e))
    if (!ev) break
    picked.push({ id: ev.id, cause: null })
    pool = pool.filter((e) => e.id !== ev.id)
  }
  // Late game, the one-off cards run out: let repeatable ones skip their cooldown
  if (picked.length < 2) {
    const reruns = deck.filter((e) => e.repeatable && isEligible({ ...state, history: [] }, e) && !picked.some((p) => p.id === e.id))
    const ev = rng.weighted(reruns, (e) => eventWeight(state, e))
    if (ev) picked.push({ id: ev.id, cause: null })
  }
  return { state: { ...due.state, rngState: rng.state }, events: picked }
}

// Consequences scheduled for *this* year (inYears: 0) jump into the current queue
export function drawDueNow(state, deck, queued = []) {
  const room = MAX_EVENTS_PER_YEAR - queued.length
  if (room <= 0 || !deck?.length) return { state, events: [] }
  const byId = new Map(deck.map((e) => [e.id, e]))
  return takeDue(state, byId, room, queued.map((q) => q.id))
}

// What a choice would do right now, for the price tags on the card
export function previewChoice(state, choice) {
  const fx = resolve(choice.effects, state) ?? {}
  const after = applyEffects(state, fx)
  const shortfall = Math.max(0, -after.cash)
  const sell = Math.min(shortfall, after.investments)
  return { fx, shortfall, sell, loan: shortfall - sell }
}

// Apply a choice from an event card and log it for the final report.
export function resolveChoice(state, event, choiceId, cause = null) {
  const choice = availableChoices(state, event).find((c) => c.id === choiceId)
  if (!choice) return { state, outcome: null }

  // Text is resolved against the state *before* the choice, same as the effects
  const label = resolve(choice.label, state)
  const text = resolve(choice.outcomeText, state)
  const lesson = resolve(choice.lesson, state)
  const nwBefore = netWorth(state)

  let s = applyEffects(state, choice.effects)
  s = {
    ...s,
    flags: { ...s.flags },
    seenEvents: s.seenEvents.includes(event.id) ? s.seenEvents : [...s.seenEvents, event.id],
  }
  for (const f of choice.setFlags ?? []) s.flags[f] = true
  for (const f of choice.clearFlags ?? []) delete s.flags[f]

  const settled = settleShortfall(s)
  s = settled.state
  const delta = netWorth(s) - nwBefore

  const entry = {
    year: state.year,
    age: state.age,
    eventId: event.id,
    title: event.title,
    emoji: event.emoji,
    category: event.category,
    choiceId,
    label,
    delta,
    chainDelta: 0,
    lesson,
    causedBy: cause,
  }
  const history = [...s.history, entry]
  const index = history.length - 1
  // A delayed consequence also counts against the decision that caused it
  if (cause != null && history[cause]) {
    history[cause] = { ...history[cause], chainDelta: history[cause].chainDelta + delta }
  }
  const scheduled = [
    ...s.scheduled,
    ...(choice.schedule ?? []).map((x) => ({
      eventId: x.eventId,
      year: x.atYear != null ? Math.max(x.atYear, s.year + 1) : s.year + (x.inYears ?? 1),
      cause: index,
    })),
  ]

  return {
    state: { ...s, history, scheduled },
    outcome: {
      eventId: event.id,
      choiceId,
      label,
      text,
      lesson,
      fx: resolve(choice.effects, state) ?? {},
      narration: resolve(event.narration, state),
      delta,
      cashDelta: s.cash - state.cash,
      notes: settled.notes,
    },
  }
}
