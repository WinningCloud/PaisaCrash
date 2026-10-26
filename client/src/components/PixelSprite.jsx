// Renders pixel art from an array of strings: each char is a palette key,
// '.' is transparent. Horizontal runs merge into one rect to keep the SVG small.
export function mirrorRows(halves) {
  return halves.map((h) => h + [...h].reverse().join(''))
}

export default function PixelSprite({ rows, palette, overlay = [], size = 4, className, title }) {
  const grid = rows.map((r) => [...r])
  for (const [y, x, ch] of overlay) if (grid[y]) grid[y][x] = ch
  const w = Math.max(...grid.map((r) => r.length))
  const rects = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let len = 1
      while (row[x + len] === ch) len++
      if (ch !== '.' && palette[ch]) {
        rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={len} height={1} fill={palette[ch]} />)
      }
      x += len
    }
  })
  return (
    <svg
      className={className}
      width={w * size}
      height={grid.length * size}
      viewBox={`0 0 ${w} ${grid.length}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  )
}
