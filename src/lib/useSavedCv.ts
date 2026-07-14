'use client'

import { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/constants'

interface SavedCv {
  hasCv: boolean
  cvText: string | null
  fileName: string | null
  updatedAt: string | null
}

/**
 * Reads the user's persistent CV (saved once in Account settings or on
 * first upload) so pages can offer "use my saved CV" instead of asking
 * for a fresh upload every time. Read-only — see saveCv()/deleteCv() in
 * src/app/app/account/page.tsx for the write side, which requires
 * explicit consent per GDPR (see datenschutz page).
 */
export function useSavedCv() {
  const [saved, setSaved] = useState<SavedCv>({ hasCv: false, cvText: null, fileName: null, updatedAt: null })
  const [loadingSavedCv, setLoadingSavedCv] = useState(true)

  const refetchSavedCv = useCallback(async () => {
    try {
      const res = await fetch(API.userCv)
      if (!res.ok) return
      const data = await res.json()
      setSaved({
        hasCv: !!data.hasCv,
        cvText: data.cvText ?? null,
        fileName: data.fileName ?? null,
        updatedAt: data.updatedAt ?? null,
      })
    } catch {
      // silent — best-effort convenience feature, never blocks the page
    } finally {
      setLoadingSavedCv(false)
    }
  }, [])

  useEffect(() => { refetchSavedCv() }, [refetchSavedCv])

  return { ...saved, loadingSavedCv, refetchSavedCv }
}
