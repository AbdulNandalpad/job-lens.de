// Small rounded flag SVGs — used in place of flag emoji (rendering is
// inconsistent across OS/browsers) anywhere the UI needs a Germany/India mark.

export function GermanFlag({ width = 27 }: { width?: number }) {
  const h = Math.round(width * 0.6)
  return (
    <svg width={width} height={h} viewBox="0 0 30 18" style={{ borderRadius: 3, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} aria-label="Germany">
      <rect width="30" height="6" y="0" fill="#1a1a1a" />
      <rect width="30" height="6" y="6" fill="#DD0000" />
      <rect width="30" height="6" y="12" fill="#FFCC00" />
    </svg>
  )
}

export function IndiaFlag({ width = 27 }: { width?: number }) {
  const h = Math.round(width * 0.6)
  const cx = 15, cy = 9, r = 2.4
  return (
    <svg width={width} height={h} viewBox="0 0 30 18" style={{ borderRadius: 3, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} aria-label="India">
      <rect width="30" height="6" y="0" fill="#FF9933" />
      <rect width="30" height="6" y="6" fill="#FFFFFF" />
      <rect width="30" height="6" y="12" fill="#138808" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000080" strokeWidth="0.4" />
      <circle cx={cx} cy={cy} r="0.5" fill="#000080" />
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16 * (Math.PI / 180)
        return (
          <line key={i}
            x1={cx + Math.cos(angle) * 0.5} y1={cy + Math.sin(angle) * 0.5}
            x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r}
            stroke="#000080" strokeWidth="0.25" />
        )
      })}
    </svg>
  )
}
