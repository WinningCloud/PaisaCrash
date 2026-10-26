import { useState } from 'react'
import PixelButton from '../components/PixelButton.jsx'
import PixelCard from '../components/PixelCard.jsx'
import Term from '../components/Term.jsx'
import {
  BUDGET_KEYS, BUDGET_PRESETS, hasAnyDebt, monthlyEMI, monthlyOutgo,
  monthlySurplus, normalizeBudget, rebalanceBudget,
} from '../game/engine.js'
import { formatINR, formatMonths } from '../game/format.js'

const SLOTS = {
  fun: { emoji: '🎉', label: 'Fun & spending', color: 'var(--pink)', desc: 'Swiggy, movies, trips. Keeps you happy.' },
  emergency: { emoji: '🛟', label: <Term k="Emergency fund" />, color: 'var(--green)', desc: 'Cash for bad days. Your airbag.' },
  invest: { emoji: '📈', label: <><Term k="SIP" /> investing</>, color: 'var(--cyan)', desc: 'Mutual funds. About 10% a year, sometimes dips.' },
  debt: { emoji: '🔨', label: 'Pay off loans early', color: 'var(--yellow)', desc: 'Prepay loans and cut the interest.' },
}

const PRESETS = [
  { id: 'yolo', label: '🎉 YOLO' },
  { id: 'balanced', label: '⚖️ Balanced' },
  { id: 'safety', label: '🛡️ Safety first' },
  { id: 'crusher', label: '🔨 Debt crusher', needsDebt: true },
]
const CRUSHER = { fun: 10, emergency: 25, invest: 15, debt: 50 }

export default function BudgetScreen({ game, onConfirm }) {
  const locked = hasAnyDebt(game) ? [] : ['debt']
  const [budget, setBudget] = useState(() => normalizeBudget(game.budget, locked))
  const surplus = monthlySurplus(game)
  const outgo = monthlyOutgo(game)
  const emi = monthlyEMI(game)
  const short = surplus <= 0

  // Rough end-of-year safety net if nothing goes wrong
  const yearlyToCash = short ? surplus * 12 : (surplus * 12 * (budget.emergency + (locked.length ? budget.debt : 0))) / 100
  const nowMonths = outgo > 0 ? Math.max(0, game.cash) / outgo : 0
  const nextMonths = outgo > 0 ? Math.max(0, game.cash + yearlyToCash) / (outgo * 1.06) : 0

  const applyPreset = (id) => setBudget(normalizeBudget(id === 'crusher' ? CRUSHER : BUDGET_PRESETS[id], locked))

  return (
    <div className="stack">
      <h1 className="screen-title">YEAR {game.year} · PLAN YOUR MONEY</h1>

      <PixelCard title="THIS MONTH'S PAYSLIP" accent="cyan">
        <dl className="kv kv--big">
          <dt>Take-home salary</dt><dd className="green">+{formatINR(game.monthlyIncome)}</dd>
          <dt>Rent, food, bills</dt><dd className="red">-{formatINR(game.monthlyExpenses)}</dd>
          {emi > 0 && (<><dt><Term k="EMI" />s ({game.emis.map((e) => e.label).join(', ')})</dt><dd className="red">-{formatINR(emi)}</dd></>)}
          <dt className="kv__total"><Term k="Surplus">Left to plan</Term></dt>
          <dd className={`kv__total ${short ? 'red' : 'yellow'}`}>{formatINR(surplus)}</dd>
        </dl>
      </PixelCard>

      {short ? (
        <PixelCard title="⚠ YOU'RE SPENDING MORE THAN YOU EARN" accent="red">
          <p>
            Every month {formatINR(-surplus)} comes out of your savings. Over the year that is{' '}
            <span className="red">{formatINR(-surplus * 12)}</span>. If your cash hits zero, you will be forced into an 18% loan.
          </p>
        </PixelCard>
      ) : (
        <PixelCard title={`SPLIT YOUR ${formatINR(surplus)} EVERY MONTH`} accent="accent">
          <div className="presets">
            {PRESETS.filter((p) => !p.needsDebt || !locked.length).map((p) => (
              <PixelButton key={p.id} variant="ghost" size="sm" onClick={() => applyPreset(p.id)}>{p.label}</PixelButton>
            ))}
          </div>

          <div className="sliders">
            {BUDGET_KEYS.map((key) => {
              const slot = SLOTS[key]
              const disabled = locked.includes(key)
              const pct = budget[key]
              return (
                <div key={key} className={`slider${disabled ? ' slider--off' : ''}`}>
                  <div className="slider__head">
                    <span className="slider__label">
                      <span aria-hidden>{slot.emoji}</span> {slot.label}
                    </span>
                    <span className="slider__pct" style={{ color: slot.color }}>{pct}%</span>
                  </div>
                  <input
                    type="range"
                    className="prange"
                    min={0}
                    max={100}
                    value={pct}
                    disabled={disabled}
                    aria-label={typeof slot.label === 'string' ? slot.label : key}
                    style={{ '--c': slot.color, '--fill': `${pct}%` }}
                    onChange={(e) => setBudget((b) => rebalanceBudget(b, key, Number(e.target.value), locked))}
                  />
                  <div className="slider__foot dim">
                    {disabled ? 'No loans to pay off. Nice!' : (
                      <>{formatINR((surplus * pct) / 100)}/mo · {formatINR((surplus * 12 * pct) / 100)} this year · {slot.desc}</>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="budget-total">
            TOTAL <span className="green">100%</span>
          </div>
        </PixelCard>
      )}

      <PixelCard accent={nextMonths < 3 ? 'red' : 'green'}>
        <p className="forecast">
          <Term k="Emergency fund">Safety net</Term>:{' '}
          <span className={nowMonths < 3 ? 'red' : 'green'}>{formatMonths(nowMonths)}</span>
          {' → '}
          <span className={nextMonths < 3 ? 'red' : 'green'}>{formatMonths(nextMonths)}</span> by year end
          <span className="dim"> (if nothing goes wrong. Something usually does.)</span>
        </p>
      </PixelCard>

      <div className="row actions">
        <PixelButton variant="yellow" size="lg" onClick={() => onConfirm(budget)}>
          {short ? 'Survive the year ▶' : 'Lock budget ▶'}
        </PixelButton>
      </div>
    </div>
  )
}
