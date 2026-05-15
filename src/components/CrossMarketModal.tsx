'use client'

interface CrossMarketModalProps {
  cost: number
  market: 'eu' | 'in'
  crossAmount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function CrossMarketModal({ cost, market, crossAmount, onConfirm, onCancel }: CrossMarketModalProps) {
  const isEU = market === 'eu'
  // If the user is on the EU site and needs to dip into India credits (and vice versa)
  const nativeLabel = isEU ? 'DACH' : 'India'
  const crossLabel = isEU ? 'India' : 'DACH'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#0d2137',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '28px 28px 24px',
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Icon */}
        <div style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>⚠️</div>

        {/* Title */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 12,
          textAlign: 'center',
        }}>
          You&apos;re using {crossLabel} credits
        </div>

        {/* Body */}
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          You don&apos;t have enough {nativeLabel} credits for this action ({cost} credit{cost !== 1 ? 's' : ''}).
          This will use <strong style={{ color: '#fff' }}>{crossAmount} of your {crossLabel} credit{crossAmount !== 1 ? 's' : ''}</strong> to complete it.
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 9,
              border: 'none',
              background: 'linear-gradient(135deg, #00C9A7, #0a8f72)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
