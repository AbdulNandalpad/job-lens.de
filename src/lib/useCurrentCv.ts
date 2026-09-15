'use client'

import { useCallback, useEffect, useState } from 'react'
import { API, LS, SS } from '@/lib/constants'
import { useSavedCv } from '@/lib/useSavedCv'
import { readJsonOrError } from '@/lib/apiError'

export type CvSource = 'session' | 'saved' | 'none'

export interface SetCvOptions {
  /** POST to /api/user/cv with consent — only when the user ticked the box. */
  saveToAccount?: boolean
}

/**
 * The ONE place pages get the user's current CV from.
 *   precedence: this session's CV (SS.cvText) → the CV saved on the account → none
 * Writing goes through setCv() so every page sees the same text and file name, and the
 * account copy is only ever written with explicit consent (GDPR — see datenschutz §4a).
 */
export function useCurrentCv() {
  const savedCv = useSavedCv()
  const [cvText, setCvTextState] = useState('')
  const [fileName, setFileName] = useState('')
  const [source, setSource] = useState<CvSource>('none')
  const [hydrated, setHydrated] = useState(false)
  const [rememberedConsent, setRememberedConsent] = useState(false)

  useEffect(() => {
    try {
      const text = sessionStorage.getItem(SS.cvText) || ''
      const name = sessionStorage.getItem(SS.sjsCvName) || ''
      if (text.trim()) { setCvTextState(text); setFileName(name); setSource('session') }
      setRememberedConsent(localStorage.getItem(LS.cvConsent) === '1')
    } catch {
      // storage unavailable (private mode) — page still works without a CV
    }
    setHydrated(true)
  }, [])

  // Adopt the account CV when the session has none — and mirror it into the session so
  // legacy pages that still read SS.cvText directly see the same CV.
  useEffect(() => {
    if (!hydrated || savedCv.loadingSavedCv || source !== 'none') return
    if (savedCv.hasCv && savedCv.cvText) {
      setCvTextState(savedCv.cvText)
      setFileName(savedCv.fileName || '')
      setSource('saved')
      try {
        sessionStorage.setItem(SS.cvText, savedCv.cvText)
        if (savedCv.fileName) sessionStorage.setItem(SS.sjsCvName, savedCv.fileName)
      } catch {}
    }
  }, [hydrated, savedCv.loadingSavedCv, savedCv.hasCv, savedCv.cvText, savedCv.fileName, source])

  const setCv = useCallback(async (text: string, name = '', opts: SetCvOptions = {}): Promise<{ saved: boolean; error?: string }> => {
    const trimmed = text.trim()
    setCvTextState(trimmed)
    setFileName(name)
    setSource('session')
    try {
      sessionStorage.setItem(SS.cvText, trimmed)
      sessionStorage.setItem(SS.sjsCvName, name)
    } catch {}
    if (!opts.saveToAccount) return { saved: false }

    try { localStorage.setItem(LS.cvConsent, '1') } catch {}
    setRememberedConsent(true)
    try {
      const res = await fetch(API.userCv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, fileName: name || null, consent: true }),
      })
      const out = await readJsonOrError(res)
      if (!out.ok) return { saved: false, error: out.message }
      await savedCv.refetchSavedCv()
      return { saved: true }
    } catch {
      return { saved: false, error: 'Could not save your CV — check your connection and try again.' }
    }
  }, [savedCv])

  const clearCv = useCallback(() => {
    setCvTextState('')
    setFileName('')
    setSource('none')
    try {
      sessionStorage.removeItem(SS.cvText)
      sessionStorage.removeItem(SS.sjsCvName)
    } catch {}
  }, [])

  /** Read a CV file into text: .txt inline, everything else via the extractor route. */
  const extractFile = useCallback(async (file: File): Promise<{ text: string } | { error: string }> => {
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.txt') || file.type === 'text/plain') {
      const text = (await file.text()).trim()
      return text.length >= 50 ? { text } : { error: 'That file has almost no text in it.' }
    }
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(API.extractPdf, { method: 'POST', body: form })
      const out = await readJsonOrError<{ text?: string }>(res)
      if (!out.ok) return { error: out.message }
      const text = (out.data.text || '').trim()
      return text ? { text } : { error: 'Could not read that file — try a PDF, DOCX or TXT.' }
    } catch {
      return { error: 'Network error while reading the file — please try again.' }
    }
  }, [])

  return {
    cvText,
    fileName,
    source,
    loading: !hydrated || savedCv.loadingSavedCv,
    savedCv,
    rememberedConsent,
    setCv,
    clearCv,
    extractFile,
  }
}
