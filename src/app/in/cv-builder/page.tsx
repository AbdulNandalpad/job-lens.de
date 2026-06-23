'use client'

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import SkillGapModal from '@/components/SkillGapModal'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

const accent = '#FF9933'

type Template = 'clean' | 'saffron' | 'classic' | 'modern' | 'executive' | 'executive2'
type Tone = 'professional' | 'concise' | 'detailed'
type Lang = 'EN'

interface CVData {
  name: string
  title: string
  tagline: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
  stats: { label: string; value: string }[]
  skills: { name: string; level: number }[]
  experience: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
}

// ── Template 1: Clean / Saffron / Classic (single-column ATS) ─────────────
function IndiaCV({ cv, ac }: { cv: CVData; ac: string }) {
  const navy = '#0d2137'
  const secHeader = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 18 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: navy, letterSpacing: 1.5, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#d1dae6' }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', padding: '40px 48px', minHeight: 900 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: navy, letterSpacing: -0.3, lineHeight: 1.2 }}>{cv.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ac, letterSpacing: 0.5, marginTop: 3, marginBottom: 5 }}>{cv.title}</div>
        <div style={{ fontSize: 11, color: '#6b7c93' }}>{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('  |  ')}</div>
      </div>
      <div style={{ height: 1, background: '#ccd5e0', marginBottom: 4 }} />
      {cv.summary && (<div>{secHeader('Summary')}<div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div></div>)}
      {cv.skills.length > 0 && (<div>{secHeader('Skills')}<div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.7 }}>{cv.skills.map(s => s.name).join('  ·  ')}</div></div>)}
      {cv.tools.length > 0 && (<div>{secHeader('Tech Stack')}<div style={{ fontSize: 11.5, color: ac, lineHeight: 1.7 }}>{cv.tools.join('  ·  ')}</div></div>)}
      {cv.experience.length > 0 && (
        <div>{secHeader('Experience')}
          {cv.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{exp.role}</div>
                <div style={{ fontSize: 10, color: ac, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{exp.period}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7c93', fontStyle: 'italic', marginBottom: 5 }}>{[exp.company, exp.location, exp.type].filter(Boolean).join('  ·  ')}</div>
              {(exp.bullets ?? []).map((b, j) => (<div key={j} style={{ display: 'flex', gap: 7, marginBottom: 3, alignItems: 'flex-start' }}><span style={{ color: ac, fontSize: 11, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 11, color: '#374151', lineHeight: 1.65, wordBreak: 'break-word' as const }}>{b}</span></div>))}
            </div>
          ))}
        </div>
      )}
      {cv.education.length > 0 && (
        <div>{secHeader('Education')}
          {cv.education.map((e, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><div><div style={{ fontSize: 12, fontWeight: 600, color: navy }}>{e.degree}</div><div style={{ fontSize: 11, color: '#6b7c93' }}>{e.school}</div></div><div style={{ fontSize: 11, color: '#8fa3b8', flexShrink: 0, marginLeft: 8 }}>{e.year}</div></div>))}
        </div>
      )}
      {cv.certifications.length > 0 && (<div>{secHeader('Certifications')}{cv.certifications.map((c, i) => (<div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4, alignItems: 'flex-start' }}><span style={{ color: ac, fontSize: 11, flexShrink: 0 }}>•</span><span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{c}</span></div>))}</div>)}
      {cv.languages.length > 0 && (<div>{secHeader('Languages')}<div style={{ fontSize: 11.5, color: '#374151' }}>{cv.languages.map((l, i) => { const lv = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'; return <span key={i}>{l.name} <span style={{ color: '#8fa3b8' }}>({lv})</span>{i < cv.languages.length - 1 ? '  ·  ' : ''}</span> })}</div></div>)}
    </div>
  )
}

// ── Template 2: Modern (gradient header, chip skills, visual) ─────────────
function ModernCV({ cv, ac }: { cv: CVData; ac: string }) {
  const navy = '#0d2137'
  const sec = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 22 }}>
      <div style={{ width: 3, height: 14, background: ac, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: navy, letterSpacing: 1.3, textTransform: 'uppercase' as const }}>{title}</span>
    </div>
  )
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: 900 }}>
      {/* Hero header */}
      <div style={{ background: `linear-gradient(135deg, ${ac} 0%, ${ac}bb 100%)`, padding: '40px 48px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -70, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>{cv.name}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginTop: 6 }}>{cv.title}</div>
          {cv.tagline && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 5, fontStyle: 'italic' }}>{cv.tagline}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16 }}>
            {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map((c, i) => (
              <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)' }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Stats bar */}
      {cv.stats?.length > 0 && (
        <div style={{ background: navy, padding: '14px 48px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {cv.stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: ac, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {/* Body */}
      <div style={{ padding: '4px 48px 40px' }}>
        {cv.summary && (<div>{sec('Professional Summary')}<div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div></div>)}
        {cv.skills.length > 0 && (
          <div>{sec('Core Skills')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cv.skills.map((s, i) => (<span key={i} style={{ fontSize: 10.5, padding: '3px 10px', background: `${ac}12`, color: navy, border: `1px solid ${ac}30`, borderRadius: 12, fontWeight: 600 }}>{s.name}</span>))}
            </div>
          </div>
        )}
        {cv.tools.length > 0 && (
          <div>{sec('Tech Stack')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cv.tools.map((t, i) => (<span key={i} style={{ fontSize: 10, padding: '3px 9px', background: 'rgba(0,0,0,0.04)', color: '#374151', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}>{t}</span>))}
            </div>
          </div>
        )}
        {cv.experience.length > 0 && (
          <div>{sec('Experience')}
            {cv.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{exp.role}</div>
                  <div style={{ fontSize: 10, color: ac, fontWeight: 600, flexShrink: 0, marginLeft: 8, background: `${ac}15`, padding: '2px 8px', borderRadius: 10 }}>{exp.period}</div>
                </div>
                <div style={{ fontSize: 11, color: '#6b7c93', fontStyle: 'italic', marginBottom: 5 }}>{[exp.company, exp.location, exp.type].filter(Boolean).join(' · ')}</div>
                {exp.bullets.map((b, j) => (<div key={j} style={{ display: 'flex', gap: 7, marginBottom: 3, alignItems: 'flex-start' }}><span style={{ color: ac, fontSize: 11, flexShrink: 0, marginTop: 1 }}>▸</span><span style={{ fontSize: 11, color: '#374151', lineHeight: 1.65 }}>{b}</span></div>))}
              </div>
            ))}
          </div>
        )}
        {cv.education.length > 0 && (
          <div>{sec('Education')}
            {cv.education.map((e, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div><div style={{ fontSize: 12, fontWeight: 600, color: navy }}>{e.degree}</div><div style={{ fontSize: 11, color: '#6b7c93' }}>{e.school}</div></div><div style={{ fontSize: 11, color: '#8fa3b8', flexShrink: 0, marginLeft: 8 }}>{e.year}</div></div>))}
          </div>
        )}
        {cv.certifications.length > 0 && (<div>{sec('Certifications')}{cv.certifications.map((c, i) => (<div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 4 }}>• {c}</div>))}</div>)}
        {cv.languages.length > 0 && (<div>{sec('Languages')}<div style={{ fontSize: 11.5, color: '#374151' }}>{cv.languages.map((l, i) => { const lv = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'; return <span key={i}>{l.name} <span style={{ color: '#8fa3b8' }}>({lv})</span>{i < cv.languages.length - 1 ? '  ·  ' : ''}</span> })}</div></div>)}
      </div>
    </div>
  )
}

// ── Template 3: Executive (redesigned — premium sidebar, optional photo) ─────
function ExecutiveCV({ cv, ac, photo }: { cv: CVData; ac: string; photo?: string }) {
  const navy = '#0f1e32'
  const lvLabel = (l: number) => l >= 90 ? 'Native' : l >= 75 ? 'Fluent' : l >= 55 ? 'Proficient' : 'Basic'
  const initials = cv.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()

  const sideLabel = (title: string) => (
    <div style={{ fontSize: 7.5, fontWeight: 700, color: ac, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 18, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 5 }}>
      {title}
    </div>
  )
  const secR = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 22 }}>
      <div style={{ width: 3, height: 16, background: ac, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 700, color: navy, letterSpacing: 1.8, textTransform: 'uppercase' as const }}>{title}</span>
    </div>
  )
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', display: 'flex', minHeight: 900 }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 208, flexShrink: 0, background: navy, display: 'flex', flexDirection: 'column' }}>
        {/* Top accent bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${ac}, ${ac}70)`, flexShrink: 0 }} />

        <div style={{ padding: '26px 18px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Photo / initials avatar */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            {photo ? (
              <img src={photo} alt={cv.name}
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${ac}`, display: 'block', margin: '0 auto 12px' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: `linear-gradient(145deg, ${ac}25, ${ac}08)`, border: `2px solid ${ac}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 800, color: ac, letterSpacing: -1 }}>
                {initials}
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 5 }}>{cv.name}</div>
            <div style={{ fontSize: 8.5, fontWeight: 600, color: ac, letterSpacing: 1.8, textTransform: 'uppercase' as const, lineHeight: 1.5 }}>{cv.title}</div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 2 }} />

          {/* Contact */}
          {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).length > 0 && (
            <div>
              {sideLabel('Contact')}
              {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map((c, i) => (
                <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.62)', marginBottom: 6, lineHeight: 1.55, wordBreak: 'break-word' as const, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                  <span style={{ color: ac, fontSize: 7, flexShrink: 0, marginTop: 3 }}>◆</span>{c}
                </div>
              ))}
            </div>
          )}

          {/* Expertise */}
          {cv.skills.length > 0 && (
            <div>
              {sideLabel('Expertise')}
              {cv.skills.slice(0, 9).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, flexShrink: 0, opacity: Math.max(0.45, s.level / 100) }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tools */}
          {cv.tools.length > 0 && (
            <div>
              {sideLabel('Tools & Tech')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {cv.tools.slice(0, 16).map((t, i) => (
                  <span key={i} style={{ fontSize: 7.5, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.58)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.09)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {cv.languages.length > 0 && (
            <div>
              {sideLabel('Languages')}
              {cv.languages.map((l, i) => (
                <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.68)', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{l.name}</span>
                  <span style={{ fontSize: 8, color: ac, fontWeight: 600 }}>{lvLabel(l.level)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {cv.certifications.length > 0 && (
            <div>
              {sideLabel('Certifications')}
              {cv.certifications.map((c, i) => (
                <div key={i} style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.58)', marginBottom: 5, lineHeight: 1.5, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                  <span style={{ color: ac, fontSize: 8, flexShrink: 0, marginTop: 1 }}>✦</span>{c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom accent strip */}
        <div style={{ height: 3, background: `${ac}28`, flexShrink: 0 }} />
      </div>

      {/* ── Right main content ── */}
      <div style={{ flex: 1, padding: '30px 34px 40px 28px', display: 'flex', flexDirection: 'column' }}>

        {/* Key metrics */}
        {cv.stats?.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            {cv.stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 14px', background: `${ac}09`, border: `1px solid ${ac}22`, borderRadius: 8, minWidth: 58 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: ac, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Executive Profile / Summary */}
        {cv.summary && (
          <div>
            {secR('Executive Profile')}
            <div style={{ fontSize: 11.5, color: '#3d4f63', lineHeight: 1.85, borderLeft: `3px solid ${ac}28`, paddingLeft: 12 }}>
              {cv.summary}
            </div>
          </div>
        )}

        {/* Career History */}
        {cv.experience.length > 0 && (
          <div>
            {secR('Career History')}
            {cv.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: navy }}>{exp.role}</div>
                  <div style={{ fontSize: 9, color: ac, fontWeight: 600, flexShrink: 0, marginLeft: 8, background: `${ac}12`, border: `1px solid ${ac}28`, padding: '2px 8px', borderRadius: 9, whiteSpace: 'nowrap' as const }}>{exp.period}</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{exp.company}</span>
                  {exp.location ? ` · ${exp.location}` : ''}
                  {exp.type ? ` · ${exp.type}` : ''}
                </div>
                <div style={{ paddingLeft: 10, borderLeft: `2px solid ${ac}28` }}>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 7, marginBottom: 4, alignItems: 'flex-start' }}>
                      <span style={{ color: ac, fontSize: 9, flexShrink: 0, marginTop: 3 }}>▸</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.65, wordBreak: 'break-word' as const }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <div>
            {secR('Education')}
            {cv.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingBottom: 10, borderBottom: i < cv.education.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: navy }}>{e.degree}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{e.school}</div>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginLeft: 12, fontWeight: 600 }}>{e.year}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template 4: Executive V2 (DACH-style — wide sidebar, timeline, photo) ───
function ExecutiveV2CV({ cv, ac, photo }: { cv: CVData; ac: string; photo?: string }) {
  const navy = '#0d2137'
  const initials = cv.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()

  const sideSection = (title: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 10 }}>{title}</div>
  )
  const secHeader = (title: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: navy, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: 900, fontFamily: "'DM Sans', sans-serif", background: '#fff' }}>

      {/* ── Dark sidebar ── */}
      <div style={{ width: 240, background: 'linear-gradient(170deg, #0d2137 0%, #1e1208 100%)', flexShrink: 0, padding: '36px 22px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Photo / initials */}
        <div style={{ textAlign: 'center', paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {photo ? (
            <img src={photo} alt={cv.name}
              style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${ac}`, display: 'block', margin: '0 auto 14px' }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: `linear-gradient(135deg, ${ac}, ${ac}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 auto 14px', letterSpacing: 1 }}>
              {initials}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.3, marginBottom: 4 }}>{cv.name}</div>
          <div style={{ fontSize: 10, color: ac, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, lineHeight: 1.5 }}>{cv.title}</div>
        </div>

        {/* Contact */}
        <div>
          {sideSection('Contact')}
          {[
            { icon: '@',  val: cv.email    },
            { icon: 'T',  val: cv.phone    },
            { icon: 'L',  val: cv.location },
            { icon: 'in', val: cv.linkedin },
          ].filter(r => r.val).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: ac, width: 14, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, wordBreak: 'break-all' as const }}>{r.val}</span>
            </div>
          ))}
        </div>

        {/* Skills with progress bars + % */}
        {cv.skills.length > 0 && (
          <div>
            {sideSection('Skills')}
            {cv.skills.slice(0, 10).map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{s.name}</span>
                  <span style={{ fontSize: 9, color: ac, fontWeight: 700 }}>{s.level}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${s.level}%`, background: `linear-gradient(90deg, ${ac}, ${ac}88)`, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Languages — 5-dot indicators */}
        {cv.languages.length > 0 && (
          <div>
            {sideSection('Languages')}
            {cv.languages.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{l.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(d => (
                    <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: d <= Math.round(l.level / 20) ? ac : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {cv.certifications.length > 0 && (
          <div>
            {sideSection('Certifications')}
            {cv.certifications.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: ac, fontSize: 10, marginTop: 1 }}>*</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Highlights */}
        {cv.highlights?.length > 0 && (
          <div>
            {sideSection('Highlights')}
            {cv.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ color: ac, fontSize: 9, marginTop: 2 }}>›</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{h}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: '36px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #f0f4f8' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: navy, fontFamily: "'Outfit', sans-serif", letterSpacing: -0.5, marginBottom: 4 }}>{cv.name}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: ac, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>{cv.title}</div>
          {cv.tagline && <div style={{ fontSize: 11, color: '#6b7c93', letterSpacing: 0.5 }}>{cv.tagline}</div>}
        </div>

        {/* Stats strip */}
        {cv.stats?.length > 0 && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #edf1f6' }}>
            {cv.stats.map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 16px', textAlign: 'center', borderRight: i < cv.stats.length - 1 ? '1px solid #edf1f6' : 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: navy, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#8fa3b8', marginTop: 2, letterSpacing: 0.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Executive Summary */}
        {cv.summary && (
          <div style={{ marginBottom: 24 }}>
            {secHeader('Executive Summary')}
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div>
          </div>
        )}

        {/* Core Stack */}
        {cv.tools.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {secHeader('Core Stack')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cv.tools.map((t, i) => (
                <span key={i} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: '#f0f4f8', color: '#374151', border: '1px solid #e2e8f0', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Professional Experience — timeline */}
        {cv.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {secHeader('Professional Experience')}
            {cv.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 20, display: 'flex', gap: 14 }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                  {i < cv.experience.length - 1 && <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < cv.experience.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{exp.role}</div>
                    <div style={{ fontSize: 10, color: ac, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{exp.period}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 8, fontStyle: 'italic' }}>
                    {[exp.company, exp.location, exp.type].filter(Boolean).join(' · ')}
                  </div>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                      <span style={{ color: ac, fontSize: 10, marginTop: 3, flexShrink: 0 }}>+</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, wordBreak: 'break-word' as const }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <div>
            {secHeader('Education')}
            {cv.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: navy }}>{e.degree}</div>
                  <div style={{ fontSize: 11, color: '#6b7c93' }}>{e.school}</div>
                </div>
                <div style={{ fontSize: 11, color: '#8fa3b8' }}>{e.year}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mobile scale wrapper ───────────────────────────────────────────────────
// Shrinks the CV visually to fit the container on small screens.
// Uses transform:scale (not zoom) so html2canvas captures the full-res DOM.
function CVScaleWrapper({ scale, children }: { scale: number; children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [outerH, setOuterH] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    if (!innerRef.current || scale >= 1) { setOuterH(undefined); return }
    const measure = () => {
      if (innerRef.current) {
        const h = innerRef.current.offsetHeight
        setOuterH(prev => (prev === h * scale ? prev : h * scale))
      }
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(innerRef.current)
    return () => obs.disconnect()
  }, [scale])

  if (scale >= 1) return <>{children}</>

  return (
    <div style={{ width: 740 * scale, height: outerH, overflow: 'hidden', flexShrink: 0 }}>
      <div ref={innerRef} style={{ width: 740, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

function normalizeCv(data: Partial<CVData>): CVData {
  const sa = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : []
  return {
    tagline: '', email: '', phone: '', location: '', linkedin: '',
    ...data,
    name:           typeof data.name    === 'string' ? data.name    : '',
    title:          typeof data.title   === 'string' ? data.title   : '',
    summary:        typeof data.summary === 'string' ? data.summary : '',
    stats:          sa(data.stats),
    skills:         sa(data.skills),
    certifications: sa(data.certifications),
    languages:      sa(data.languages),
    tools:          sa(data.tools),
    highlights:     sa(data.highlights),
    education:      sa(data.education),
    experience:     sa(data.experience).map((raw) => {
      const e = raw as Partial<CVData['experience'][0]>
      return { role: '', company: '', period: '', location: '', type: '', ...e, bullets: Array.isArray(e?.bullets) ? e.bullets! : [] }
    }),
  }
}

export default function IndiaCVBuilderPage() {
  const router = useRouter()
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const previewRef    = useRef<HTMLDivElement>(null)
  const previewAreaRef = useRef<HTMLDivElement>(null)

  const [cvText,        setCvText]        = useState('')
  const [cvFileName,    setCvFileName]    = useState('')
  const [fileLoading,   setFileLoading]   = useState(false)
  const [job,           setJob]           = useState<{ job_title: string; employer_name: string; job_description?: string } | null>(null)
  const [jobLabel,      setJobLabel]      = useState('')
  const [template,      setTemplate]      = useState<Template>('clean')
  const [tone,          setTone]          = useState<Tone>('professional')
  const lang: Lang = 'EN'
  const [cvData,        setCvData]        = useState<CVData | null>(null)
  const [rawCv,         setRawCv]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [openSections,  setOpenSections]  = useState<Record<string, boolean>>({ template: false, style: false })
  const [feedback,      setFeedback]      = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [downloading,   setDownloading]   = useState<'pdf' | 'docx' | null>(null)
  const [mobOpen,       setMobOpen]       = useState(false)
  const [atsFromScan,   setAtsFromScan]   = useState(false)
  const [atsSuggestions, setAtsSuggestions] = useState<{ missing_keywords: string[]; quick_fixes: string[]; format_issues?: string[]; section_gaps?: string[] } | null>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft,  setContactDraft]  = useState({ name: '', email: '', phone: '', location: '', linkedin: '' })
  const [mobileScale,   setMobileScale]   = useState(1)
  const [photoUrl,      setPhotoUrl]      = useState('')
  const [skillGapOpen,  setSkillGapOpen]  = useState(false)
  const [skillGapData,  setSkillGapData]  = useState<{ matching: string[]; missing: string[] } | null>(null)
  const [skillGapLoading, setSkillGapLoading] = useState(false)
  const [previewTab,      setPreviewTab]      = useState<'original' | 'generated'>('generated')
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null)
  const [originalFileIsPdf, setOriginalFileIsPdf] = useState(true)
  const [jobDesc,         setJobDesc]         = useState('')
  const [jobDescOpen,     setJobDescOpen]     = useState(false)
  const [fetchingJd,      setFetchingJd]      = useState(false)
  const [jdFetchError,    setJdFetchError]    = useState<string | null>(null)

  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()

  // Sync enriched jobDesc back to sessionStorage so cover letter always gets the full JD
  useEffect(() => {
    if (!job || !jobDesc) return
    try {
      const updated = { ...job, job_description: jobDesc }
      sessionStorage.setItem(SS.cvbJob, JSON.stringify(updated))
    } catch { }
  }, [jobDesc, job])
  const CV_COST = CREDIT_COST.tailorCv
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  // ── Calculate mobile scale ──
  useEffect(() => {
    return () => { if (originalFileUrl) URL.revokeObjectURL(originalFileUrl) }
  }, [originalFileUrl])

  useEffect(() => {
    function calc() {
      if (!previewAreaRef.current) return
      const available = previewAreaRef.current.offsetWidth - 32 // 16px each side
      setMobileScale(Math.min(1, available / 740))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // ── Restore session ──
  useEffect(() => {
    const sjs  = sessionStorage.getItem(SS.sjsCvText) || ''
    const cvt  = sessionStorage.getItem(SS.cvText) || ''
    const lnt  = sessionStorage.getItem(SS.linkedinText) || ''
    const cv   = sjs || cvt || lnt
    if (lnt && !sjs && !cvt) setCvFileName('LinkedIn Profile')
    const jobRaw    = sessionStorage.getItem(SS.inSelectedJob) || sessionStorage.getItem(SS.cvbJob)
    const savedRole = sessionStorage.getItem(SS.sjsTargetRole) || ''
    setCvText(cv)
    if (jobRaw) { try { const p = JSON.parse(jobRaw); setJob(p); setJobLabel(`${p.employer_name} - ${p.job_title}`); if (p.job_description) setJobDesc(p.job_description) } catch { } }
    else if (savedRole) setJobLabel(savedRole)
    const saved     = sessionStorage.getItem(SS.cvbTailored)
    const savedData = sessionStorage.getItem(SS.cvbData)
    if (saved) setRawCv(saved)
    if (savedData) { try { setCvData(normalizeCv(JSON.parse(savedData))) } catch { } }
    const atsRaw = sessionStorage.getItem(SS.atsSuggestions)
    if (atsRaw) {
      try { const s = JSON.parse(atsRaw); setAtsSuggestions(s); setTemplate('clean'); setAtsFromScan(true) } catch { }
    }
  }, [])

  async function fetchFullJd() {
    const url = (job as any)?.job_apply_link
    if (!url) return
    setFetchingJd(true)
    try {
      const res = await fetch('/api/fetch-jd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.text) {
        setJobDesc(data.text)
        setJobDescOpen(true)
        setJdFetchError(null)
      } else {
        setJobDescOpen(true)
        setJdFetchError('Site blocked the fetch. Open the job posting, copy the full description and paste it below:')
      }
    } catch {
      setJobDescOpen(true)
      setJdFetchError('Connection error. Open the job posting and paste the description manually below:')
    }
    setFetchingJd(false)
  }

  async function handleCvFile(file: File) {
    setCvFileName(file.name); setCvText(''); setFileLoading(true)
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl)
    setOriginalFileUrl(URL.createObjectURL(file))
    setOriginalFileIsPdf(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => { const text = (e.target?.result as string) ?? ''; setCvText(text); sessionStorage.setItem(SS.cvText, text); setFileLoading(false) }
      r.readAsText(file)
    } else {
      const form = new FormData(); form.append('file', file)
      try {
        const res  = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text); sessionStorage.setItem(SS.cvText, data.text) }
        else { alert(data.error || 'Could not read file.'); setCvFileName('') }
      } catch { alert('Failed to read file.'); setCvFileName('') }
      setFileLoading(false)
    }
  }

  function handlePhotoFile(file: File) {
    const r = new FileReader()
    r.onload = e => { const url = (e.target?.result as string) ?? ''; if (url) setPhotoUrl(url) }
    r.readAsDataURL(file)
  }

  function toggleSection(id: string) { setOpenSections(prev => ({ ...prev, [id]: !prev[id] })) }

  async function generate(confirmedSkills: string[] = []) {
    if (!cvText.trim()) return
    if (credits !== null && credits < CV_COST) { alert(`You need ${CV_COST} credit to build a CV.`); return }
    setLoading(true); setCvData(null); setRawCv(''); setMobOpen(false)

    const systemPrompt = `You are an elite CV designer. Extract and structure CV information into JSON for visual rendering.
Return ONLY valid JSON - no markdown, no backticks, no preamble.
Schema: {"name":"","title":"","tagline":"","email":"","phone":"","location":"","linkedin":"","summary":"","stats":[{"value":"","label":""}],"skills":[{"name":"","level":90}],"experience":[{"role":"","company":"","period":"","location":"","type":"","bullets":[""]}],"education":[{"degree":"","school":"","year":""}],"certifications":[""],"languages":[{"name":"","level":90}],"tools":[""],"highlights":[""]}
Rules:
- CONTACT FIELDS (email, phone, location, linkedin): copy EXACTLY from CV text. NEVER invent. Empty string if not found.
- skills: up to 12, level 60-99
- experience: include EVERY role, do not skip any
- bullets: 2-4 achievement-focused per role, action verbs
- tools: 10-20 specific technologies
- tone: ${tone}, language: ${lang}
${job ? `- Tailor for: ${job.job_title} at ${job.employer_name}` : ''}
${(jobDesc || job?.job_description) ? `- Job context: ${jobDesc || job?.job_description}` : ''}
${confirmedSkills.length > 0 ? `- User confirmed they also have these skills (include them): ${confirmedSkills.join(', ')}` : ''}
${atsSuggestions?.missing_keywords?.length ? `- ATS PRIORITY: Naturally incorporate these missing keywords: ${atsSuggestions.missing_keywords.join(', ')}` : ''}
${atsSuggestions?.quick_fixes?.length ? `- ATS QUICK FIXES:\n${atsSuggestions.quick_fixes.map((f: string) => `  * ${f}`).join('\n')}` : ''}
${atsSuggestions?.format_issues?.length ? `- ATS FORMAT ISSUES to fix: ${atsSuggestions.format_issues.join('; ')}` : ''}
${atsSuggestions?.section_gaps?.length ? `- ATS SECTION GAPS to address: ${atsSuggestions.section_gaps.join('; ')}` : ''}`

    try {
      const res  = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, lang, systemPrompt, returnJson: true, market: MARKET.in }) })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); setLoading(false); alert('Not enough credits.'); return }
      const data = await res.json()
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw  = data.cv || data.enhanced || data.result || ''
      setRawCv(raw); sessionStorage.setItem(SS.cvbTailored, raw)
      try { const parsed = normalizeCv(JSON.parse(raw.replace(/```json|```/g, '').trim())); setCvData(parsed); setPreviewTab('generated'); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch { setCvData(null) }
    } catch { setRawCv('Failed to generate.') }
    setLoading(false)
  }

  async function runSkillGapThenGenerate() {
    if (job?.job_description && cvText) {
      setSkillGapLoading(true)
      try {
        const res = await fetch('/api/cv/skill-gap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvText, jobDescription: job.job_description }),
        })
        const data = await res.json()
        setSkillGapLoading(false)
        if (data.missing?.length > 0) {
          setSkillGapData(data)
          setSkillGapOpen(true)
          return
        }
      } catch { setSkillGapLoading(false) }
    }
    generate([])
  }

  function handleGenerate() {
    if (needsCrossMarket(CV_COST, MARKET.in)) { setCrossWarnPending(() => runSkillGapThenGenerate) } else { runSkillGapThenGenerate() }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    setApplyingFeedback(true)
    try {
      const atsCtx = atsSuggestions?.missing_keywords?.length ? ` Ensure these ATS keywords are present: ${atsSuggestions.missing_keywords.join(', ')}.` : ''
      const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, lang, systemPrompt: `Apply the feedback and return updated JSON matching the same schema. Return ONLY valid JSON.${atsCtx}`, returnJson: true, feedback, currentCv: rawCv, market: MARKET.in }) })
      if (res.status === 402) { alert('Not enough credits.'); setApplyingFeedback(false); return }
      const data = await res.json()
      const raw  = data.cv || ''
      setRawCv(raw); sessionStorage.setItem(SS.cvbTailored, raw)
      try { const parsed = normalizeCv(JSON.parse(raw.replace(/```json|```/g, '').trim())); setCvData(parsed); setPreviewTab('generated'); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch { }
      setFeedback('')
    } catch { }
    setApplyingFeedback(false)
  }

  async function downloadPDF() {
    if (!cvData || !previewRef.current) return
    setDownloading('pdf')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Render into offscreen container — absolute avoids mobile viewport-relative positioning bugs
      const offscreen = document.createElement('div')
      offscreen.style.cssText = 'position:absolute;left:-9999px;top:0;width:740px;min-width:740px;max-width:740px;background:#fff;'
      const clone = previewRef.current.cloneNode(true) as HTMLElement
      // Strip visual chrome; pin to 740px so content can't escape and get clipped
      clone.style.cssText = 'width:740px;max-width:740px;box-sizing:border-box;overflow:visible;border-radius:0;box-shadow:none;'
      const tplRoot = clone.firstElementChild as HTMLElement | null
      if (tplRoot) {
        tplRoot.style.width = '740px'
        tplRoot.style.maxWidth = '740px'
        tplRoot.style.boxSizing = 'border-box'
      }
      offscreen.appendChild(clone)
      document.body.appendChild(offscreen)

      // Allow fonts and images to settle (longer on mobile)
      await new Promise(r => setTimeout(r, 300))

      const canvas = await html2canvas(offscreen, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 740,
        height: offscreen.scrollHeight,
        windowWidth: 740,
      })

      document.body.removeChild(offscreen)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const A4_W = 210
      const A4_H = 297
      const imgH = (canvas.height * A4_W) / canvas.width

      // Tile all generated content at natural aspect ratio
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, imgH)
      let position = -A4_H
      while (imgH + position > 0) {
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, A4_W, imgH)
        position -= A4_H
      }
      const name = (cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')
      pdf.save(`CV_${name}.pdf`)
    } catch (err) { console.error('PDF error:', err); alert('PDF generation failed.') }
    setDownloading(null)
  }

  async function downloadDOCX() {
    if (!cvData) return
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx')
      const teal = '00A58A', navyH = '0d2137', greyH = '6b7c93'
      const sectionTitle = (text: string) => new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: navyH, font: 'Calibri' })], spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dde4ee' } } })
      const bullet = (text: string) => new Paragraph({ children: [new TextRun({ text: '+ ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text, size: 18, color: '374151', font: 'Calibri' })], spacing: { before: 40, after: 40 }, indent: { left: 200 } })
      const children: any[] = []
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.name, bold: true, size: 48, color: navyH, font: 'Calibri' })], spacing: { after: 60 } }))
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.title, bold: true, size: 22, color: teal, font: 'Calibri' })], spacing: { after: 60 } }))
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) children.push(new Paragraph({ children: [new TextRun({ text: contact.join('  |  '), size: 18, color: greyH, font: 'Calibri' })], spacing: { after: 120 } }))
      if (cvData.summary) { children.push(sectionTitle('Professional Summary')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.summary, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.skills?.length) { children.push(sectionTitle('Core Skills')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.skills.map((s: { name: string }) => s.name).join('  .  '), size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.tools?.length) { children.push(sectionTitle('Tech Stack')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.tools.join('  .  '), size: 18, color: '185FA5', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.experience?.length) {
        children.push(sectionTitle('Professional Experience'))
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          children.push(new Paragraph({ children: [new TextRun({ text: exp.role, bold: true, size: 22, color: navyH, font: 'Calibri' }), new TextRun({ text: `  -  ${exp.period}`, size: 18, color: teal, font: 'Calibri' })], spacing: { before: 160, after: 40 } }))
          children.push(new Paragraph({ children: [new TextRun({ text: [exp.company, exp.location, exp.type].filter(Boolean).join('  .  '), size: 18, color: greyH, italics: true, font: 'Calibri' })], spacing: { after: 60 } }))
          exp.bullets?.forEach((b: string) => children.push(bullet(b)))
          children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
        })
      }
      if (cvData.education?.length) { children.push(sectionTitle('Education')); cvData.education.forEach((e: { degree: string; school: string; year: string }) => children.push(new Paragraph({ children: [new TextRun({ text: e.degree, bold: true, size: 20, color: navyH, font: 'Calibri' }), new TextRun({ text: `  -  ${e.school}  (${e.year})`, size: 18, color: greyH, font: 'Calibri' })], spacing: { after: 80 } }))) }
      if (cvData.certifications?.length) { children.push(sectionTitle('Certifications')); cvData.certifications.forEach((c: string) => children.push(new Paragraph({ children: [new TextRun({ text: '* ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text: c, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 60 } }))) }
      if (cvData.languages?.length) { children.push(sectionTitle('Languages')); children.push(new Paragraph({ children: cvData.languages.flatMap((l: { name: string; level: number }, i: number) => { const level = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'; return [new TextRun({ text: l.name, bold: true, size: 18, color: navyH, font: 'Calibri' }), new TextRun({ text: ` (${level})`, size: 18, color: greyH, font: 'Calibri' }), ...(i < cvData.languages.length - 1 ? [new TextRun({ text: '   .   ', size: 18, color: 'cccccc', font: 'Calibri' })] : [])] }), spacing: { after: 80 } })) }
      const docx = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }] })
      const blob = await Packer.toBlob(docx)
      const url  = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`; a.click(); URL.revokeObjectURL(url)
    } catch (err) { console.error('DOCX error:', err); alert('DOCX generation failed.') }
    setDownloading(null)
  }

  function goToCoverLetter() {
    sessionStorage.setItem(SS.cvbTailored, rawCv)
    if (job) sessionStorage.setItem(SS.cvbJob, JSON.stringify(job))
    router.push('/in/cover-letter')
  }
  function goToAtsCheck() {
    if (cvData) {
      const lines: string[] = []
      lines.push(cvData.name, cvData.title)
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) lines.push(contact.join(' | '))
      if (cvData.summary) lines.push('\nSUMMARY', cvData.summary)
      if (cvData.skills?.length) lines.push('\nSKILLS', cvData.skills.map((s: { name: string }) => s.name).join(', '))
      if (cvData.tools?.length) lines.push('\nTECH STACK', cvData.tools.join(', '))
      if (cvData.experience?.length) { lines.push('\nEXPERIENCE'); cvData.experience.forEach((exp: { role: string; company: string; period: string; bullets: string[] }) => { lines.push(`${exp.role} at ${exp.company} (${exp.period})`); exp.bullets?.forEach((b: string) => lines.push(`• ${b}`)) }) }
      if (cvData.education?.length) { lines.push('\nEDUCATION'); cvData.education.forEach((e: { degree: string; school: string; year: string }) => lines.push(`${e.degree} - ${e.school} (${e.year})`)) }
      if (cvData.certifications?.length) { lines.push('\nCERTIFICATIONS'); cvData.certifications.forEach((c: string) => lines.push(`• ${c}`)) }
      if (cvData.languages?.length) { lines.push('\nLANGUAGES'); lines.push(cvData.languages.map((l: { name: string }) => l.name).join(', ')) }
      sessionStorage.setItem(SS.cvText, lines.join('\n'))
    }
    sessionStorage.removeItem(SS.atsSuggestions)
    router.push('/in/career-scan')
  }

  // ── Template definitions ──
  const templates: { id: Template; label: string; ac: string; desc: string; ats: string; atsColor: string; preview: React.ReactNode }[] = [
    {
      id: 'clean', label: 'Clean', ac: '#1a5fa0', desc: 'Single column · Blue', ats: 'ATS: High ✓', atsColor: '#1D9E75',
      preview: (
        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
          <div style={{ height: 2, background: '#1a5fa080', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
          {[90,70,85,60,95,75,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
        </div>
      ),
    },
    {
      id: 'saffron', label: 'Saffron', ac: '#FF9933', desc: 'Single column · Orange', ats: 'ATS: High ✓', atsColor: '#1D9E75',
      preview: (
        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
          <div style={{ height: 2, background: '#FF993380', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
          {[90,70,85,60,95,75,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
        </div>
      ),
    },
    {
      id: 'classic', label: 'Classic', ac: '#1a1a1a', desc: 'Single column · B&W', ats: 'ATS: High ✓', atsColor: '#1D9E75',
      preview: (
        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
          <div style={{ height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
          {[90,70,85,60,95,75,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
        </div>
      ),
    },
    {
      id: 'modern', label: 'Modern', ac: '#0050b3', desc: 'Gradient header · Print-ready', ats: 'ATS: Medium ◐', atsColor: '#f59e0b',
      preview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ height: 14, background: 'linear-gradient(135deg,#0050b3,#0050b380)', borderRadius: '3px 3px 0 0', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.8)', borderRadius: 1, width: '60%' }} />
            <div style={{ height: 1.5, background: 'rgba(255,255,255,0.4)', borderRadius: 1, width: '40%' }} />
          </div>
          <div style={{ padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[85,65,90,70,95,75,80].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
        </div>
      ),
    },
    {
      id: 'executive', label: 'Executive', ac: '#FF9933', desc: 'Sidebar layout · Premium', ats: 'ATS: Low ⚠', atsColor: '#ef4444',
      preview: (
        <div style={{ display: 'flex', height: '100%', gap: 0 }}>
          <div style={{ width: 14, background: 'rgba(13,33,55,0.9)', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: 1.5, borderRadius: '3px 0 0 3px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF993360', margin: '0 auto 2px' }} />
            {[80,65,75,55,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.15)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
          <div style={{ flex: 1, padding: '4px 3px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 1, width: '70%', marginBottom: 2 }} />
            {[100,80,90,65,100,75,85,60].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
        </div>
      ),
    },
    {
      id: 'executive2', label: 'Executive II', ac: '#FF9933', desc: 'Wide sidebar · Timeline · DACH-style', ats: 'ATS: Low ⚠', atsColor: '#ef4444',
      preview: (
        <div style={{ display: 'flex', height: '100%', gap: 0 }}>
          <div style={{ width: 18, background: 'linear-gradient(170deg,rgba(13,33,55,0.95),rgba(30,18,8,0.95))', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: 2, borderRadius: '3px 0 0 3px' }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'linear-gradient(135deg,#FF9933,#FF993388)', margin: '0 auto 2px' }} />
            {[85,65,78,55,85].map((w, i) => (
              <div key={i} style={{ marginBottom: 1 }}>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%`, marginBottom: 0.5 }} />
                <div style={{ height: 1.5, background: 'rgba(255,153,51,0.5)', borderRadius: 1, width: `${Math.round(w * 0.9)}%` }} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '4px 3px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.55)', borderRadius: 1, width: '65%', marginBottom: 1 }} />
            <div style={{ height: 2, background: '#FF993355', borderRadius: 1, width: '45%', marginBottom: 3 }} />
            <div style={{ height: 1, background: '#edf1f620', marginBottom: 2 }} />
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, marginBottom: 2 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#FF9933', flexShrink: 0, marginTop: 0.5 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[70,55].map((w, j) => <div key={j} style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1, width: `${w}%` }} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const tones: { id: Tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Polished & credible' },
    { id: 'concise',      label: 'Concise',      desc: 'Sharp & efficient'  },
    { id: 'detailed',     label: 'Detailed',      desc: 'Thorough & expansive' },
  ]

  function renderCV() {
    if (!cvData) return null
    const t = templates.find(t => t.id === template)!
    if (template === 'modern')      return <ModernCV      cv={cvData} ac={t.ac} />
    if (template === 'executive')   return <ExecutiveCV   cv={cvData} ac={t.ac} photo={photoUrl || undefined} />
    if (template === 'executive2')  return <ExecutiveV2CV cv={cvData} ac={t.ac} photo={photoUrl || undefined} />
    return <IndiaCV cv={cvData} ac={t.ac} />
  }

  const canGenerate = !loading && !!cvText.trim() && (credits === null || credits >= CV_COST)
  const curTpl = templates.find(t => t.id === template)!

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@300;400;600;700&display=swap');
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cvb-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,.4) !important; }
        .cvb-action:hover { background: rgba(255,255,255,0.1) !important; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:4px; }
        .cv-preview { animation: fadeUp 0.35s ease; }
        .jl-dsb  { display: flex !important; }
        .jl-mob  { display: none !important; }
        .jl-mbtn { display: none !important; }
        @media (max-width: 768px) {
          .jl-dsb  { display: none !important; }
          .jl-mob  { display: flex !important; }
          .jl-mbtn { display: block !important; }
        }
      `}</style>

      {crossWarnPending && (
        <CrossMarketModal cost={CV_COST} market={MARKET.in} crossAmount={crossMarketAmount(CV_COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)} />
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* ── LEFT PANEL ── */}
        <div className="jl-dsb" style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', flexDirection: 'column' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/in/career-scan')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>{'<'}- Back to ATS Score</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>CV Studio</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              Design your perfect CV
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9933', background: 'rgba(255,153,51,0.15)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.tailorCv} credit
              </span>
            </div>
            {jobLabel && <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}><div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Tailoring for</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div></div>}

            {/* JD quality indicator + editable field */}
            {jobLabel && (
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const jdLen = (jobDesc || job?.job_description || '').length
                  const hasUrl = !!(job as any)?.job_apply_link
                  const quality = jdLen < 300 ? 'short' : jdLen < 800 ? 'partial' : 'full'
                  const dot = quality === 'full' ? '#4ade80' : quality === 'partial' ? '#fbbf24' : '#f87171'
                  const label = quality === 'full'
                    ? `Full JD · ${jdLen} chars`
                    : quality === 'partial'
                    ? `May be incomplete · ${jdLen} chars`
                    : `Too short · ${jdLen} chars — paste full JD for better tailoring`
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }}/>
                        {label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {quality !== 'full' && hasUrl && (
                          <button onClick={fetchFullJd} disabled={fetchingJd}
                            style={{ fontSize: 10, fontWeight: 700, color: accent, background: 'none', border: 'none', cursor: fetchingJd ? 'wait' : 'pointer', padding: 0, opacity: fetchingJd ? .6 : 1, whiteSpace: 'nowrap' }}>
                            {fetchingJd ? 'Fetching…' : '↓ Fetch full JD'}
                          </button>
                        )}
                        {hasUrl && (
                          <a href={(job as any).job_apply_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                            title="Open job posting">
                            ↗ Posting
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {jdFetchError && (
                  <div style={{ fontSize: 11, color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, lineHeight: 1.5 }}>
                    {jdFetchError}{' '}
                    {(job as any)?.job_apply_link && (
                      <a href={(job as any).job_apply_link} target="_blank" rel="noopener noreferrer"
                        style={{ color: accent, fontWeight: 700, textDecoration: 'underline' }}>
                        Open job posting →
                      </a>
                    )}
                  </div>
                )}
                <button onClick={() => setJobDescOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
                  <span>Full job description</span>
                  <span style={{ transform: jobDescOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                </button>
                {jobDescOpen && (
                  <>
                    <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                      placeholder="Paste the complete job posting here — the fuller it is, the better the CV is tailored."
                      rows={6}
                      style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                    />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4 }}>
                      Tip: job boards often shorten descriptions. Paste the full text from the original posting for best results.
                    </div>
                  </>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {!cvText ? (
              <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleCvFile(e.dataTransfer.files[0]) }}
                style={{ marginTop: 12, padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                {fileLoading
                  ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />Reading...</div>
                  : <><div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.5)" /></div><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Upload your CV</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF · DOCX · TXT</div></>}
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>✓ {cvFileName || 'CV loaded'}</span>
                <button onClick={() => { setCvText(''); setCvFileName(''); if (originalFileUrl) URL.revokeObjectURL(originalFileUrl); setOriginalFileUrl(null); setCvData(null); setRawCv(''); setPreviewTab('generated'); if (fileInputRef.current) fileInputRef.current.value = ''; sessionStorage.removeItem(SS.cvbTailored); sessionStorage.removeItem(SS.cvbData); sessionStorage.removeItem(SS.cvText) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )}
          </div>

          {/* ── Photo upload (used in Executive template) ── */}
          <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 10 }}>
              Profile Photo <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>· Executive</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}55`, flexShrink: 0 }} />
              ) : (
                <div onClick={() => photoInputRef.current?.click()} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 18 }}>+</div>
              )}
              <div style={{ flex: 1 }}>
                <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: photoUrl ? accent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block' }}>
                  {photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {photoUrl && (
                  <button onClick={() => setPhotoUrl('')} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: 'inherit' }}>Remove</button>
                )}
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Template accordion */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('template')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.template ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.template ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.template ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>Template</span>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{curTpl.label}</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.template ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.template && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {atsFromScan && (<div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 11, color: '#1D9E75', lineHeight: 1.4, marginBottom: 4 }}>Template selected for best ATS compatibility</div>)}
                  {atsSuggestions && (
                    <div style={{ padding: '10px 12px', background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.25)', borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>ATS Inputs Active</div>
                      {atsSuggestions.missing_keywords?.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>KEYWORDS TO ADD</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{atsSuggestions.missing_keywords.slice(0, 8).map((kw: string, i: number) => (<span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,153,51,0.15)', color: accent, border: '1px solid rgba(255,153,51,0.3)', fontWeight: 600 }}>{kw}</span>))}{atsSuggestions.missing_keywords.length > 8 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{atsSuggestions.missing_keywords.length - 8} more</span>}</div></div>)}
                    </div>
                  )}
                  {templates.map(t => (
                    <div key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.09)'}`, background: template === t.id ? t.ac + '14' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Template thumbnail */}
                      <div style={{ width: 38, height: 48, borderRadius: 4, background: '#1a2535', flexShrink: 0, overflow: 'hidden', border: `1px solid ${template === t.id ? t.ac + '60' : 'rgba(255,255,255,0.07)'}` }}>
                        {t.preview}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === t.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.desc}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: t.atsColor, marginTop: 3, letterSpacing: 0.3 }}>{t.ats}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.15)'}`, background: template === t.id ? t.ac : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Style accordion */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>Style & Format</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Tone</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {tones.map(t => (
                        <div key={t.id} onClick={() => setTone(t.id)} style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.08)'}`, background: tone === t.id ? accent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t.desc}</div></div>
                          <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? accent : 'transparent', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate button */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>{credits === 0 ? 'No credits left. Top up on Account page.' : `${credits} credit${credits === 1 ? '' : 's'} remaining.`}</div>}
            <button className="cvb-gen" onClick={handleGenerate} disabled={!canGenerate}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: canGenerate ? `linear-gradient(135deg, ${accent}, #e67300)` : 'rgba(255,255,255,0.08)', color: canGenerate ? '#042C53' : 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} />Generating...</>
                : credits !== null && credits < CV_COST ? `Need ${CV_COST} credit — you have ${credits}`
                : cvData ? `Regenerate CV (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
            </button>
          </div>
        </div>

        {/* ── RIGHT PREVIEW PANEL ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', minWidth: 0 }}>

          {/* Mobile toggle button */}
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#152233', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#1a2d45', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{mobOpen ? '✕ Close Settings' : '⚙ CV Settings'}</button>
          </div>

          {/* Mobile settings panel */}
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', overflowY: 'auto', maxHeight: '65vh', padding: '16px', gap: 14, flexShrink: 0 }}>
              {!cvText && <div onClick={() => fileInputRef.current?.click()} style={{ padding: '14px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}><div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={18} color="rgba(255,255,255,0.5)" /></div><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{fileLoading ? 'Reading...' : 'Upload your CV'}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>PDF · DOCX · TXT</div></div>}
              {cvText && cvFileName && <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>✓ {cvFileName}</div>}
              {/* Mobile photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}55`, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>+</div>
                )}
                <div style={{ flex: 1 }}>
                  <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 11, fontWeight: 600, color: photoUrl ? accent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {photoUrl ? 'Change photo' : 'Photo (Executive)'}
                  </button>
                  {photoUrl && <button onClick={() => setPhotoUrl('')} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 10, fontFamily: 'inherit' }}>Remove</button>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Template</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.1)'}`, background: template === t.id ? t.ac + '20' : 'rgba(255,255,255,0.04)', color: template === t.id ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: template === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t.label} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{t.desc}</span></span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.atsColor }}>{t.ats}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="cvb-gen" onClick={() => { handleGenerate() }} disabled={!canGenerate}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: canGenerate ? `linear-gradient(135deg, ${accent}, #e67300)` : 'rgba(255,255,255,0.08)', color: canGenerate ? '#042C53' : 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed' }}>
                {loading ? 'Generating...' : credits !== null && credits < CV_COST ? `Need ${CV_COST} credit` : cvData ? `Regenerate (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? accent : 'rgba(255,255,255,0.25)' }}>{cvData ? 'CV Ready' : 'Preview'}</span>
              {cvData && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>{curTpl.label} | {lang}</span>}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'pdf' ? 'Building...' : 'PDF'}</button>
                <button className="cvb-action" onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'docx' ? 'Building...' : 'Word'}</button>
                <button className="cvb-action" onClick={goToAtsCheck} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${accent}60`, background: accent + '14', color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>ATS Check</button>
                <button onClick={goToCoverLetter} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cover Letter →</button>
              </div>
            )}
          </div>

          {/* Preview area */}
          <div ref={previewAreaRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '28px 20px', display: 'flex', justifyContent: 'center' }}>

            {loading && (
              <div style={{ width: '100%', maxWidth: 740 }}>
                <div style={{ background: '#1C2A3A', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', minHeight: 700 }}>
                    <div style={{ width: 200, background: 'rgba(0,0,0,0.3)', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="shimmer" style={{ width: 60, height: 60, borderRadius: '50%', alignSelf: 'center', marginBottom: 8 }} />
                      {[80,60,90,70,55,80,65].map((w,i) => <div key={i} className="shimmer" style={{ height: i % 3 === 0 ? 8 : 5, width: `${w}%` }} />)}
                    </div>
                    <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="shimmer" style={{ height: 20, width: '55%', marginBottom: 4 }} />
                      <div className="shimmer" style={{ height: 10, width: '35%', marginBottom: 16 }} />
                      {[100,85,95,70,100,80,90,65,100,75,85,60,95].map((w,i) => <div key={i} className="shimmer" style={{ height: i % 5 === 0 ? 12 : 7, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accent}40`, borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />
                  Designing your CV...
                </div>
              </div>
            )}

            {/* Empty state — no file uploaded, no generated CV */}
            {!loading && !cvData && !originalFileUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
                <div style={{ width: 260, opacity: 0.5 }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', height: 300 }}>
                      <div style={{ width: 80, background: `${accent}15`, padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: accent + '30', margin: '0 auto 6px' }} />
                        {[80,65,75,55,80,65,70].map((w,i) => <div key={i} style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                      <div style={{ flex: 1, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ height: 11, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '60%' }} />
                        <div style={{ height: 5, background: accent + '40', borderRadius: 2, width: '40%', marginBottom: 7 }} />
                        {[100,80,90,65,100,75,85,60,95].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>{cvText ? 'Ready to design' : 'No CV uploaded'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>{cvText ? `Choose a template and click Generate CV\n${curTpl.label}: ${curTpl.ats}` : 'Upload your CV using the panel on the left'}</div>
                  {cvText && <button onClick={handleGenerate} className="cvb-gen" disabled={!canGenerate} style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: canGenerate ? accent : 'rgba(255,255,255,0.1)', color: canGenerate ? '#0a1520' : 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed' }}>Generate CV</button>}
                </div>
              </div>
            )}

            {/* Original file preview — uploaded but not yet generated */}
            {!loading && !cvData && originalFileUrl && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: mobileScale < 1 ? 740 * mobileScale : 740 }}>
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SvgIcon name="document" size={14} color="#6c757d" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>{cvFileName || 'Uploaded CV'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>Your original</span>
                  </div>
                  {originalFileIsPdf ? (
                    <iframe src={originalFileUrl} title="Original CV" style={{ width: '100%', height: 680, border: 'none', display: 'block' }} />
                  ) : (
                    <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>DOCX uploaded</div>
                      <div style={{ fontSize: 12, color: '#868e96', marginBottom: 20 }}>Browser cannot preview DOCX files. Select a template and generate your new CV.</div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 10, fontSize: 12, color: 'rgba(255,153,51,0.8)', textAlign: 'center' as const, fontFamily: "'Outfit', sans-serif" }}>
                  ✓ CV uploaded — select a template on the left and click Generate CV
                </div>
              </div>
            )}

            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: mobileScale < 1 ? 740 * mobileScale : 740 }}>

                {/* Before / After tab toggle — only when original file is in memory */}
                {originalFileUrl && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
                    <button onClick={() => setPreviewTab('original')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewTab === 'original' ? '#E6F1FB' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'original' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="document" size={13} color="currentColor" />
                      Your Original
                    </button>
                    <button onClick={() => setPreviewTab('generated')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'generated' ? '#FF9933' : 'transparent', color: previewTab === 'generated' ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'generated' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="sparkle" size={13} color="currentColor" />
                      Generated CV
                    </button>
                  </div>
                )}

                {/* Original file view — only rendered when originalFileUrl is in memory */}
                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden', minHeight: 300 }}>
                    <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SvgIcon name="document" size={14} color="#6c757d" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>{cvFileName || 'Uploaded CV'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>Original file</span>
                    </div>
                    {originalFileIsPdf ? (
                      <iframe src={originalFileUrl} title="Original CV" style={{ width: '100%', height: 720, border: 'none', display: 'block' }} />
                    ) : (
                      <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Preview not available</div>
                        <div style={{ fontSize: 12, color: '#868e96', marginBottom: 20 }}>DOCX files cannot be previewed directly in the browser.</div>
                        <a href={originalFileUrl} download={cvFileName} style={{ padding: '8px 20px', borderRadius: 8, background: '#FF9933', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>Download original</a>
                      </div>
                    )}
                  </div>
                )}

                {/* Generated CV visual preview */}
                {(previewTab === 'generated' || !originalFileUrl) && (
                <CVScaleWrapper scale={mobileScale}>
                  <div ref={previewRef} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                    {renderCV()}
                  </div>
                </CVScaleWrapper>
                )}

                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const }}>
                    ← Switch to "Generated CV" to request changes or download
                  </div>
                )}

                {(previewTab === 'generated' || !originalFileUrl) && <div>
                {/* Contact editor */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Contact Info</div>
                    <button onClick={() => { if (!editingContact) setContactDraft({ name: cvData?.name || '', email: cvData?.email || '', phone: cvData?.phone || '', location: cvData?.location || '', linkedin: cvData?.linkedin || '' }); setEditingContact(e => !e) }}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'transparent', color: accent, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {editingContact ? 'Cancel' : 'Edit — free'}
                    </button>
                  </div>
                  {editingContact && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(['name', 'email', 'phone', 'location', 'linkedin'] as const).map(field => (
                        <div key={field}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{field}</div>
                          <input value={contactDraft[field]} onChange={e => setContactDraft(d => ({ ...d, [field]: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#E6F1FB', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                      ))}
                      <button onClick={() => { if (!cvData) return; const updated = { ...cvData, ...contactDraft }; setCvData(updated); sessionStorage.setItem(SS.cvbData, JSON.stringify(updated)); setEditingContact(false) }}
                        style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                        Save contact info
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>Request changes</div>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="e.g. Make the summary shorter, highlight technical skills more…" rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }} />
                  <button onClick={applyFeedback} disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? accent : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying…' : 'Apply changes — 1 credit'}
                  </button>
                </div>

                {/* Bottom actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 40 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}</button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'docx' ? 'Building Word...' : 'Download Word'}</button>
                  <button onClick={goToAtsCheck} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${accent}50`, background: accent + '15', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Check ATS Score</button>
                  <button onClick={goToCoverLetter} style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${accent}40` }}>Write Cover Letter →</button>
                </div>
                </div>}{/* end previewTab === 'generated' wrapper */}
              </div>
            )}
          </div>
        </div>
      </div>

      {skillGapOpen && skillGapData && (
        <SkillGapModal
          matching={skillGapData.matching}
          missing={skillGapData.missing}
          accent={accent}
          onConfirm={(confirmed) => { setSkillGapOpen(false); setSkillGapData(null); generate(confirmed) }}
          onSkip={() => { setSkillGapOpen(false); setSkillGapData(null); generate([]) }}
          onCareerScan={() => { setSkillGapOpen(false); setSkillGapData(null); router.push('/in/career-scan') }}
        />
      )}
    </div>
  )
}
