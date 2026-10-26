// The event deck. Cards are plain data; any field can also be a function of
// the player's state (see engine.resolve). Consequence chains are wired with
// `schedule: [{ eventId, inYears | atYear }]` on a choice.
import credit from './deck/credit.js'
import health from './deck/health.js'
import life from './deck/life.js'
import money from './deck/money.js'
import scams from './deck/scams.js'

export const DECK = [...health, ...scams, ...money, ...credit, ...life]

export const EVENTS_BY_ID = new Map(DECK.map((e) => [e.id, e]))

export const getEvent = (id) => EVENTS_BY_ID.get(id) ?? null

export const CATEGORY_STYLE = {
  medical: { label: 'HEALTH', color: 'var(--red)' },
  job: { label: 'CAREER', color: 'var(--cyan)' },
  family: { label: 'FAMILY', color: 'var(--pink)' },
  lifestyle: { label: 'LIFESTYLE', color: 'var(--purple)' },
  scam: { label: 'SCAM ALERT', color: 'var(--red)' },
  investing: { label: 'INVESTING', color: 'var(--green)' },
  windfall: { label: 'WINDFALL', color: 'var(--yellow)' },
  tech: { label: 'GADGETS', color: 'var(--cyan)' },
  education: { label: 'SKILLS', color: 'var(--green)' },
  tax: { label: 'TAX', color: 'var(--yellow)' },
}

// Catch broken chains while developing instead of mid-demo
if (import.meta.env?.DEV) {
  const ids = new Set()
  for (const ev of DECK) {
    if (ids.has(ev.id)) console.error(`[deck] duplicate event id: ${ev.id}`)
    ids.add(ev.id)
    if (!CATEGORY_STYLE[ev.category]) console.error(`[deck] ${ev.id}: unknown category ${ev.category}`)
    if (ev.choices.length < 2) console.error(`[deck] ${ev.id}: needs at least 2 choices`)
    for (const c of ev.choices) {
      for (const x of c.schedule ?? []) {
        if (!EVENTS_BY_ID.has(x.eventId)) console.error(`[deck] ${ev.id}/${c.id} schedules missing event ${x.eventId}`)
      }
    }
  }
}
