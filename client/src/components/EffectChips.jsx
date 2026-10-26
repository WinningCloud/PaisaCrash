import { formatDelta, formatINR } from '../game/format.js'

const signed = (n) => `${n > 0 ? '+' : ''}${Math.round(n)}`

// Turn a resolved effects object into little price tags: [{ text, tone }]
export function effectChips(fx = {}) {
  const chips = []
  const add = (cond, text, tone) => cond && chips.push({ text, tone })

  add(fx.cash, `💰 ${formatDelta(fx.cash)}`, fx.cash > 0 ? 'good' : 'bad')
  add(fx.investments, `📈 Invest ${formatDelta(fx.investments)}`, fx.investments > 0 ? 'good' : 'bad')
  add(fx.debt > 0, `💳 Debt +${formatINR(fx.debt)}${fx.debtRate ? ` at ${Math.round(fx.debtRate * 100)}%` : ''}`, 'bad')
  add(fx.debt < 0, `💳 Debt ${formatDelta(fx.debt)}`, 'good')
  add(fx.payDownLoans > 0, `🔨 Prepay loans ${formatINR(fx.payDownLoans)}`, 'good')
  if (fx.emi) add(fx.emi.amount > 0, `🧾 EMI ${formatINR(fx.emi.amount)}/mo × ${fx.emi.months}`, 'bad')
  add(fx.monthlyEMI > 0, `🧾 EMI ${formatINR(fx.monthlyEMI)}/mo × ${fx.emiMonths ?? 12}`, 'bad')
  add(fx.assets, `🏷️ Assets ${formatDelta(fx.assets)}`, fx.assets > 0 ? 'good' : 'bad')
  add(fx.monthlyIncome, `💼 Salary ${formatDelta(fx.monthlyIncome)}/mo`, fx.monthlyIncome > 0 ? 'good' : 'bad')
  add(fx.monthlyExpenses, `🧺 Bills ${formatDelta(fx.monthlyExpenses)}/mo`, fx.monthlyExpenses > 0 ? 'bad' : 'good')
  add(fx.unemployedMonths > 0, `⛔ No salary ${fx.unemployedMonths} mo`, 'bad')
  add(fx.health, `❤️ ${signed(fx.health)}`, fx.health > 0 ? 'good' : 'bad')
  add(fx.happiness, `😊 ${signed(fx.happiness)}`, fx.happiness > 0 ? 'good' : 'bad')
  add(fx.stress, `😰 ${signed(fx.stress)}`, fx.stress > 0 ? 'bad' : 'good')
  add(fx.creditScore, `📊 CIBIL ${signed(fx.creditScore)}`, fx.creditScore > 0 ? 'good' : 'bad')
  return chips
}

export default function EffectChips({ fx, empty = 'No immediate cost' }) {
  const chips = effectChips(fx)
  return (
    <span className="chips">
      {chips.length ? (
        chips.map((c) => (
          <span key={c.text} className={`chip chip--${c.tone}`}>{c.text}</span>
        ))
      ) : (
        <span className="chip chip--neutral">{empty}</span>
      )}
    </span>
  )
}
