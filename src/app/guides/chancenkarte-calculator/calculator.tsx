'use client'

// Interactive Chancenkarte points calculator — pure client-side, no API calls.
// Scoring logic lives in src/lib/chancenkartePoints.ts (verified 2026 rules).

import { useState } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'
import { scoreChancenkarte, POINTS_NEEDED, type ChancenkarteAnswers } from '@/lib/chancenkartePoints'

const { colors: c, gradients: g } = theme

interface Option<K extends string> { value: K; label: string }

function PillQuestion<K extends string>({ n, title, help, options, value, onChange }: {
  n: number
  title: string
  help?: string
  options: Option<K>[]
  value: K
  onChange: (v: K) => void
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${c.borderLight}`, borderRadius: 14, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: help ? 4 : 12 }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800, color: c.accent, flexShrink: 0 }}>{n}</span>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: c.text }}>{title}</span>
      </div>
      {help && <div style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.55, marginBottom: 12, paddingLeft: 22 }}>{help}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 22 }}>
        {options.map(o => {
          const active = o.value === value
          return (
            <button key={o.value} onClick={() => onChange(o.value)} className="ck-pill"
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: active ? 700 : 500,
                border: `1.5px solid ${active ? c.accent : c.borderLight}`,
                background: active ? `${c.accent}12` : '#fff',
                color: active ? c.accent : c.textMuted,
                transition: 'all .15s',
              }}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const YES_NO: Option<'yes' | 'no'>[] = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]

export default function Calculator() {
  const [a, setA] = useState<ChancenkarteAnswers>({
    qualification: 'degree',
    germanLevel: 'none',
    englishLevel: 'b2',
    partialEquivalence: false,
    shortageOccupation: false,
    experience: 'two_in_five',
    age: 'under35',
    priorStay: false,
    partnerEligible: false,
  })
  const set = <K extends keyof ChancenkarteAnswers>(k: K, v: ChancenkarteAnswers[K]) => setA(prev => ({ ...prev, [k]: v }))

  const r = scoreChancenkarte(a)

  // Improvement hints for near-misses — the two biggest available gains
  const hints: string[] = []
  if (!r.option1 && r.verdict !== 'eligible') {
    if (!a.partialEquivalence) hints.push('Partial recognition of your qualification alone is worth 4 points — start the recognition procedure.')
    if (a.germanLevel !== 'b2plus') hints.push('Improving your German adds up to 3 points (A2 = 1, B1 = 2, B2+ = 3).')
    if (a.experience !== 'five_in_seven') hints.push('5+ years of professional experience in the last 7 is worth 3 points.')
  }

  const verdictStyles: Record<string, { bg: string; border: string; color: string }> = {
    option1:          { bg: `${c.success}10`, border: `${c.success}50`, color: c.success },
    eligible:         { bg: `${c.success}10`, border: `${c.success}50`, color: c.success },
    points_short:     { bg: `${c.warning}10`, border: `${c.warning}50`, color: c.warning },
    baseline_missing: { bg: `${c.danger}08`,  border: `${c.danger}40`,  color: c.danger },
  }
  const vs = verdictStyles[r.verdict]

  return (
    <div>
      <style>{`.ck-pill:hover { border-color: ${c.accent} !important; }`}</style>

      <PillQuestion n={1} title="What is your highest qualification?"
        help="For the points route it must be state-recognised in the country where you earned it — a university degree, or vocational training that took at least 2 years. If Germany has already FULLY recognised it, you skip the points system entirely (Option 1)."
        value={a.qualification} onChange={v => set('qualification', v)}
        options={[
          { value: 'degree', label: 'University degree' },
          { value: 'vocational', label: 'Vocational training (2+ years)' },
          { value: 'recognised', label: 'Already fully recognised in Germany' },
          { value: 'none', label: 'Neither' },
        ]} />

      <PillQuestion n={2} title="Your German level?"
        help="A1 is the minimum entry requirement (or English B2 instead). A2 and above also earn points."
        value={a.germanLevel} onChange={v => set('germanLevel', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'a1', label: 'A1' },
          { value: 'a2', label: 'A2 (+1)' },
          { value: 'b1', label: 'B1 (+2)' },
          { value: 'b2plus', label: 'B2 or higher (+3)' },
        ]} />

      <PillQuestion n={3} title="Your English level?"
        help="English B2 satisfies the language entry requirement if you have no German. C1 or native level earns a bonus point."
        value={a.englishLevel} onChange={v => set('englishLevel', v)}
        options={[
          { value: 'below_b2', label: 'Below B2' },
          { value: 'b2', label: 'B2' },
          { value: 'c1plus', label: 'C1 or native (+1)' },
        ]} />

      <PillQuestion n={4} title="Has Germany PARTIALLY recognised your qualification?"
        help="A notice of partial equivalence (or a required adaptation measure) from the German recognition procedure — worth the single biggest points award."
        value={a.partialEquivalence ? 'yes' : 'no'} onChange={v => set('partialEquivalence', v === 'yes')}
        options={YES_NO} />

      <PillQuestion n={5} title="Is your profession a German shortage occupation?"
        help="Includes many roles in IT, engineering, healthcare, nursing, construction trades and education."
        value={a.shortageOccupation ? 'yes' : 'no'} onChange={v => set('shortageOccupation', v === 'yes')}
        options={YES_NO} />

      <PillQuestion n={6} title="Professional experience in your field?"
        help="Counted after your qualification, in the field your qualification relates to."
        value={a.experience} onChange={v => set('experience', v)}
        options={[
          { value: 'none', label: 'Less than 2 years' },
          { value: 'two_in_five', label: '2+ of the last 5 years (+2)' },
          { value: 'five_in_seven', label: '5+ of the last 7 years (+3)' },
        ]} />

      <PillQuestion n={7} title="How old are you?"
        value={a.age} onChange={v => set('age', v)}
        options={[
          { value: 'under35', label: 'Under 35 (+2)' },
          { value: 'from35to40', label: '35–40 (+1)' },
          { value: 'over40', label: 'Over 40' },
        ]} />

      <PillQuestion n={8} title="Have you legally stayed in Germany for 6+ continuous months in the last 5 years?"
        help="Study, work or language stays count; tourist visits do not."
        value={a.priorStay ? 'yes' : 'no'} onChange={v => set('priorStay', v === 'yes')}
        options={YES_NO} />

      <PillQuestion n={9} title="Is your spouse or partner also eligible for the Opportunity Card?"
        value={a.partnerEligible ? 'yes' : 'no'} onChange={v => set('partnerEligible', v === 'yes')}
        options={YES_NO} />

      {/* Result */}
      <div style={{ background: vs.bg, border: `1.5px solid ${vs.border}`, borderRadius: 16, padding: '22px 24px', marginTop: 20 }}>
        {r.option1 ? (
          <>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: vs.color, marginBottom: 6 }}>
              You likely don&apos;t need the points system
            </div>
            <div style={{ fontSize: 14, color: c.text, lineHeight: 1.65 }}>
              With a qualification that is fully recognised in Germany, you qualify for the Opportunity Card via <strong>Option 1</strong> — no points, and formally no language certificate required. You still need proof of funds (blocked account of at least €1,091 net/month in 2026, or a declaration of commitment).
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 40, fontWeight: 800, color: vs.color }}>{r.points}</span>
              <span style={{ fontSize: 15, color: c.textMuted }}>/ {POINTS_NEEDED} points needed</span>
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: vs.color, marginBottom: 10 }}>
              {r.verdict === 'eligible' && 'You likely meet the points requirement'}
              {r.verdict === 'points_short' && `${POINTS_NEEDED - r.points} more point${POINTS_NEEDED - r.points === 1 ? '' : 's'} needed`}
              {r.verdict === 'baseline_missing' && 'Points don’t count yet — entry requirement missing'}
            </div>

            {r.verdict === 'baseline_missing' && (
              <div style={{ fontSize: 13.5, color: c.text, lineHeight: 1.65, marginBottom: 10 }}>
                {!r.baselineQualification && <div>• You need a university degree or state-recognised vocational training of at least 2 years.</div>}
                {!r.baselineLanguage && <div>• You need at least German A1 <em>or</em> English B2 — points can’t substitute for this.</div>}
              </div>
            )}

            {r.lines.length > 0 && (
              <div style={{ borderTop: `1px solid ${c.borderLight}`, paddingTop: 10, marginBottom: hints.length ? 10 : 0 }}>
                {r.lines.map(l => (
                  <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: c.text, padding: '3px 0' }}>
                    <span>{l.label}</span>
                    <span style={{ fontWeight: 700, color: c.accent, flexShrink: 0 }}>+{l.points}</span>
                  </div>
                ))}
              </div>
            )}

            {hints.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginTop: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Fastest ways to gain points</div>
                {hints.slice(0, 2).map(h => (
                  <div key={h} style={{ fontSize: 13, color: c.text, lineHeight: 1.6, padding: '2px 0' }}>→ {h}</div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/go/visa" className="gd-cta"
            style={{ display: 'inline-block', background: g.button, color: '#fff', padding: '11px 22px', borderRadius: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: 'none', transition: 'transform .15s' }}>
            Get my full AI eligibility report →
          </Link>
          <Link href="/guides/chancenkarte-opportunity-card" className="gd-cta"
            style={{ display: 'inline-block', background: '#fff', border: `1px solid ${c.borderLight}`, color: c.text, padding: '11px 22px', borderRadius: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'transform .15s' }}>
            Read the full Chancenkarte guide
          </Link>
        </div>
      </div>

      <div style={{ fontSize: 12, color: c.textFaint, lineHeight: 1.6, marginTop: 14 }}>
        This calculator is an unofficial self-check based on the official criteria (verified 28 July 2026 against make-it-in-germany.com). The final decision always rests with the German mission handling your application. Proof of funds is required on every route.
      </div>
    </div>
  )
}
