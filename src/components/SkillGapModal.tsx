'use client'
import { useState } from 'react'

interface Props {
  matching: string[]
  missing: string[]
  accent: string
  onConfirm: (confirmedSkills: string[]) => void
  onSkip: () => void
  onCareerScan?: () => void
}

export default function SkillGapModal({ matching, missing, accent, onConfirm, onSkip, onCareerScan }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (skill: string) =>
    setChecked(prev => { const n = new Set(prev); n.has(skill) ? n.delete(skill) : n.add(skill); return n })

  // Detect a fundamentally different career direction
  const isDifferentDirection = missing.length >= 6 && matching.length <= 2

  if (isDifferentDirection) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0e1a28', border: '1px solid rgba(255,100,80,0.25)', borderRadius: 18, padding: '32px 28px 28px', maxWidth: 460, width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>

          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,100,80,0.12)', border: '1px solid rgba(255,100,80,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 18 }}>
            🧭
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: 8, lineHeight: 1.4 }}>
            This looks like a completely different profile direction
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 20 }}>
            Your CV matches only <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{matching.length} of {matching.length + missing.length} key skills</strong> in this job description. Building a CV for a very different role rarely produces useful results.
          </div>

          <div style={{ padding: '13px 15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,200,50,0.7)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 8 }}>Missing from your CV</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {missing.map(s => (
                <span key={s} style={{ padding: '3px 9px', borderRadius: 20, background: 'rgba(255,100,80,0.08)', border: '1px solid rgba(255,100,80,0.2)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 22 }}>
            Use <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Career Scan</strong> to get a clear picture of which roles your profile is best suited for before tailoring your CV.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {onCareerScan && (
              <button onClick={onCareerScan} style={{ width: '100%', padding: '12px 0', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}CC)`, color: '#042C53', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Open Career Scan →
              </button>
            )}
            <button onClick={onSkip} style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Generate anyway
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0e1a28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '28px 28px 24px', maxWidth: 500, width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
          Skill check before generating
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 22, lineHeight: 1.6 }}>
          We compared your CV against the job description.
        </div>

        {matching.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 10 }}>
              ✅ Already in your CV
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {matching.map(s => (
                <span key={s} style={{ padding: '4px 11px', borderRadius: 20, background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,200,50,0.9)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 10 }}>
              ❓ In the JD, not in your CV — do you have these?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
              {missing.map(s => (
                <label key={s} onClick={() => toggle(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '9px 13px', borderRadius: 9, background: checked.has(s) ? accent + '14' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked.has(s) ? accent + '55' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s' }}>
                  <div style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${checked.has(s) ? accent : 'rgba(255,255,255,0.25)'}`, background: checked.has(s) ? accent : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    {checked.has(s) && <span style={{ fontSize: 10, color: '#042C53', fontWeight: 800, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: checked.has(s) ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: checked.has(s) ? 600 : 400 }}>{s}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              Tick only skills you genuinely have — they'll be included in your CV as-is.
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 24, padding: '13px 15px', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Your CV already covers all the key skills in this job description. You're well matched.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSkip} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            Skip
          </button>
          <button onClick={() => onConfirm([...checked])} style={{ flex: 2, padding: '12px 0', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}CC)`, color: '#042C53', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
            Generate CV{checked.size > 0 ? ` (+${checked.size} skill${checked.size > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
