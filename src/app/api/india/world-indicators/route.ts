import { NextResponse } from 'next/server'

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h — World Bank updates annually

export interface WorldIndicator {
  label: string
  value: number | null
  unit: string
  year: number | null
  trend: 'up' | 'down' | 'flat'
  icon: string
}

let cache: { data: WorldIndicator[]; ts: number } | null = null

async function fetchIndicator(code: string): Promise<{ value: number | null; year: number | null; prev: number | null }> {
  try {
    const url = `https://api.worldbank.org/v2/country/IN/indicator/${code}?format=json&mrv=2&per_page=2`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return { value: null, year: null, prev: null }
    const json = await res.json()
    const entries = (json[1] || []).filter((e: any) => e.value !== null)
    const latest = entries[0]
    const prior  = entries[1]
    return {
      value: latest?.value ?? null,
      year:  latest?.date  ? parseInt(latest.date) : null,
      prev:  prior?.value  ?? null,
    }
  } catch {
    return { value: null, year: null, prev: null }
  }
}

function trend(current: number | null, prev: number | null): 'up' | 'down' | 'flat' {
  if (current === null || prev === null) return 'flat'
  if (current > prev + 0.1) return 'up'
  if (current < prev - 0.1) return 'down'
  return 'flat'
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const [unem, gdp, youth, lfp] = await Promise.all([
    fetchIndicator('SL.UEM.TOTL.ZS'),   // Total unemployment %
    fetchIndicator('NY.GDP.MKTP.KD.ZG'), // GDP growth %
    fetchIndicator('SL.UEM.1524.ZS'),    // Youth unemployment %
    fetchIndicator('SL.TLF.CACT.ZS'),    // Labour force participation %
  ])

  const data: WorldIndicator[] = [
    { label: 'Unemployment Rate', value: unem.value  !== null ? parseFloat(unem.value.toFixed(1))  : null, unit: '%', year: unem.year,  trend: trend(unem.value,  unem.prev),  icon: '👷' },
    { label: 'GDP Growth',        value: gdp.value   !== null ? parseFloat(gdp.value.toFixed(1))   : null, unit: '%', year: gdp.year,   trend: trend(gdp.value,   gdp.prev),   icon: '📈' },
    { label: 'Youth Unemployment',value: youth.value !== null ? parseFloat(youth.value.toFixed(1)) : null, unit: '%', year: youth.year, trend: trend(youth.value, youth.prev), icon: '🎓' },
    { label: 'Labour Force',      value: lfp.value   !== null ? parseFloat(lfp.value.toFixed(1))   : null, unit: '%', year: lfp.year,   trend: trend(lfp.value,   lfp.prev),   icon: '🏭' },
  ]

  cache = { data, ts: Date.now() }
  return NextResponse.json(data)
}
