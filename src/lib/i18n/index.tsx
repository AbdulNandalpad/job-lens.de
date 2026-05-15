'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Translations } from './translations'

export type Lang = 'DE' | 'EN'

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const Ctx = createContext<LangCtx>({
  lang: 'DE',
  setLang: () => {},
  t: translations.DE,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('DE')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jl_lang') as Lang | null
      if (saved === 'EN' || saved === 'DE') setLangState(saved)
    } catch {}
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    try {
      localStorage.setItem('jl_lang', l)
    } catch {}
  }

  return (
    <Ctx.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLanguage() {
  return useContext(Ctx)
}

export function DEFlag({ size = 20 }: { size?: number }) {
  const w = size * 1.5, h = size, bh = h / 3
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ borderRadius: 2, flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={bh} fill="#000000" />
      <rect x={0} y={bh} width={w} height={bh} fill="#DD0000" />
      <rect x={0} y={bh * 2} width={w} height={bh} fill="#FFCE00" />
    </svg>
  )
}

export function GBFlag({ size = 20 }: { size?: number }) {
  const w = size * 1.5, h = size
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ borderRadius: 2, flexShrink: 0 }}>
      <rect width={w} height={h} fill="#012169" />
      <line x1={0} y1={0} x2={w} y2={h} stroke="#fff" strokeWidth={h * 0.2} />
      <line x1={w} y1={0} x2={0} y2={h} stroke="#fff" strokeWidth={h * 0.2} />
      <line x1={0} y1={0} x2={w} y2={h} stroke="#C8102E" strokeWidth={h * 0.12} />
      <line x1={w} y1={0} x2={0} y2={h} stroke="#C8102E" strokeWidth={h * 0.12} />
      <rect x={0} y={h * 0.38} width={w} height={h * 0.24} fill="#fff" />
      <rect x={w * 0.38} y={0} width={w * 0.24} height={h} fill="#fff" />
      <rect x={0} y={h * 0.41} width={w} height={h * 0.18} fill="#C8102E" />
      <rect x={w * 0.41} y={0} width={w * 0.18} height={h} fill="#C8102E" />
    </svg>
  )
}
