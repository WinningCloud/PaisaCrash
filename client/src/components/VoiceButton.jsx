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

export default function VoiceButton({ voice }) {
  const { status, available, muted, connect, disconnect, toggleMute } = voice
  const [icon, text] = LABELS[status]
  const offline = available === false && status === 'idle'
  const live = status === 'listening' || status === 'speaking'

  return (
    <div className="voice">
      <PixelButton
        variant={live ? 'pink' : offline ? 'ghost' : 'cyan'}
        size="sm"
        className="voice__btn"
        onClick={live ? disconnect : connect}
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
