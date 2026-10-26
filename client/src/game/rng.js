// Seeded RNG (mulberry32). The state is a single uint32, so it can be saved
// inside the game state and a run can be replayed exactly from its seed.

export function createRng(seed) {
  let s = seed >>> 0

  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => (arr.length ? arr[Math.floor(next() * arr.length)] : undefined),
    // Pick one item using weights; returns undefined for an empty or all-zero list
    weighted(items, weightOf) {
      const total = items.reduce((t, it) => t + Math.max(0, weightOf(it)), 0)
      if (total <= 0) return undefined
      let roll = next() * total
      for (const it of items) {
        roll -= Math.max(0, weightOf(it))
        if (roll < 0) return it
      }
      return items[items.length - 1]
    },
    get state() {
      return s
    },
  }
}

// Turn any string into a uint32 seed (FNV-1a)
export function hashSeed(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
