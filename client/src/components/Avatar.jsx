import PixelSprite, { mirrorRows } from './PixelSprite.jsx'

const SHORT_HAIR = mirrorRows([
  '...hhh', '..hhhh', '.hhhhh', '.hhsss', '.hssss', '.ssess', '.sssss',
  '.ssssm', '..ssss', '....ss', '.wwwww', 'wwwwwW', 'wwwwwW', 'swwwww',
])

const LONG_HAIR = mirrorRows([
  '...hhh', '..hhhh', '.hhhhh', 'hhhsss', 'hhssss', 'hhsess', 'hhssss',
  'hhsssm', 'hh.sss', 'hh..ss', '.wwwww', 'wwwwwW', 'wwwwwW', 'swwwww',
])

const GLASSES = [[5, 2, 'g'], [5, 4, 'g'], [5, 5, 'g'], [5, 6, 'g'], [5, 7, 'g'], [5, 9, 'g']]

const base = { e: '#07051a', m: '#7f1d1d', g: '#07051a' }

export const AVATARS = [
  { id: 0, name: 'The Coder', rows: SHORT_HAIR, overlay: GLASSES, palette: { ...base, h: '#1f1633', s: '#c68642', w: '#8b5cf6', W: '#5b35c9' } },
  { id: 1, name: 'The Hustler', rows: LONG_HAIR, overlay: [], palette: { ...base, h: '#3b1f12', s: '#8d5524', w: '#f472b6', W: '#facc15' } },
  { id: 2, name: 'The Topper', rows: SHORT_HAIR, overlay: [], palette: { ...base, h: '#2d1b0e', s: '#e0ac69', w: '#22c55e', W: '#15803d' } },
  { id: 3, name: 'The Dreamer', rows: LONG_HAIR, overlay: GLASSES, palette: { ...base, h: '#111111', s: '#a0662f', w: '#22d3ee', W: '#0e9fb8' } },
]

export default function Avatar({ id = 0, size = 4, className }) {
  const a = AVATARS[id] ?? AVATARS[0]
  return <PixelSprite rows={a.rows} overlay={a.overlay} palette={a.palette} size={size} className={className} title={a.name} />
}
