import { useState } from 'react'
import Avatar, { AVATARS } from '../components/Avatar.jsx'
import PixelButton from '../components/PixelButton.jsx'
import PixelCard from '../components/PixelCard.jsx'
import Term from '../components/Term.jsx'
import { PROFILES } from '../game/engine.js'
import { formatINR } from '../game/format.js'
import { hashSeed } from '../game/rng.js'

export default function CharacterSelect({ onStart, onBack }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [profileId, setProfileId] = useState('fresher')
  const ready = name.trim().length > 0

  const start = (e) => {
    e.preventDefault()
    if (!ready) return
    onStart({ profileId, name: name.trim(), avatar, seed: hashSeed(`${name.trim()}-${Date.now()}`) })
  }

  return (
    <form className="stack" onSubmit={start}>
      <h1 className="screen-title">CREATE YOUR PLAYER</h1>

      <PixelCard title="1. WHO ARE YOU?" accent="accent">
        <label className="field-label" htmlFor="player-name">Your name</label>
        <input
          id="player-name"
          className="pinput"
          value={name}
          maxLength={14}
          autoComplete="off"
          placeholder="TYPE NAME"
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="avatar-row" role="radiogroup" aria-label="Pick an avatar">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              className={`avatar-pick${avatar === a.id ? ' avatar-pick--on' : ''}`}
              onClick={() => setAvatar(a.id)}
            >
              <Avatar id={a.id} size={5} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      </PixelCard>

      <h2 className="section-title">2. PICK YOUR STARTING LIFE</h2>
      <div className="profile-grid" role="radiogroup" aria-label="Starting profile">
        {PROFILES.map((p) => {
          const emi = (p.emis ?? []).reduce((t, e) => t + e.amount, 0)
          const left = p.monthlyIncome - p.monthlyExpenses - emi
          return (
            <PixelCard key={p.id} selected={profileId === p.id} onSelect={() => setProfileId(p.id)}>
              <div className="profile__emoji" aria-hidden>{p.emoji}</div>
              <h3 className="profile__title">{p.title}</h3>
              <p className="profile__blurb">{p.blurb}</p>
              <dl className="kv">
                <dt>Take-home pay</dt><dd className="green">{formatINR(p.monthlyIncome)}/mo</dd>
                <dt>Living costs</dt><dd className="red">{formatINR(p.monthlyExpenses)}/mo</dd>
                {emi > 0 && (<><dt><Term k="EMI" /> (car loan)</dt><dd className="red">{formatINR(emi)}/mo</dd></>)}
                <dt>Savings</dt><dd className="yellow">{formatINR(p.cash)}</dd>
                {p.dependents > 0 && (<><dt>Dependents</dt><dd>{p.dependents} parent</dd></>)}
                <dt>Left each month</dt><dd className="cyan">{formatINR(left)}</dd>
              </dl>
              <p className="profile__warn">No health or term insurance yet.</p>
            </PixelCard>
          )
        })}
      </div>

      <div className="row actions">
        <PixelButton variant="ghost" onClick={onBack}>◀ Back</PixelButton>
        <PixelButton type="submit" variant="green" size="lg" disabled={!ready}>
          Start life ▶
        </PixelButton>
      </div>
      {!ready && <p className="dim center">Type a name to begin.</p>}
    </form>
  )
}
