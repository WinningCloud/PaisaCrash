import PixelButton from '../components/PixelButton.jsx'
import { Piggy } from '../components/Mascot.jsx'

const FEATURES = [
  { icon: '📅', text: '10 years of life, age 22 to 32' },
  { icon: '🎴', text: 'Real events: scams, layoffs, weddings, bonuses' },
  { icon: '💥', text: 'A Crash Test Report on what saved or broke you' },
]

export default function TitleScreen({ canContinue, savedGame, onNew, onContinue }) {
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
        Live ten years of adult money life in India. Rent, EMIs, UPI scams, weddings, bonuses.
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
          Saved run: {savedGame.name}, level {Math.min(savedGame.year, 10)}, age {savedGame.age}
        </p>
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
