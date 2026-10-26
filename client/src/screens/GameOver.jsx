import PixelButton from '../components/PixelButton.jsx'
import PixelCard from '../components/PixelCard.jsx'
import { START_AGE, TOTAL_YEARS, getStats, survivalDays } from '../game/engine.js'
import { formatINR, numberWordCap } from '../game/format.js'

export default function GameOver({ game, onNewGame }) {
  const st = getStats(game)
  const broke = game.status === 'bankrupt'
  return (
    <div className="stack center">
      <h1 className={`screen-title ${broke ? 'red' : 'yellow'}`}>{broke ? 'DEBT SPIRAL' : `YOU MADE IT TO ${START_AGE + TOTAL_YEARS}!`}</h1>
      <PixelCard accent={broke ? 'red' : 'yellow'}>
        <p>
          {broke
            ? `At age ${game.age}, your loans grew bigger than two and a half years of salary. The interest outran you.`
            : `${numberWordCap(TOTAL_YEARS)} years of rent, EMIs and surprises, survived.`}
        </p>
        <dl className="kv kv--big">
          <dt>Final net worth</dt><dd className={st.netWorth < 0 ? 'red' : 'green'}>{formatINR(st.netWorth)}</dd>
          <dt>Invested</dt><dd className="cyan">{formatINR(st.investments)}</dd>
          <dt>Loans</dt><dd className="red">{formatINR(st.loans)}</dd>
          <dt>Survive without income</dt><dd className="yellow">{survivalDays(game)} days</dd>
        </dl>
      </PixelCard>
      <div className="row actions">
        <PixelButton variant="yellow" size="lg" onClick={onNewGame}>★ Play again</PixelButton>
      </div>
    </div>
  )
}
