'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function GeoBanner() {
  const router = useRouter()
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [targetMarket, setTargetMarket] = useState<'in' | 'de' | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('joblens_country')
    if (stored) return // user already made a choice

    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }) => {
        const isIndia = country === 'IN'
        const onIndiaRoute = pathname.startsWith('/in')

        if (isIndia && !onIndiaRoute) {
          setTargetMarket('in')
          setShow(true)
        } else if (!isIndia && onIndiaRoute && country) {
          setTargetMarket('de')
          setShow(true)
        }
      })
      .catch(() => {})
  }, [pathname])

  function dismiss() {
    const current = pathname.startsWith('/in') ? 'in' : 'de'
    localStorage.setItem('joblens_country', current)
    setShow(false)
  }

  function switchMarket() {
    if (targetMarket === 'in') {
      localStorage.setItem('joblens_country', 'in')
      router.push('/in')
    } else {
      localStorage.setItem('joblens_country', 'de')
      router.push('/')
    }
    setShow(false)
  }

  if (!show || !targetMarket) return null

  const isGoingToIndia = targetMarket === 'in'

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#042C53', border: '1px solid rgba(55,138,221,0.4)',
      borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center',
      gap: 16, zIndex: 9999, boxShadow: '0 8px 32px rgba(4,44,83,0.4)',
      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 20 }}>{isGoingToIndia ? '' : ''}</span>
      <span style={{ fontSize: 13, color: '#c8d8e8' }}>
        {isGoingToIndia
          ? 'Visiting from India? Job-Lens India has ATS tools built for you.'
          : 'Looking for jobs in Germany / DACH?'}
      </span>
      <button onClick={switchMarket} style={{
        padding: '6px 14px', borderRadius: 8,
        background: isGoingToIndia ? '#ff9933' : '#378ADD',
        color: '#fff', border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 700,
      }}>
        {isGoingToIndia ? 'Switch to India' : 'Switch to Germany'}
      </button>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: '0 4px',
      }}>x</button>
    </div>
  )
}
