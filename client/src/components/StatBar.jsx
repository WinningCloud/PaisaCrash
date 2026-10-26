// Segmented "health bar". inverse=true means high is bad (stress).
export default function StatBar({ label, value, min = 0, max = 100, color = 'var(--green)', inverse = false, display, tip }) {
  const pct = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0
  const filled = Math.round(pct * 10)
  const danger = inverse ? pct >= 0.75 : pct <= 0.25
  const c = danger ? 'var(--red)' : color
  return (
    <div className={`statbar${danger ? ' statbar--danger' : ''}`} title={tip}>
      <span className="statbar__label">{label}</span>
      <div
        className="statbar__track"
        style={{ '--c': c }}
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`statbar__seg${i < filled ? ' on' : ''}`} />
        ))}
      </div>
      <span className="statbar__value">{display ?? Math.round(value)}</span>
    </div>
  )
}
