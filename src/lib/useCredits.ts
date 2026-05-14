'use client'

import { useState, useEffect, useCallback } from 'react'

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(true)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (!res.ok) return
      const data = await res.json()
      if (typeof data.credits === 'number') setCredits(data.credits)
    } catch {
      // silent — credits UI is best-effort
    } finally {
      setLoadingCredits(false)
    }
  }, [])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  return { credits, loadingCredits, refetchCredits: fetchCredits, setCredits }
}
