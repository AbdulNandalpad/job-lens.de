// Small shared outline SVG icons — used instead of emoji glyphs, which render
// inconsistently across OS/browsers and shouldn't stand in for UI icons.

export function MicIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

export function KeyboardIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="6" y2="10.01" />
      <line x1="10" y1="10" x2="10" y2="10.01" />
      <line x1="14" y1="10" x2="14" y2="10.01" />
      <line x1="18" y1="10" x2="18" y2="10.01" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </svg>
  )
}
