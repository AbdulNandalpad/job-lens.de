'use client'

import { useState, useEffect } from 'react'
import { LS, MARKET, type Market } from './constants'

export type WidgetDef = {
  id: string
  label: string
  icon: string
  defaultOn: boolean
}

export const EU_WIDGETS: WidgetDef[] = [
  { id: 'quick_actions',  label: 'Quick Actions',      icon: 'lightning',    defaultOn: false },
  { id: 'career_intel',   label: 'Career Intelligence', icon: 'target',       defaultOn: false },
  { id: 'kpi',            label: 'Market Snapshot',     icon: 'chart-bar',    defaultOn: false },
  { id: 'skills',         label: 'Skills Trends',       icon: 'rocket',       defaultOn: false },
  { id: 'sectors_salary', label: 'Sectors & Salaries',  icon: 'euro',         defaultOn: false },
  { id: 'macro',          label: 'Macro Indicators',    icon: 'trending-up',  defaultOn: false },
  { id: 'ai_impact',      label: 'AI Impact Heatmap',   icon: 'bot',          defaultOn: false },
]

export const IN_WIDGETS: WidgetDef[] = [
  { id: 'quick_actions',  label: 'Quick Actions',      icon: 'lightning',    defaultOn: false },
  { id: 'career_intel',   label: 'Career Intelligence', icon: 'target',       defaultOn: false },
  { id: 'kpi',            label: 'Market Snapshot',     icon: 'chart-bar',    defaultOn: false },
  { id: 'skills',         label: 'Skills Trends',       icon: 'rocket',       defaultOn: false },
  { id: 'sectors_salary', label: 'Sectors & Salaries',  icon: 'salary',       defaultOn: false },
  { id: 'macro',          label: 'Macro Indicators',    icon: 'globe',        defaultOn: false },
  { id: 'ai_impact',      label: 'AI Impact Heatmap',   icon: 'bot',          defaultOn: false },
  { id: 'news',           label: 'News & Signals',      icon: 'news',         defaultOn: false },
]

export function useDashWidgets(market: Market) {
  const lsKey = market === MARKET.eu ? LS.dashWidgetsEu : LS.dashWidgetsIn
  const defs  = market === MARKET.eu ? EU_WIDGETS : IN_WIDGETS

  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(defs.map(w => [w.id, w.defaultOn]))
    if (typeof window === 'undefined') return defaults
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as Record<string, boolean>
      return { ...defaults, ...saved }
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify(visible)) } catch {}
  }, [visible, lsKey])

  const isVisible    = (id: string) => visible[id] ?? true
  const toggle       = (id: string) => setVisible(v => ({ ...v, [id]: !v[id] }))
  const showAll      = () => setVisible(Object.fromEntries(defs.map(w => [w.id, true])))
  const resetDefaults = () => setVisible(Object.fromEntries(defs.map(w => [w.id, w.defaultOn])))

  return { widgets: defs, isVisible, toggle, showAll, resetDefaults }
}
