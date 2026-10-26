import Avatar from './Avatar.jsx'
import CoinCounter from './CoinCounter.jsx'
import StatBar from './StatBar.jsx'
import Term from './Term.jsx'
import VoiceButton from './VoiceButton.jsx'
import { TOTAL_YEARS, getStats } from '../game/engine.js'
import { formatINRShort, formatMonths } from '../game/format.js'
import { GLOSSARY } from '../game/glossary.js'

export default function Hud({ game, voice, children }) {
  const st = getStats(game)
  const level = Math.min(game.year, TOTAL_YEARS)
  const progress = ((level - 1) / TOTAL_YEARS) * 100

  return (
    <header className="hud">
      <div className="hud__inner">
        <div className="hud__top">
          <div className="hud__who">
            <Avatar id={game.avatar} size={3} />
            <span className="hud__name">{game.name}</span>
          </div>
          <div className="hud__level">
            <span className="hud__level-text">
              <span className="hide-sm">LEVEL</span><span className="show-sm">LV</span> {level} · AGE {game.age}
            </span>
            <div className="hud__xp" aria-label={`Year ${level} of ${TOTAL_YEARS}`}>
              <div className="hud__xp-fill" style={{ width: `${Math.max(4, progress)}%` }} />
            </div>
          </div>
          <CoinCounter value={st.cash} />
          {children}
        </div>

        <div className="hud__bars">
          <StatBar label="HEALTH" value={st.health} color="var(--green)" />
          <StatBar label="HAPPY" value={st.happiness} color="var(--pink)" />
          <StatBar label="STRESS" value={st.stress} color="var(--purple)" inverse />
          <StatBar label="CIBIL" value={st.creditScore} min={300} max={900} color="var(--cyan)" tip={GLOSSARY.CIBIL} />
        </div>

        <div className="hud__money">
          <span><Term k="Net worth">Net worth</Term> <b className={st.netWorth < 0 ? 'red' : ''}>{formatINRShort(st.netWorth)}</b></span>
          <span>Invested <b>{formatINRShort(st.investments)}</b></span>
          <span>Loans <b className={st.loans > 0 ? 'red' : ''}>{formatINRShort(st.loans)}</b></span>
          <span><Term k="Emergency fund">Safety net</Term> <b className={st.emergencyMonths < 3 ? 'red' : 'green'}>{formatMonths(st.emergencyMonths)}</b></span>
        </div>

        {voice && <VoiceButton voice={voice} />}
      </div>
    </header>
  )
}
