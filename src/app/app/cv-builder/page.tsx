'use client'

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useCredits } from '@/lib/useCredits'
import { useLanguage } from '@/lib/i18n'
import CrossMarketModal from '@/components/CrossMarketModal'
import SkillGapModal from '@/components/SkillGapModal'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

type Template = 'executive' | 'modern' | 'minimal' | 'technical'
type Tone = 'professional' | 'concise' | 'detailed'
type Lang = 'EN' | 'DE'

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
  experience: {
    role: string
    company: string
    period: string
    location: string
    type: string
    bullets: string[]
  }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
}

const EMPTY_CV: CVData = {
  name: '', title: '', tagline: '', email: '', phone: '', location: '', linkedin: '',
  summary: '', stats: [], skills: [], experience: [], education: [],
  certifications: [], languages: [], tools: [], highlights: []
}

function normalizeCv(data: Partial<CVData>): CVData {
  const sa = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : []
  return {
    ...EMPTY_CV,
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

// -- TEMPLATE RENDERERS ------------------------------------------------------

function ExecutiveTemplate({ cv, photo }: { cv: CVData; photo?: string }) {
  return (
    <div style={{ display: 'flex', minHeight: 900, fontFamily: "'DM Sans', sans-serif", background: '#fff' }}>
      {/* Dark sidebar */}
      <div style={{ width: 240, background: 'linear-gradient(170deg, #0d2137 0%, #0a3d2e 100%)', flexShrink: 0, padding: '36px 22px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Avatar / photo */}
        <div style={{ textAlign: 'center', paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {photo ? (
            <img src={photo} alt={cv.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #00C9A7', display: 'block', margin: '0 auto 14px' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #0a8f72)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 auto 14px', letterSpacing: 1 }}>
              {cv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.3, marginBottom: 4 }}>{cv.name}</div>
          <div style={{ fontSize: 10, color: '#00C9A7', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.5 }}>{cv.title}</div>
        </div>

        {/* Contact */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Contact</div>
          {[
            { icon: '@', val: cv.email },
            { icon: 'T', val: cv.phone },
            { icon: 'L', val: cv.location },
            { icon: 'in', val: cv.linkedin },
          ].filter(r => r.val).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00C9A7', width: 14, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, wordBreak: 'break-all' }}>{r.val}</span>
            </div>
          ))}
        </div>

        {/* Skills */}
        {cv.skills.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Skills</div>
            {cv.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{s.name}</span>
                  <span style={{ fontSize: 9, color: '#00C9A7', fontWeight: 700 }}>{s.level}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${s.level}%`, background: 'linear-gradient(90deg, #00C9A7, #0a8f72)', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Languages */}
        {cv.languages.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Languages</div>
            {cv.languages.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{l.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(d => (
                    <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: d <= Math.round(l.level / 20) ? '#00C9A7' : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {cv.certifications.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Certifications</div>
            {cv.certifications.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#00C9A7', fontSize: 10, marginTop: 1 }}>*</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Highlights */}
        {cv.highlights.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Highlights</div>
            {cv.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ color: '#00C9A7', fontSize: 9, marginTop: 2 }}>&gt;</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{h}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '36px 32px', minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #f0f4f8' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0d2137', fontFamily: "'Outfit', sans-serif", letterSpacing: -0.5, marginBottom: 4 }}>{cv.name}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00C9A7', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{cv.title}</div>
          {cv.tagline && <div style={{ fontSize: 11, color: '#6b7c93', letterSpacing: 0.5 }}>{cv.tagline}</div>}
        </div>

        {/* Stats row */}
        {cv.stats.length > 0 && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #edf1f6' }}>
            {cv.stats.map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 16px', textAlign: 'center', borderRight: i < cv.stats.length - 1 ? '1px solid #edf1f6' : 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0d2137', fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#8fa3b8', marginTop: 2, letterSpacing: 0.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {cv.summary && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0d2137', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Executive Summary</span>
              <div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div>
          </div>
        )}

        {/* Tools/tags */}
        {cv.tools.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0d2137', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Core Stack</span>
              <div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cv.tools.map((t, i) => (
                <span key={i} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: '#f0f4f8', color: '#374151', border: '1px solid #e2e8f0', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {cv.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0d2137', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Professional Experience</span>
              <div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
            </div>
            {cv.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 20, display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C9A7', flexShrink: 0 }} />
                  {i < cv.experience.length - 1 && <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < cv.experience.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2137' }}>{exp.role}</div>
                    <div style={{ fontSize: 10, color: '#00C9A7', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{exp.period}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 8, fontStyle: 'italic' }}>
                    {[exp.company, exp.location, exp.type].filter(Boolean).join(' . ')}
                  </div>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                      <span style={{ color: '#00C9A7', fontSize: 10, marginTop: 3, flexShrink: 0 }}>+</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{b}</span>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0d2137', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Education</span>
              <div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
            </div>
            {cv.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0d2137' }}>{e.degree}</div>
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

function ModernTemplate({ cv }: { cv: CVData }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: 900 }}>
      {/* Full-width colored header */}
      <div style={{ background: 'linear-gradient(135deg, #042C53 0%, #185FA5 100%)', padding: '36px 40px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(55,138,221,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: 200, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,201,167,0.1)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: -0.5, marginBottom: 4 }}>{cv.name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#378ADD', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>{cv.title}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {cv.stats.length > 0 && (
        <div style={{ background: '#042C53', display: 'flex' }}>
          {cv.stats.map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 16px', textAlign: 'center', borderRight: i < cv.stats.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00C9A7', fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Left column */}
        <div style={{ width: 220, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid #edf1f6', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cv.skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Skills</div>
              {cv.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 9, color: '#378ADD', fontWeight: 700 }}>{s.level}%</span>
                  </div>
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${s.level}%`, background: 'linear-gradient(90deg, #042C53, #378ADD)', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {cv.languages.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Languages</div>
              {cv.languages.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ fontSize: 10, color: '#374151' }}>{l.name}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1,2,3,4,5].map(d => (
                      <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: d <= Math.round(l.level / 20) ? '#042C53' : '#e2e8f0' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cv.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Certifications</div>
              {cv.certifications.map((c, i) => (
                <div key={i} style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderLeft: '3px solid #378ADD', borderRadius: 4, marginBottom: 6, fontSize: 10, color: '#374151', lineHeight: 1.4 }}>{c}</div>
              ))}
            </div>
          )}

          {cv.highlights.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Highlights</div>
              {cv.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ color: '#378ADD', fontSize: 10, marginTop: 2 }}>&gt;</span>
                  <span style={{ fontSize: 10, color: '#6b7c93', lineHeight: 1.5 }}>{h}</span>
                </div>
              ))}
            </div>
          )}

          {cv.education.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Education</div>
              {cv.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0d2137' }}>{e.degree}</div>
                  <div style={{ fontSize: 10, color: '#6b7c93' }}>{e.school}</div>
                  <div style={{ fontSize: 9, color: '#8fa3b8' }}>{e.year}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right main */}
        <div style={{ flex: 1, padding: '28px 28px', minWidth: 0, overflow: 'hidden' }}>
          {cv.summary && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Profile</span><div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div>
            </div>
          )}

          {cv.tools.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Core Stack</span><div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.tools.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: '#E6F1FB', color: '#185FA5', border: '1px solid #c3ddf7', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {cv.experience.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Experience</span><div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
              </div>
              {cv.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: 18, paddingLeft: 14, borderLeft: '2px solid #edf1f6', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#378ADD' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#042C53' }}>{exp.role}</div>
                    <div style={{ fontSize: 10, color: '#378ADD', fontWeight: 600 }}>{exp.period}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 6, fontStyle: 'italic' }}>
                    {[exp.company, exp.location, exp.type].filter(Boolean).join(' . ')}
                  </div>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#1D9E75', fontSize: 10, marginTop: 3, flexShrink: 0 }}>+</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{b}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MinimalTemplate({ cv }: { cv: CVData }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', padding: '48px 52px', minHeight: 900 }}>
      {/* Name block */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #1a2332' }}>
        <div style={{ fontSize: 38, fontWeight: 300, color: '#1a2332', fontFamily: "'Outfit', sans-serif", letterSpacing: -1, marginBottom: 6 }}>{cv.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: 3, textTransform: 'uppercase' }}>{cv.title}</div>
          <div style={{ fontSize: 10, color: '#8fa3b8', textAlign: 'right' }}>
            {[cv.email, cv.phone, cv.location].filter(Boolean).join('  .  ')}
          </div>
        </div>
      </div>

      {/* Stats */}
      {cv.stats.length > 0 && (
        <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
          {cv.stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 28, fontWeight: 200, color: '#1a2332', fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#8fa3b8', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 40 }}>
        {/* Main */}
        <div>
          {cv.summary && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Summary</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.9, fontWeight: 300 }}>{cv.summary}</div>
            </div>
          )}

          {cv.experience.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 14 }}>Experience</div>
              {cv.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2332' }}>{exp.role}</div>
                    <div style={{ fontSize: 10, color: '#8fa3b8' }}>{exp.period}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 8 }}>{[exp.company, exp.location].filter(Boolean).join(', ')}</div>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                      <span style={{ color: '#1a2332', fontSize: 10 }}>-</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.7, fontWeight: 300 }}>{b}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {cv.tools.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Tools & Stack</div>
              <div style={{ fontSize: 11, color: '#374151', lineHeight: 2, fontWeight: 300 }}>
                {cv.tools.join('  .  ')}
              </div>
            </div>
          )}
        </div>

        {/* Side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cv.skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Skills</div>
              {cv.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: '#374151', marginBottom: 2, fontWeight: 300 }}>{s.name}</div>
                  <div style={{ height: 2, background: '#edf1f6' }}>
                    <div style={{ height: '100%', width: `${s.level}%`, background: '#1a2332' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {cv.languages.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Languages</div>
              {cv.languages.map((l, i) => (
                <div key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{l.name}</span>
                  <span style={{ color: '#8fa3b8' }}>{l.level >= 90 ? 'Native' : l.level >= 70 ? 'Fluent' : l.level >= 50 ? 'Good' : 'Basic'}</span>
                </div>
              ))}
            </div>
          )}

          {cv.education.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Education</div>
              {cv.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a2332' }}>{e.degree}</div>
                  <div style={{ fontSize: 10, color: '#6b7c93' }}>{e.school}</div>
                  <div style={{ fontSize: 9, color: '#8fa3b8' }}>{e.year}</div>
                </div>
              ))}
            </div>
          )}

          {cv.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8fa3b8', marginBottom: 10 }}>Certifications</div>
              {cv.certifications.map((c, i) => (
                <div key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 5, lineHeight: 1.5, fontWeight: 300 }}>{c}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TechnicalTemplate({ cv }: { cv: CVData }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: 900 }}>
      {/* Top accent bar */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #E05C97, #6C8EF5, #00C9A7)' }} />

      <div style={{ display: 'flex' }}>
        {/* Left sidebar */}
        <div style={{ width: 230, background: '#1a2332', padding: '32px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: 4, lineHeight: 1.3 }}>{cv.name}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E05C97', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>{cv.title}</div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).map((v, i) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, wordBreak: 'break-all' }}>{v}</div>
          ))}

          {cv.skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#E05C97', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Proficiency</div>
              {cv.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                    <span style={{ fontSize: 9, color: '#E05C97' }}>{s.level}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${s.level}%`, background: 'linear-gradient(90deg, #E05C97, #6C8EF5)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {cv.languages.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#E05C97', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Languages</div>
              {cv.languages.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{l.name}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1,2,3,4,5].map(d => (
                      <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: d <= Math.round(l.level / 20) ? '#E05C97' : 'rgba(255,255,255,0.12)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cv.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#E05C97', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Certifications</div>
              {cv.certifications.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#6C8EF5', fontSize: 10 }}>*</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {cv.education.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#E05C97', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Education</div>
              {cv.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{e.degree}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{e.school} . {e.year}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right main */}
        <div style={{ flex: 1, padding: '32px 28px', minWidth: 0, overflow: 'hidden' }}>
          {/* Stats */}
          {cv.stats.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {cv.stats.map((s, i) => (
                <div key={i} style={{ padding: '10px 16px', background: '#f8fafc', border: '1px solid #edf1f6', borderTop: '3px solid #E05C97', borderRadius: 8, textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: '#8fa3b8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {cv.summary && (
            <div style={{ marginBottom: 22, padding: '14px 16px', background: '#fafbfd', border: '1px solid #edf1f6', borderLeft: '3px solid #6C8EF5', borderRadius: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6C8EF5', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Profile</div>
              <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div>
            </div>
          )}

          {cv.tools.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#1a2332', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Tech Stack</span><div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.tools.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: '#f0f4f8', color: '#374151', border: '1px solid #dde4ee', fontFamily: 'monospace' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {cv.experience.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#1a2332', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Experience</span><div style={{ flex: 1, height: 1, background: '#edf1f6' }} />
              </div>
              {cv.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2332' }}>{exp.role}</div>
                    <div style={{ fontSize: 10, color: '#E05C97', fontWeight: 600 }}>{exp.period}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>{exp.company}</span>
                    {exp.location && <><span>.</span><span>{exp.location}</span></>}
                    {exp.type && <span style={{ padding: '1px 6px', background: '#f0f4f8', borderRadius: 3, fontSize: 9 }}>{exp.type}</span>}
                  </div>
                  {(exp.bullets ?? []).map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#6C8EF5', fontSize: 11, marginTop: 2, flexShrink: 0 }}>+</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{b}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// -- SCALE WRAPPER (mobile preview) ------------------------------------------

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

// -- MAIN PAGE ----------------------------------------------------------------

export default function CVBuilderPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const previewRef = useRef<HTMLDivElement>(null)
  const previewAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [mobileScale, setMobileScale] = useState(1)
  const [photoUrl, setPhotoUrl] = useState('')

  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_description?: string } | null>(null)
  const [jobLabel, setJobLabel] = useState('')
  const [template, setTemplate] = useState<Template>('executive')
  const [tone, setTone] = useState<Tone>('professional')
  const [lang, setLang] = useState<Lang>('EN')
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [rawCv, setRawCv] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ template: false, style: false, output: false })
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [feedbackCount, setFeedbackCount] = useState(0)   // how many feedback calls made total (resets every 4)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [showClearCvConfirm, setShowClearCvConfirm] = useState(false)
  const [previewTab, setPreviewTab] = useState<'original' | 'generated'>('generated')
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CV_COST = CREDIT_COST.tailorCv
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)
  const [mobOpen, setMobOpen] = useState(false)
  const [skillGapOpen, setSkillGapOpen] = useState(false)
  const [skillGapData, setSkillGapData] = useState<{ matching: string[]; missing: string[] } | null>(null)
  const [skillGapLoading, setSkillGapLoading] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft, setContactDraft] = useState({ name: '', email: '', phone: '', location: '', linkedin: '' })

  function handlePhotoFile(file: File) {
    const r = new FileReader()
    r.onload = e => { const url = (e.target?.result as string) ?? ''; if (url) setPhotoUrl(url) }
    r.readAsDataURL(file)
  }

  function clearCvAndPreview() {
    setCvText('')
    setCvFileName('')
    setCvData(null)
    setRawCv('')
    setFeedback('')
    setFeedbackCount(0)
    setFeedbackError(null)
    setFeedbackSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    sessionStorage.removeItem(SS.cvbTailored)
    sessionStorage.removeItem(SS.cvbData)
    sessionStorage.removeItem(SS.cvText)
    setShowClearCvConfirm(false)
  }

  async function handleCvFile(file: File) {
    setCvFileName(file.name)
    setCvText('')
    setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => {
        const text = (e.target?.result as string) ?? ''
        setCvText(text)
        sessionStorage.setItem(SS.cvText, text)
        setFileLoading(false)
      }
      r.readAsText(file)
    } else {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) {
          setCvText(data.text)
          sessionStorage.setItem(SS.cvText, data.text)
        } else {
          alert(data.error || 'Could not read file. Try a different format.')
          setCvFileName('')
        }
      } catch { alert('Failed to read file. Please try again.'); setCvFileName('') }
      setFileLoading(false)
    }
  }

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const cv = sessionStorage.getItem(SS.sjsCvText) || sessionStorage.getItem(SS.cvText) || ''
    const jobRaw = sessionStorage.getItem(SS.cvbJob)
    const savedRole = sessionStorage.getItem(SS.sjsTargetRole) || ''
    setCvText(cv)
    if (jobRaw) {
      try {
        const parsed = JSON.parse(jobRaw)
        setJob(parsed)
        setJobLabel(`${parsed.employer_name} - ${parsed.job_title}`)
      } catch { }
    } else if (savedRole) {
      setJobLabel(savedRole)
    }
    // restore saved cv
    const saved = sessionStorage.getItem(SS.cvbTailored)
    const savedData = sessionStorage.getItem(SS.cvbData)
    if (saved) setRawCv(saved)
    if (savedData) { try { setCvData(normalizeCv(JSON.parse(savedData))) } catch { } }
  }, [])

  useEffect(() => {
    function calc() {
      if (!previewAreaRef.current) return
      const available = previewAreaRef.current.offsetWidth - 80
      setMobileScale(Math.min(1, available / 740))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  async function generate(confirmedSkills: string[] = []) {
    if (!cvText.trim()) return
    if (credits !== null && credits < CV_COST) { alert(`You need ${CV_COST} credit to build a CV. Please top up on the Account page.`); return }
    setLoading(true); setCvData(null); setRawCv('')

    try {
      const res = await fetch(API.tailorCv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, template, tone, lang, confirmedSkills, returnJson: true }),
      })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); setLoading(false); alert('Not enough credits. Please top up on the Account page.'); return }
      const data = await res.json()
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw = data.cv || data.enhanced || data.result || ''
      setRawCv(raw)
      sessionStorage.setItem(SS.cvbTailored, raw)
      try {
        const parsed = normalizeCv(JSON.parse(raw.replace(/```json|```/g, '').trim()))
        setCvData(parsed)
        setPreviewTab('generated')
        sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
      } catch { setCvData(null) }
    } catch {
      setRawCv('Failed to generate. Please try again.')
    }
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
    if (needsCrossMarket(CV_COST, MARKET.eu)) {
      setCrossWarnPending(() => runSkillGapThenGenerate)
    } else {
      runSkillGapThenGenerate()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    setApplyingFeedback(true)
    setFeedbackError(null)
    setFeedbackSuccess(false)

    // Every 4th call charges 1 credit; calls 1-3 within a bundle are free
    const isChargeCall = feedbackCount % 4 === 3

    try {
      const res = await fetch(API.tailorCv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText, job, template, tone, lang, returnJson: true,
          feedback, currentCv: rawCv,
          market: MARKET.eu,
          skipCredit: !isChargeCall,
        }),
      })

      if (res.status === 401) {
        setFeedbackError(lang === 'DE' ? 'Bitte melde dich erneut an.' : 'Session expired — please sign in again.')
        setApplyingFeedback(false)
        return
      }
      if (res.status === 402) {
        setFeedbackError(lang === 'DE' ? 'Nicht genug Credits. Du benötigst 1 Credit für die nächste Änderung.' : 'Not enough credits. You need 1 credit for this change.')
        setApplyingFeedback(false)
        return
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = (errData as { error?: string }).error || `Server error (${res.status})`
        setFeedbackError(lang === 'DE' ? `Fehler vom Server: ${msg}` : `Server error: ${msg}`)
        console.error('[applyFeedback] API error:', res.status, msg)
        setApplyingFeedback(false)
        return
      }

      const data = await res.json()
      const raw: string = data.cv || ''

      if (!raw) {
        setFeedbackError(lang === 'DE'
          ? 'Die KI hat keine Antwort zurückgegeben. Bitte versuche es erneut.'
          : 'AI returned no response. Please try again.')
        setApplyingFeedback(false)
        return
      }

      // Robust JSON extraction — Claude occasionally wraps output in markdown
      let parsed: CVData | null = null
      let parseErrMsg = ''
      try {
        let jsonStr = raw.trim()
        // Strip markdown code fences (```json … ``` or ``` … ```)
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
        // Find outermost JSON object in case of leading/trailing prose
        const jsonStart = jsonStr.indexOf('{')
        const jsonEnd   = jsonStr.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
        }
        parsed = normalizeCv(JSON.parse(jsonStr))
      } catch (e) {
        parseErrMsg = e instanceof Error ? e.message : String(e)
        console.error('[applyFeedback] JSON parse failed:', parseErrMsg, '\nRaw snippet:', raw.slice(0, 300))
      }

      if (parsed) {
        setCvData(parsed)
        sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
        setRawCv(raw)
        sessionStorage.setItem(SS.cvbTailored, raw)
        setFeedbackCount(prev => prev + 1)
        setFeedback('')
        setFeedbackSuccess(true)
        setTimeout(() => setFeedbackSuccess(false), 4000)
      } else {
        // AI processed the request but response wasn't valid JSON — tell user exactly why
        setFeedbackError(
          lang === 'DE'
            ? `Änderungen wurden verarbeitet, konnten aber nicht dargestellt werden (Parse-Fehler: ${parseErrMsg}). Versuche es mit einer anderen Formulierung oder generiere den CV neu.`
            : `Changes processed but couldn't be rendered (parse error: ${parseErrMsg}). Try rephrasing your request or regenerate the CV.`
        )
      }

    } catch (networkErr) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Unknown network error'
      setFeedbackError(lang === 'DE' ? `Verbindungsfehler: ${msg}` : `Connection error: ${msg}`)
      console.error('[applyFeedback] Network error:', networkErr)
    }

    setApplyingFeedback(false)
  }

  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

  async function downloadPDF() {
    if (!cvData || !previewRef.current) return
    setDownloading('pdf')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Render into an offscreen container — absolute avoids mobile viewport-relative positioning bugs
      const offscreen = document.createElement('div')
      offscreen.style.cssText = 'position:absolute;left:-9999px;top:0;width:740px;min-width:740px;max-width:740px;background:#fff;'
      const clone = previewRef.current.cloneNode(true) as HTMLElement
      // Strip visual chrome; pin to 740px so content can't escape and get clipped
      clone.style.cssText = 'width:740px;max-width:740px;box-sizing:border-box;overflow:visible;border-radius:0;box-shadow:none;'
      // Also constrain the template root element inside the wrapper
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
      const name = (job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')
      pdf.save(`CV_${name}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('PDF generation failed. Please try again.')
    }
    setDownloading(null)
  }

  async function downloadDOCX() {
    if (!cvData) return
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, ShadingType, TableRow, TableCell, Table, WidthType, Header } = await import('docx')

      const teal = '00A58A'
      const navy = '0d2137'
      const grey = '6b7c93'

      const sectionTitle = (text: string) => new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: navy, font: 'Calibri' })],
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dde4ee' } },
      })

      const bullet = (text: string) => new Paragraph({
        children: [
          new TextRun({ text: '+ ', color: teal, bold: true, size: 18, font: 'Calibri' }),
          new TextRun({ text, size: 18, color: '374151', font: 'Calibri' }),
        ],
        spacing: { before: 40, after: 40 },
        indent: { left: 200 },
      })

      const children: any[] = []

      // Name
      children.push(new Paragraph({
        children: [new TextRun({ text: cvData.name, bold: true, size: 48, color: navy, font: 'Calibri' })],
        spacing: { after: 60 },
      }))

      // Title
      children.push(new Paragraph({
        children: [new TextRun({ text: cvData.title, bold: true, size: 22, color: teal, font: 'Calibri' })],
        spacing: { after: 60 },
      }))

      // Contact
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: contact.join('  |  '), size: 18, color: grey, font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Stats
      if (cvData.stats?.length) {
        children.push(new Paragraph({
          children: cvData.stats.flatMap((s: { value: string; label: string }, i: number) => [
            new TextRun({ text: s.value, bold: true, size: 28, color: navy, font: 'Calibri' }),
            new TextRun({ text: ` ${s.label}`, size: 16, color: grey, font: 'Calibri' }),
            ...(i < cvData.stats.length - 1 ? [new TextRun({ text: '   |   ', size: 16, color: 'cccccc', font: 'Calibri' })] : []),
          ]),
          spacing: { after: 160 },
        }))
      }

      // Summary
      if (cvData.summary) {
        children.push(sectionTitle('Professional Summary'))
        children.push(new Paragraph({
          children: [new TextRun({ text: cvData.summary, size: 18, color: '374151', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Skills
      if (cvData.skills?.length) {
        children.push(sectionTitle('Core Skills'))
        const skillText = cvData.skills.map((s: { name: string; level: number }) => `${s.name} (${s.level}%)`).join('  .  ')
        children.push(new Paragraph({
          children: [new TextRun({ text: skillText, size: 18, color: '374151', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Tools
      if (cvData.tools?.length) {
        children.push(sectionTitle('Tech Stack'))
        children.push(new Paragraph({
          children: [new TextRun({ text: cvData.tools.join('  .  '), size: 18, color: '185FA5', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Experience
      if (cvData.experience?.length) {
        children.push(sectionTitle('Professional Experience'))
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: exp.role, bold: true, size: 22, color: navy, font: 'Calibri' }),
              new TextRun({ text: `  -  ${exp.period}`, size: 18, color: teal, font: 'Calibri' }),
            ],
            spacing: { before: 160, after: 40 },
          }))
          const meta = [exp.company, exp.location, exp.type].filter(Boolean).join('  .  ')
          children.push(new Paragraph({
            children: [new TextRun({ text: meta, size: 18, color: grey, italics: true, font: 'Calibri' })],
            spacing: { after: 60 },
          }))
          exp.bullets?.forEach((b: string) => children.push(bullet(b)))
          children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
        })
      }

      // Education
      if (cvData.education?.length) {
        children.push(sectionTitle('Education'))
        cvData.education.forEach((e: { degree: string; school: string; year: string }) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: e.degree, bold: true, size: 20, color: navy, font: 'Calibri' }),
              new TextRun({ text: `  -  ${e.school}  (${e.year})`, size: 18, color: grey, font: 'Calibri' }),
            ],
            spacing: { after: 80 },
          }))
        })
      }

      // Certifications
      if (cvData.certifications?.length) {
        children.push(sectionTitle('Certifications'))
        cvData.certifications.forEach((c: string) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: '* ', color: teal, bold: true, size: 18, font: 'Calibri' }),
              new TextRun({ text: c, size: 18, color: '374151', font: 'Calibri' }),
            ],
            spacing: { after: 60 },
          }))
        })
      }

      // Languages
      if (cvData.languages?.length) {
        children.push(sectionTitle('Languages'))
        children.push(new Paragraph({
          children: cvData.languages.flatMap((l: { name: string; level: number }, i: number) => {
            const level = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'
            return [
              new TextRun({ text: l.name, bold: true, size: 18, color: navy, font: 'Calibri' }),
              new TextRun({ text: ` (${level})`, size: 18, color: grey, font: 'Calibri' }),
              ...(i < cvData.languages.length - 1 ? [new TextRun({ text: '   .   ', size: 18, color: 'cccccc', font: 'Calibri' })] : []),
            ]
          }),
          spacing: { after: 80 },
        }))
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 900, right: 900, bottom: 900, left: 900 },
            },
          },
          children,
        }],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('DOCX error:', err)
      alert('DOCX generation failed. Please try again.')
    }
    setDownloading(null)
  }

  function goToCoverLetter() {
    sessionStorage.setItem(SS.cvbTailored, rawCv)
    router.push('/app/cover-letter')
  }

  const templates: { id: Template; label: string; accent: string; desc: string }[] = [
    { id: 'executive', label: 'Executive', accent: '#00C9A7', desc: 'Dark sidebar . teal accents' },
    { id: 'modern', label: 'Modern', accent: '#378ADD', desc: 'Navy header . blue palette' },
    { id: 'minimal', label: 'Minimal', accent: '#1a2332', desc: 'Pure typography . whitespace' },
    { id: 'technical', label: 'Technical', accent: '#E05C97', desc: 'Dark sidebar . colour accents' },
  ]

  const tones: { id: Tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Polished & credible' },
    { id: 'concise', label: 'Concise', desc: 'Sharp & efficient' },
    { id: 'detailed', label: 'Detailed', desc: 'Thorough & expansive' },
  ]

  function renderCV() {
    if (!cvData) return null
    if (template === 'executive') return <ExecutiveTemplate cv={cvData} photo={photoUrl || undefined} />
    if (template === 'modern') return <ModernTemplate cv={cvData} />
    if (template === 'minimal') return <MinimalTemplate cv={cvData} />
    if (template === 'technical') return <TechnicalTemplate cv={cvData} />
    return null
  }

  const currentAccent = templates.find(t => t.id === template)?.accent || '#00C9A7'

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@300;400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cvb-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,0.4) !important; }
        .cvb-action:hover { background: rgba(255,255,255,0.1) !important; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:4px; }
        .cv-preview { animation: fadeUp 0.35s ease; }
        .cvb-layout { display: flex; height: calc(100vh - 52px); }
        .cvb-sidebar { width: 300px; flex-shrink: 0; background: linear-gradient(180deg,#152233 0%,#0e1a28 100%); border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; overflow-y: auto; }
        .cvb-preview-area { flex: 1; overflow-y: auto; min-width: 0; }
        .cvb-mob-settings { display: none; }
        @media (max-width: 768px) {
          .cvb-layout { flex-direction: column; height: auto; min-height: calc(100vh - 52px); }
          .cvb-sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); overflow-y: visible; flex-shrink: 0; }
          .cvb-preview-area { overflow-y: visible; }
          .cvb-mob-settings { display: block; }
          .cvb-mob-hide { display: none; }
        }
      `}</style>

      <Navbar />

      {crossWarnPending && (
        <CrossMarketModal
          cost={CV_COST}
          market="eu"
          crossAmount={crossMarketAmount(CV_COST, MARKET.eu)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      {/* Confirm removing uploaded CV when a generated preview exists */}
      {showClearCvConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0e1a28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚠</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E6F1FB', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                  {lang === 'DE' ? 'Lebenslauf entfernen?' : 'Remove CV?'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  {lang === 'DE'
                    ? 'Der generierte Lebenslauf wird ebenfalls entfernt. Diese Aktion kann nicht rückgängig gemacht werden.'
                    : 'Your generated CV preview will also be removed. This cannot be undone.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearCvConfirm(false)}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                {lang === 'DE' ? 'Abbrechen' : 'Cancel'}
              </button>
              <button
                onClick={clearCvAndPreview}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                {lang === 'DE' ? 'Ja, entfernen' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cvb-layout">

        {/* -- LEFT STUDIO PANEL -- */}
        <div className="cvb-sidebar">

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/app/smart-apply')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              {'<'}- Back to Jobs
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{t.cvBuilder.sidebar.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.cvBuilder.sidebar.subtitle}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.18)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.tailorCv} credit
              </span>
            </div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: currentAccent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{t.cvBuilder.sidebar.targetJobLabel}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {!cvText ? (
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleCvFile(e.dataTransfer.files[0]) }}
                style={{ marginTop: 12, padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                {fileLoading ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: currentAccent, animation: 'spin 0.7s linear infinite' }} />
                    {t.coverLetter.sidebar.reading}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.5)" /></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{t.cvBuilder.sidebar.cvLabel}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF · DOCX · TXT</div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {cvFileName ? `✓ ${cvFileName}` : t.coverLetter.sidebar.cvLoaded}
                </span>
                <button
                  onClick={() => {
                    if (cvData) {
                      setShowClearCvConfirm(true)
                    } else {
                      setCvText(''); setCvFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>

          {/* Photo upload — executive template only */}
          {template === 'executive' && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Profile Photo <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>· Executive</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentAccent}55`, flexShrink: 0 }} />
                ) : (
                  <div onClick={() => photoInputRef.current?.click()} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 18 }}>+</div>
                )}
                <div style={{ flex: 1 }}>
                  <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: photoUrl ? currentAccent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block' }}>
                    {photoUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {photoUrl && (
                    <button onClick={() => setPhotoUrl('')} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: 'inherit' }}>Remove</button>
                  )}
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
            </div>
          )}

          {/* Accordion sections - scrollable */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* SECTION: Template */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('template')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.template ? currentAccent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.template ? currentAccent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.template ? currentAccent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.cvBuilder.sidebar.templateLabel}</span>
                  {template && <span style={{ fontSize: 10, color: currentAccent, fontWeight: 600 }}>{templates.find(t => t.id === template)?.label}</span>}
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.template ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.template && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {templates.map(t => (
                    <div key={t.id}
                      onClick={() => setTemplate(t.id)}
                      style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.09)'}`, background: template === t.id ? t.accent + '14' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Mini preview thumbnail */}
                      <div style={{ width: 38, height: 48, borderRadius: 4, background: '#1a2535', flexShrink: 0, overflow: 'hidden', border: `1px solid ${template === t.id ? t.accent + '60' : 'rgba(255,255,255,0.07)'}` }}>
                        {(t.id === 'executive' || t.id === 'technical') && (
                          <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ width: 12, background: t.accent + '25', padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent + '70', margin: '0 auto' }} />
                              {[1,2,3,4].map(i => <div key={i} style={{ height: 2, background: t.accent + '40', borderRadius: 1 }} />)}
                            </div>
                            <div style={{ flex: 1, padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
                              {[80,60,90,70,85].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />)}
                            </div>
                          </div>
                        )}
                        {t.id === 'modern' && (
                          <>
                            <div style={{ height: 12, background: 'linear-gradient(90deg, #042C53, #185FA5)' }} />
                            <div style={{ display: 'flex', height: 'calc(100% - 12px)' }}>
                              <div style={{ width: 11, background: '#f0f4f8', padding: '2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1,2,3,4].map(i => <div key={i} style={{ height: 1.5, background: '#c0cfe0', borderRadius: 1 }} />)}
                              </div>
                              <div style={{ flex: 1, padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[90,70,85,60,80].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />)}
                              </div>
                            </div>
                          </>
                        )}
                        {t.id === 'minimal' && (
                          <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.55)', borderRadius: 1, width: '65%' }} />
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.2)' }} />
                            {[80,60,90,55,75,65].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1, width: `${w}%` }} />)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === t.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.desc}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.15)'}`, background: template === t.id ? t.accent : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION: Style & Format */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? currentAccent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? currentAccent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? currentAccent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.cvBuilder.sidebar.toneLabel} & {t.cvBuilder.sidebar.languageLabel}</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Language */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.cvBuilder.sidebar.languageLabel}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lang === l ? currentAccent : 'rgba(255,255,255,0.1)'}`, background: lang === l ? currentAccent + '20' : 'rgba(255,255,255,0.04)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {l === 'EN' ? t.coverLetter.preview.english : t.coverLetter.preview.deutsch}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.cvBuilder.sidebar.toneLabel}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {tones.map(t => (
                        <div key={t.id} onClick={() => setTone(t.id)}
                          style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${tone === t.id ? currentAccent : 'rgba(255,255,255,0.08)'}`, background: tone === t.id ? currentAccent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t.desc}</div>
                          </div>
                          <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? currentAccent : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? currentAccent : 'transparent', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Generate button - pinned bottom */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && (
              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>
                {credits === 0 ? t.cvBuilder.sidebar.noCredits : t.cvBuilder.sidebar.lowCredits(credits!)}
              </div>
            )}
            <button className="cvb-gen" onClick={handleGenerate} disabled={loading || !cvText.trim() || (credits !== null && credits < CV_COST)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${currentAccent}, ${currentAccent}BB)`, color: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.25)' : '#042C53', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} /> {t.coverLetter.sidebar.writing}</>
                : credits !== null && credits < CV_COST
                ? t.coverLetter.sidebar.needCredits(CV_COST, credits)
                : cvData ? t.cvBuilder.sidebar.regenerateBtn(CV_COST) : t.cvBuilder.sidebar.generateBtn(CV_COST)}
            </button>
          </div>
        </div>

        {/* -- RIGHT PREVIEW -- */}
        <div className="cvb-preview-area" style={{ display: 'flex', flexDirection: 'column', background: '#141E2B' }}>

          {/* Action bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? currentAccent : 'rgba(255,255,255,0.25)' }}>
                {skillGapLoading ? (lang === 'DE' ? 'Analysiere Stelle...' : 'Checking job match…') : cvData ? (lang === 'DE' ? 'Lebenslauf bereit' : 'CV Ready') : (lang === 'DE' ? 'Vorschau' : 'Preview')}
              </span>
              {cvData && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {templates.find(t => t.id === template)?.label} | {lang}
                </span>
              )}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'}
                  style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'pdf' ? (lang === 'DE' ? 'Wird erstellt...' : 'Building PDF…') : 'PDF'}
                </button>
                <button onClick={goToCoverLetter}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: currentAccent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                  {t.navbar.coverLetter} →
                </button>
              </div>
            )}
          </div>

          {/* Preview canvas */}
          <div ref={previewAreaRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', justifyContent: 'center' }}>

            {/* Loading skeleton */}
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
                      {[100,85,95,70,100,80,90,65,100,75,85,60,95].map((w,i) => (
                        <div key={i} className="shimmer" style={{ height: i % 5 === 0 ? 12 : 7, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${currentAccent}40`, borderTopColor: currentAccent, animation: 'spin 0.7s linear infinite' }} />
                  {lang === 'DE' ? 'Lebenslauf wird erstellt...' : 'Generating your CV...'}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !cvData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
                <div style={{ width: 300, opacity: 0.5, position: 'relative' }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', height: 320 }}>
                      <div style={{ width: 90, background: `${currentAccent}15`, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: currentAccent + '30', margin: '0 auto 8px' }} />
                        {[80,65,75,55,80,65,70,55].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ height: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '60%' }} />
                        <div style={{ height: 6, background: currentAccent + '40', borderRadius: 2, width: '40%', marginBottom: 8 }} />
                        {[100,80,90,65,100,75,85,60,95,70].map((w,i) => <div key={i} style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 160, height: 30, background: currentAccent, borderRadius: '50%', filter: 'blur(24px)', opacity: 0.2 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                    {cvText ? (lang === 'DE' ? 'Bereit zum Erstellen' : 'Ready to generate') : (lang === 'DE' ? 'Kein Lebenslauf hochgeladen' : 'No CV uploaded')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
                    {cvText ? (lang === 'DE' ? 'Einstellungen wählen und Lebenslauf erstellen klicken' : 'Choose settings and click Generate CV') : (lang === 'DE' ? 'Lade zuerst deinen Lebenslauf hoch' : 'Upload your CV first to get started')}
                  </div>
                  {cvText && (
                    <button onClick={handleGenerate} className="cvb-gen"
                      disabled={credits !== null && credits < CV_COST}
                      style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: credits !== null && credits < CV_COST ? 'rgba(255,255,255,0.1)' : currentAccent, color: credits !== null && credits < CV_COST ? 'rgba(255,255,255,0.3)' : '#0a1520', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: credits !== null && credits < CV_COST ? 'not-allowed' : 'pointer' }}>
                      {credits !== null && credits < CV_COST ? t.coverLetter.sidebar.needCredits(CV_COST, credits) : t.cvBuilder.sidebar.generateBtn(CV_COST)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rendered CV */}
            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: mobileScale < 1 ? 740 * mobileScale : 740 }}>

                {/* Before / After tab toggle — only shown when original text is available */}
                {cvText && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
                    <button
                      onClick={() => setPreviewTab('original')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewTab === 'original' ? '#E6F1FB' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'original' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                      {lang === 'DE' ? '📄 Dein Original' : '📄 Your Original'}
                    </button>
                    <button
                      onClick={() => setPreviewTab('generated')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'generated' ? currentAccent : 'transparent', color: previewTab === 'generated' ? '#042C53' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'generated' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                      {lang === 'DE' ? '✨ Generierter Lebenslauf' : '✨ Generated CV'}
                    </button>
                  </div>
                )}

                {/* Original CV text view */}
                {previewTab === 'original' && cvText && (
                  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>📄</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>
                        {cvFileName || (lang === 'DE' ? 'Hochgeladener Lebenslauf' : 'Uploaded CV')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>
                        {lang === 'DE' ? 'Extrahierter Text' : 'Extracted text'}
                      </span>
                    </div>
                    <pre style={{ margin: 0, padding: '24px 28px', fontSize: 11.5, lineHeight: 1.75, color: '#212529', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, maxHeight: 600, overflowY: 'auto' as const }}>
                      {cvText}
                    </pre>
                  </div>
                )}

                {/* Generated CV visual preview */}
                {previewTab === 'generated' && (
                  <CVScaleWrapper scale={mobileScale}>
                    <div ref={previewRef} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                      {renderCV()}
                    </div>
                  </CVScaleWrapper>
                )}

                {/* Only show editing tools when on generated tab */}
                {previewTab === 'original' && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const }}>
                    {lang === 'DE'
                      ? '← Wechsle zu „Generierter Lebenslauf" um Änderungen anzufordern oder herunterzuladen'
                      : '← Switch to "Generated CV" to request changes or download'}
                  </div>
                )}

                {/* Contact editor, feedback widget and download actions — only on generated tab */}
                {previewTab === 'generated' && <div>

                {/* Free contact info editor */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{lang === 'DE' ? 'Kontaktdaten' : 'Contact Info'}</div>
                    <button onClick={() => {
                      if (!editingContact) setContactDraft({ name: cvData?.name || '', email: cvData?.email || '', phone: cvData?.phone || '', location: cvData?.location || '', linkedin: cvData?.linkedin || '' })
                      setEditingContact(e => !e)
                    }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${currentAccent}50`, background: 'transparent', color: currentAccent, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {editingContact ? (lang === 'DE' ? 'Abbrechen' : 'Cancel') : (lang === 'DE' ? 'Bearbeiten — kostenlos' : 'Edit — free')}
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
                      <button onClick={() => {
                        if (!cvData) return
                        const updated = { ...cvData, ...contactDraft }
                        setCvData(updated)
                        sessionStorage.setItem(SS.cvbData, JSON.stringify(updated))
                        setEditingContact(false)
                      }} style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: currentAccent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                        {lang === 'DE' ? 'Kontaktdaten speichern' : 'Save contact info'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback input */}
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{lang === 'DE' ? 'Änderungen anfordern' : 'Request changes'}</div>
                    {/* Credit counter pill */}
                    {(() => {
                      const usedInBundle = feedbackCount % 4
                      const freeLeft = 3 - usedInBundle
                      return freeLeft > 0
                        ? <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px' }}>
                            {lang === 'DE' ? `${freeLeft} gratis übrig` : `${freeLeft} free left`}
                          </div>
                        : <div style={{ fontSize: 10, fontWeight: 600, color: currentAccent, background: `${currentAccent}18`, borderRadius: 20, padding: '2px 8px' }}>
                            {lang === 'DE' ? '1 Credit für diese Änderung' : '1 credit for this change'}
                          </div>
                    })()}
                  </div>
                  <textarea
                    value={feedback}
                    onChange={e => { setFeedback(e.target.value); setFeedbackError(null) }}
                    placeholder={lang === 'DE' ? 'z.B. Mehr Führungskompetenzen hervorheben...' : 'e.g. Emphasise leadership skills, highlight promotions, add more detail to 2022 role...'}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${feedbackError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  {/* Error message */}
                  {feedbackError && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '7px 10px', lineHeight: 1.5 }}>
                      ⚠ {feedbackError}
                    </div>
                  )}
                  {/* Success message */}
                  {feedbackSuccess && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '7px 10px' }}>
                      ✓ {lang === 'DE' ? 'Änderungen wurden erfolgreich übernommen!' : 'Changes applied successfully!'}
                    </div>
                  )}
                  <button
                    onClick={applyFeedback}
                    disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? currentAccent : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback
                      ? (lang === 'DE' ? 'Wird angewendet...' : 'Applying changes…')
                      : feedbackCount % 4 === 3
                        ? (lang === 'DE' ? 'Änderungen übernehmen — 1 Credit' : 'Apply changes — 1 credit')
                        : (lang === 'DE' ? 'Änderungen übernehmen (gratis)' : 'Apply changes (free)')}
                  </button>
                  <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
                    {lang === 'DE' ? '4 Änderungen = 1 Credit' : '4 changes = 1 credit'}
                  </div>
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' as const, paddingBottom: 40 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'}
                    style={{ padding: '11px 28px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'pdf' ? (lang === 'DE' ? 'Wird erstellt...' : 'Building PDF…') : (lang === 'DE' ? 'PDF herunterladen' : 'Download PDF')}
                  </button>
                  <button onClick={goToCoverLetter}
                    style={{ padding: '11px 28px', borderRadius: 9, border: 'none', background: currentAccent, color: '#042C53', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${currentAccent}40` }}>
                    {t.navbar.coverLetter} →
                  </button>
                </div>

                </div>}{/* end previewTab === 'generated' wrapper */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Gap Modal */}
      {skillGapOpen && skillGapData && (
        <SkillGapModal
          matching={skillGapData.matching}
          missing={skillGapData.missing}
          accent={currentAccent}
          onConfirm={(confirmed) => { setSkillGapOpen(false); setSkillGapData(null); generate(confirmed) }}
          onSkip={() => { setSkillGapOpen(false); setSkillGapData(null); generate([]) }}
          onCareerScan={() => { setSkillGapOpen(false); setSkillGapData(null); router.push('/app/career-scan') }}
        />
      )}
    </div>
  )
}
