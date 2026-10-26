const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const safe = (n) => (Number.isFinite(n) ? n : 0)

// ₹1,23,456
export const formatINR = (n) => inr.format(Math.round(safe(n)))

// ₹1.2L, ₹3.4Cr — for tight spots like the HUD
export const formatINRShort = (n) => {
  const v = Math.round(safe(n))
  return Math.abs(v) < 100000 ? inr.format(v) : inrCompact.format(v)
}

// +₹5,000 / -₹5,000
export const formatDelta = (n) => {
  const v = Math.round(safe(n))
  return (v > 0 ? '+' : v < 0 ? '-' : '') + inr.format(Math.abs(v))
}

export const formatMonths = (m) => {
  const v = safe(m)
  return v >= 10 ? `${Math.round(v)} months` : `${v.toFixed(1)} months`
}

// 5 -> "five", for copy that should read like a sentence
export const numberWord = (n) =>
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n)

export const numberWordCap = (n) => {
  const w = numberWord(n)
  return w[0].toUpperCase() + w.slice(1)
}
