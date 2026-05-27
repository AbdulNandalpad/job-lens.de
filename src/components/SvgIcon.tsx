'use client'
import React from 'react'

export type IconName =
  | 'lightning' | 'target' | 'search' | 'document' | 'bot' | 'chart-bar'
  | 'rocket' | 'trending-up' | 'trending-down' | 'globe' | 'news'
  | 'mic' | 'bulb' | 'coin' | 'card' | 'construction' | 'sparkle'
  | 'clipboard' | 'flame' | 'confetti' | 'briefcase' | 'graduate'
  | 'pin' | 'star' | 'email' | 'pencil' | 'passport' | 'check-circle'
  | 'building' | 'euro' | 'cash' | 'flag-de' | 'flag-in' | 'flag-ch' | 'flag-at'
  | 'worker' | 'home' | 'headphone' | 'factory' | 'hospital' | 'gear'
  | 'megaphone' | 'people' | 'lab' | 'truck' | 'hotel' | 'laptop'
  | 'wave' | 'apply' | 'kanban' | 'salary' | 'warning' | 'flag' | 'camera'

interface SvgIconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  style?: React.CSSProperties
  className?: string
}

// Flag components rendered as small SVGs (20×14 viewport)
function FlagDE({ size = 20 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" style={{ display: 'inline-block', flexShrink: 0, borderRadius: 2 }}>
      <rect width="20" height="4.67" y="0"    fill="#000"/>
      <rect width="20" height="4.67" y="4.67" fill="#DD0000"/>
      <rect width="20" height="4.66" y="9.34" fill="#FFCE00"/>
    </svg>
  )
}
function FlagIN({ size = 20 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" style={{ display: 'inline-block', flexShrink: 0, borderRadius: 2 }}>
      <rect width="20" height="4.67" y="0"    fill="#FF9933"/>
      <rect width="20" height="4.67" y="4.67" fill="#fff"/>
      <rect width="20" height="4.66" y="9.34" fill="#138808"/>
      <circle cx="10" cy="7" r="1.6" fill="none" stroke="#000080" strokeWidth="0.5"/>
      <line x1="10" y1="5.4" x2="10" y2="8.6" stroke="#000080" strokeWidth="0.35"/>
      <line x1="8.4" y1="7" x2="11.6" y2="7"  stroke="#000080" strokeWidth="0.35"/>
    </svg>
  )
}
function FlagCH({ size = 20 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" style={{ display: 'inline-block', flexShrink: 0, borderRadius: 2 }}>
      <rect width="20" height="14" fill="#FF0000"/>
      <rect x="8.5" y="3" width="3" height="8" fill="#fff"/>
      <rect x="5.5" y="5.5" width="9" height="3" fill="#fff"/>
    </svg>
  )
}
function FlagAT({ size = 20 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" style={{ display: 'inline-block', flexShrink: 0, borderRadius: 2 }}>
      <rect width="20" height="4.67" y="0"    fill="#ED2939"/>
      <rect width="20" height="4.67" y="4.67" fill="#fff"/>
      <rect width="20" height="4.66" y="9.34" fill="#ED2939"/>
    </svg>
  )
}

const ICON_PATHS: Record<Exclude<IconName, 'flag-de' | 'flag-in' | 'flag-ch' | 'flag-at'>, React.ReactNode> = {
  lightning: (
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinejoin="round" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  bot: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M12 2v4" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" />
      <path d="M9 20h6" />
    </>
  ),
  'chart-bar': (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  'trending-up': (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  'trending-down': (
    <>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  news: (
    <>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6z" />
    </>
  ),
  mic: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </>
  ),
  bulb: (
    <>
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </>
  ),
  coin: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  salary: (
    <>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 8v1m0 6v1" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </>
  ),
  construction: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 3l.6 1.9L7.5 6l-1.9.6L5 8.5l-.6-1.9L2.5 6l1.9-.6L5 3z" />
      <path d="M19 15l.6 1.9 1.9.6-1.9.6L19 20l-.6-1.9-1.9-.6 1.9-.6L19 15z" />
    </>
  ),
  clipboard: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  confetti: (
    <>
      <path d="M5.8 11.3L2 22l10.7-3.8" />
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z" />
      <path d="M16 8l1-1" />
      <path d="M19 4l1-1" />
      <path d="M19 8l1 1" />
      <path d="M22 5l1 1" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  graduate: (
    <>
      <polyline points="22 10 12 5 2 10 12 15 22 10" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
      <line x1="12" y1="15" x2="12" y2="22" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  email: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  pencil: (
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  ),
  passport: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 21v-2a5 5 0 0 1 10 0v2" />
    </>
  ),
  'check-circle': (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </>
  ),
  euro: (
    <>
      <path d="M4 10h12" />
      <path d="M4 14h9" />
      <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
    </>
  ),
  cash: (
    <>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M12 8v8m-3-4h6" />
    </>
  ),
  worker: (
    <>
      <path d="M12 1a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5z" />
      <path d="M3 21v-2a9 9 0 0 1 18 0v2" />
      <path d="M9 7h6" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  headphone: (
    <>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </>
  ),
  factory: (
    <>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </>
  ),
  hospital: (
    <>
      <path d="M12 6v4m-2-2h4" />
      <path d="M3 3h18v18H3z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </>
  ),
  people: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  lab: (
    <>
      <path d="M10 2v7.31L5.72 15.45A2 2 0 0 0 7.28 18h9.44a2 2 0 0 0 1.56-3.55L14 9.31V2" />
      <line x1="8.5" y1="2" x2="15.5" y2="2" />
    </>
  ),
  truck: (
    <>
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  hotel: (
    <>
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 4v6" />
      <path d="M2 20h20" />
    </>
  ),
  laptop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  wave: (
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
  ),
  apply: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
    </>
  ),
  kanban: (
    <>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="11" rx="1" />
      <rect x="17" y="3" width="4" height="14" rx="1" />
    </>
  ),
  warning: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
}

export default function SvgIcon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style, className }: SvgIconProps) {
  if (name === 'flag-de') return <FlagDE size={size} />
  if (name === 'flag-in') return <FlagIN size={size} />
  if (name === 'flag-ch') return <FlagCH size={size} />
  if (name === 'flag-at') return <FlagAT size={size} />

  const paths = ICON_PATHS[name as Exclude<IconName, 'flag-de' | 'flag-in' | 'flag-ch' | 'flag-at'>]
  if (!paths) return null

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      className={className}
    >
      {paths}
    </svg>
  )
}

/** Render an icon by string key — useful when icon name is stored in a data array */
export function getIcon(name: string, size = 16, color = 'currentColor'): React.ReactNode {
  return <SvgIcon name={name as IconName} size={size} color={color} />
}
