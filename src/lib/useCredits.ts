'use client'

import { useState, useEffect, useCallback } from 'react'

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null)       // total
  const [euCredits, setEuCredits] = useState(0)
  const [inCredits, setInCredits] = useState(0)
  const [commonCredits, setCommonCredits] = useState(0)
  const [loadingCredits, setLoadingCredits] = useState(true)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (!res.ok) return
      const data = await res.json()
      if (typeof data.credits === 'number') setCredits(data.credits)
      if (typeof data.euCredits === 'number') setEuCredits(data.euCredits)
      if (typeof data.inCredits === 'number') setInCredits(data.inCredits)
      if (typeof data.commonCredits === 'number') setCommonCredits(data.commonCredits)
    } catch {
      // silent — credits UI is best-effort
    } finally {
      setLoadingCredits(false)
    }
  }, [])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  function needsCrossMarket(cost: number, market: 'eu' | 'in'): boolean {
    const native = commonCredits + (market === 'eu' ? euCredits : inCredits)
    return (credits !== null) && native < cost && (credits ?? 0) >= cost
  }

  function crossMarketAmount(cost: number, market: 'eu' | 'in'): number {
    const native = commonCredits + (market === 'eu' ? euCredits : inCredits)
    return Math.max(0, cost - native)
  }

  return { credits, euCredits, inCredits, commonCredits, loadingCredits, refetchCredits: fetchCredits, setCredits, needsCrossMarket, crossMarketAmount }
}
