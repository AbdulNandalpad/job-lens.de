'use client'

import Link from 'next/link'
import { c, f } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'

interface FlowErrorProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  /** Optional secondary action, e.g. "Top up credits" → account page on a 402. */
  secondary?: { label: string; href: string }
  compact?: boolean
}

/**
 * The one inline error surface for user-facing failures. Shows the server's own
 * message (never a generic replacement), always leaves the user a next step, and
 * never uses window.alert.
 */
export default function FlowError({ message, onRetry, retryLabel = 'Try again', secondary, compact }: FlowErrorProps) {
  return (
    <div role="alert" style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 10,
      padding: compact ? '8px 12px' : '12px 14px', fontFamily: f.body,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><SvgIcon name="warning" size={16} color={c.error} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 12 : 13, color: c.error, lineHeight: 1.5 }}>{message}</div>
        {(onRetry || secondary) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {onRetry && (
              <button type="button" onClick={onRetry}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: c.error, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {retryLabel}
              </button>
            )}
            {secondary && (
              <Link href={secondary.href}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.errorBorder}`, background: c.bgCard, color: c.error, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit' }}>
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
