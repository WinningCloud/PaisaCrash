import PixelButton from './PixelButton.jsx'

const LABELS = {
  idle: ['🎤', 'TALK TO PAISA PAL'],
  connecting: ['⏳', 'CONNECTING...'],
  listening: ['👂', 'LISTENING · TAP TO END'],
  speaking: ['🔊', 'PAISA PAL SPEAKING'],
}

// Animated equaliser bars: tall when Paisa Pal speaks, flat while she listens
function Bars({ active }) {
  return (
    <span className={`eq${active ? ' eq--on' : ''}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  )
}

// kind: 'game' (in-game Paisa Pal, shown in the HUD) or 'home' (title-screen money coach)
export default function VoiceButton({ voice, kind = 'game', size = 'sm' }) {
  const { muted, connect, disconnect, toggleMute } = voice
  const available = kind === 'home' ? voice.homeAvailable : voice.available
  const status = !voice.kind || voice.kind === kind ? voice.status : 'idle'
  const [icon, text] = LABELS[status]
  const offline = available === false && status === 'idle'
  const live = status === 'listening' || status === 'speaking'

  return (
    <div className="voice">
      <PixelButton
        variant={live ? 'pink' : offline ? 'ghost' : 'cyan'}
        size={size}
        className="voice__btn"
        onClick={() => (live ? disconnect() : connect(kind))}
        disabled={status === 'connecting'}
        aria-label={live ? 'End voice chat with Paisa Pal' : 'Talk to Paisa Pal by voice'}
      >
        <span aria-hidden>{offline ? '🔇' : icon}</span>
        <span className="voice__text">{offline ? 'VOICE OFFLINE' : text}</span>
        {live && <Bars active={status === 'speaking'} />}
      </PixelButton>
      {live && (
        <PixelButton
          variant={muted ? 'red' : 'ghost'}
          size="sm"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute your microphone' : 'Mute your microphone'}
        >
          {muted ? '🔇 MIC OFF' : '🎙️ MIC ON'}
        </PixelButton>
      )}
    </div>
  )
}
