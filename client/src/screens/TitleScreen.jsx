import PixelButton from '../components/PixelButton.jsx'
import { Piggy } from '../components/Mascot.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import { START_AGE, TOTAL_YEARS } from '../game/engine.js'
import { numberWord } from '../game/format.js'

const FEATURES = [
  { icon: '📅', text: `${TOTAL_YEARS} years of life, age ${START_AGE} to ${START_AGE + TOTAL_YEARS}` },
  { icon: '🎴', text: 'Real events: scams, layoffs, weddings, bonuses' },
  { icon: '💥', text: 'A Crash Test Report on what saved or broke you' },
]

export default function TitleScreen({ canContinue, savedGame, voice, onNew, onContinue }) {
  return (
    <div className="title">
      <div className="title__pig">
        <Piggy mood="happy" size={9} />
      </div>

      <h1 className="title__logo">
        <span className="title__logo-top">PAISA</span>
        <span className="title__logo-bottom">CRASH TEST</span>
      </h1>
      <p className="title__tag">MoneyMatters · make money make sense.</p>

      <p className="title__pitch">
        Live {numberWord(TOTAL_YEARS)} years of adult money life in India. Rent, EMIs, UPI scams, weddings, bonuses.
        Every choice you make comes back to find you.
      </p>

      <div className="title__menu">
        {canContinue && (
          <PixelButton variant="yellow" size="lg" onClick={onContinue}>
            ▶ Continue
          </PixelButton>
        )}
        <PixelButton variant={canContinue ? 'ghost' : 'yellow'} size="lg" onClick={onNew}>
          ★ New Game
        </PixelButton>
      </div>
      {canContinue && savedGame && (
        <p className="dim">
          Saved run: {savedGame.name}, level {Math.min(savedGame.year, TOTAL_YEARS)}, age {savedGame.age}
        </p>
      )}

      {voice && (
        <div className="title__voice">
          <VoiceButton voice={voice} kind="home" size="lg" />
          <p className="dim">Ask Paisa Pal about saving, investing, loans or insurance.</p>
        </div>
      )}

      <p className="title__press blink">INSERT COIN · PRESS START</p>

      <ul className="title__features">
        {FEATURES.map((f) => (
          <li key={f.text}>
            <span className="title__feature-icon" aria-hidden>{f.icon}</span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
