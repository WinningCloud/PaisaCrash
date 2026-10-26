import { useEffect, useState } from 'react'
import PixelSprite, { mirrorRows } from './PixelSprite.jsx'

// Paisa Pal: a front-facing piggy bank with a coin dropping into its slot
const PIG = mirrorRows([
  '......yy', '.....yYY', '.kk...yy', 'kddk.kkk', 'kdpkkppp', '.kkppppp',
  '.kpPpppp', 'kppeEppp', 'kppeeppp', 'kppppddd', 'kppppdnd', 'kppppddd',
  'kppppppp', 'kppppppp', '.kpppppp', '..kkpppp', '..kddkkk', '..kkk...',
])

const PALETTE = {
  k: '#07051a', p: '#f472b6', P: '#fbcfe8', d: '#db2777', e: '#07051a', E: '#ffffff',
  n: '#831843', y: '#facc15', Y: '#fef08a', m: '#4c0519', T: '#ef4444', t: '#22d3ee',
}

const line = (y, from, to, ch = 'm') => Array.from({ length: to - from + 1 }, (_, i) => [y, from + i, ch])

const MOUTHS = {
  idle: [[12, 6, 'm'], [12, 9, 'm'], ...line(13, 7, 8)],
  happy: [[12, 5, 'm'], [12, 10, 'm'], ...line(13, 6, 9)],
  sad: [...line(12, 6, 9), [13, 5, 'm'], [13, 10, 'm'], [9, 3, 't'], [10, 3, 't'], [11, 3, 't']],
  open: [...line(12, 6, 9), [13, 6, 'm'], [13, 7, 'T'], [13, 8, 'T'], [13, 9, 'm']],
}

export function Piggy({ mood = 'idle', size = 5, className }) {
  const [open, setOpen] = useState(false)
  const talking = mood === 'talking'

  // Flap the mouth while talking
  useEffect(() => {
    if (!talking) return
    const t = setInterval(() => setOpen((o) => !o), 140)
    return () => clearInterval(t)
  }, [talking])

  const mouth = talking ? (open ? MOUTHS.open : MOUTHS.idle) : MOUTHS[mood] ?? MOUTHS.idle
  return <PixelSprite rows={PIG} palette={PALETTE} overlay={mouth} size={size} className={className} title="Paisa Pal the piggy bank" />
}

export default function Mascot({ mood = 'idle', message }) {
  const [showBubble, setShowBubble] = useState(true)

  // A new message pops the bubble open, then it tucks away so it never blocks buttons
  const talking = mood === 'talking'
  useEffect(() => {
    setShowBubble(true)
    if (talking) return // stay up while she speaks
    const t = setTimeout(() => setShowBubble(false), 7000)
    return () => clearTimeout(t)
  }, [message, talking])

  return (
    <div className={`mascot mascot--${mood}`}>
      {message && showBubble && (
        <div className="mascot__bubble" role="status" aria-live="polite">
          <span className="mascot__name">PAISA PAL</span>
          {message}
        </div>
      )}
      <button
        className="mascot__pig"
        onClick={() => setShowBubble((s) => !s)}
        aria-label={showBubble ? 'Hide Paisa Pal tip' : 'Show Paisa Pal tip'}
      >
        <Piggy mood={mood} size={5} />
      </button>
    </div>
  )
}
