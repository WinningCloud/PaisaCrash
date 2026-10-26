import { emergencyMonths } from '../engine.js'
import { formatINR } from '../format.js'
import { createRng, hashSeed } from '../rng.js'

export const inr = formatINR
export const em = emergencyMonths

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
export const r500 = (v) => Math.round(v / 500) * 500

// Lifestyle costs scale with what you earn (a ₹30k fresher = 1x)
export const scale = (s) => clamp(s.monthlyIncome / 30000, 0.4, 3)
export const amt = (s, base) => Math.max(500, r500(base * scale(s)))

// Hospital bills barely care about your salary
export const med = (s, base) => r500(base * clamp(scale(s), 0.8, 1.4))

// Deterministic "luck" for a run, so the same seed always plays the same way
export const luck = (s, salt) => createRng(hashSeed(`${s.seed}:${s.year}:${salt}`)).next()

// Never take more cash than exists; the rest becomes debt
export const fromCashThenDebt = (s, amount, rate) => {
  const fromCash = Math.min(Math.max(0, s.cash), amount)
  const rest = amount - fromCash
  return rest > 0 ? { cash: -fromCash, debt: rest, debtRate: rate } : { cash: -fromCash }
}

// EMI for a loan of `principal` at `annualRate` over `months` (standard formula)
export const emiFor = (principal, annualRate, months) => {
  const r = annualRate / 12
  return r500((principal * r * (1 + r) ** months) / ((1 + r) ** months - 1))
}

export const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
