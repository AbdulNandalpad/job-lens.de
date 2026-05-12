'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

type Template = 'executive' | 'modern' | 'minimal' | 'technical'
type Tone = 'professional' | 'concise' | 'detailed'
type Pages = '1' | '2'
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

// -- TEMPLATE RENDERERS ------------------------------------------------------

function ExecutiveTemplate({ cv }: { cv: CVData }) {
  return (
    <div style={{ display: 'flex', minHeight: 900, fontFamily: "'DM Sans', sans-serif", background: '#fff' }}>
      {/* Dark sidebar */}
      <div style={{ width: 240, background: 'linear-gradient(170deg, #0d2137 0%, #0a3d2e 100%)', flexShrink: 0, padding: '36px 22px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Avatar initials */}
        <div style={{ textAlign: 'center', paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #0a8f72)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 auto 14px', letterSpacing: 1 }}>
            {cv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
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
      <div style={{ flex: 1, padding: '36px 32px' }}>
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
                  {exp.bullets.map((b, j) => (
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
        <div style={{ flex: 1, padding: '28px 28px' }}>
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
                  {exp.bullets.map((b, j) => (
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
                  {exp.bullets.map((b, j) => (
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
        <div style={{ flex: 1, padding: '32px 28px' }}>
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
                  {exp.bullets.map((b, j) => (
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

// -- MAIN PAGE ----------------------------------------------------------------

export default function CVBuilderPage() {
  const router = useRouter()
  const previewRef = useRef<HTMLDivElement>(null)

  const [cvText, setCvText] = useState('')
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_description?: string } | null>(null)
  const [jobLabel, setJobLabel] = useState('')
  const [template, setTemplate] = useState<Template>('executive')
  const [tone, setTone] = useState<Tone>('professional')
  const [pages, setPages] = useState<Pages>('1')
  const [lang, setLang] = useState<Lang>('EN')
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [rawCv, setRawCv] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ template: true, style: true, output: false })
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const cv = sessionStorage.getItem('jl_sjs_cv_text') || sessionStorage.getItem('jl_cv_text') || ''
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const savedRole = sessionStorage.getItem('jl_sjs_target_role') || ''
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
    const saved = sessionStorage.getItem('jl_cvb_tailored')
    const savedData = sessionStorage.getItem('jl_cvb_data')
    if (saved) setRawCv(saved)
    if (savedData) { try { setCvData(JSON.parse(savedData)) } catch { } }
  }, [])

  async function generate() {
    if (!cvText.trim()) return
    setLoading(true); setCvData(null); setRawCv('')

    const systemPrompt = `You are an elite CV designer and career consultant. Your job is to extract, enhance and structure CV information into a rich JSON object for visual rendering.

Return ONLY valid JSON - no markdown, no backticks, no preamble. 

The JSON must follow this exact schema:
{
  "name": "Full Name",
  "title": "Job Title / Professional Headline",
  "tagline": "Brief role descriptor line (optional)",
  "email": "email",
  "phone": "phone",
  "location": "City, Country",
  "linkedin": "linkedin url or handle",
  "summary": "3-4 sentence professional summary, polished and compelling",
  "stats": [{"value": "15+", "label": "Years Experience"}, ...],
  "skills": [{"name": "Skill Name", "level": 90}, ...],
  "experience": [{
    "role": "Job Title",
    "company": "Company Name",
    "period": "MMM YYYY - MMM YYYY",
    "location": "City, Country",
    "type": "Full-time / Remote / etc",
    "bullets": ["Achievement or responsibility..."]
  }],
  "education": [{"degree": "...", "school": "...", "year": "YYYY"}],
  "certifications": ["Full cert name"],
  "languages": [{"name": "Language", "level": 90}],
  "tools": ["Tool1", "Tool2", ...],
  "highlights": ["Short highlight bullet", ...]
}

Rules:
- stats: 3-5 impressive metrics (years exp, projects, certifications, industries etc)
- skills: max 8, each with a percentage level 60-99
- languages: level is percentage (native=98, fluent=85, good=65, basic=45)
- experience bullets: 2-4 strong achievement-focused bullets per role, start with action verbs
- tools: flat list of 8-15 specific technologies/tools/platforms
- highlights: 4-6 short punchy career highlights
- tone: ${tone}, language: ${lang}, pages target: ${pages}
${job ? `- Tailor specifically for this role: ${job.job_title} at ${job.employer_name}` : ''}
${job?.job_description ? `- Job context: ${job.job_description.slice(0, 800)}` : ''}`

    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          job,
          template,
          tone,
          pages,
          lang,
          systemPrompt,
          returnJson: true,
        }),
      })
      const data = await res.json()
      const raw = data.cv || data.enhanced || data.result || ''
      setRawCv(raw)
      sessionStorage.setItem('jl_cvb_tailored', raw)

      // Try to parse as JSON for visual render
      try {
        const clean = raw.replace(/```json|```/g, '').trim()
        const parsed: CVData = JSON.parse(clean)
        setCvData(parsed)
        sessionStorage.setItem('jl_cvb_data', JSON.stringify(parsed))
      } catch {
        // Fallback: show raw text
        setCvData(null)
      }
    } catch {
      setRawCv('Failed to generate. Please try again.')
    }
    setLoading(false)
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    setApplyingFeedback(true)

    const systemPrompt = `You are an elite CV designer. The user has requested changes to their CV. Apply the feedback and return updated JSON matching the same schema. Return ONLY valid JSON, no markdown.`

    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, template, tone, pages, lang, systemPrompt, returnJson: true, feedback, currentCv: rawCv }),
      })
      if (res.status === 402) { alert('Not enough credits to apply changes.'); setApplyingFeedback(false); return }
      const data = await res.json()
      const raw = data.cv || ''
      setRawCv(raw)
      sessionStorage.setItem('jl_cvb_tailored', raw)
      try {
        const clean = raw.replace(/```json|```/g, '').trim()
        const parsed: CVData = JSON.parse(clean)
        setCvData(parsed)
        sessionStorage.setItem('jl_cvb_data', JSON.stringify(parsed))
      } catch { /* keep existing */ }
      setFeedback('')
    } catch { /* silent */ }
    setApplyingFeedback(false)
  }

  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

  async function downloadPDF() {
    if (!cvData) return
    setDownloading('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const margin = 18
      const colLeft = 58 // sidebar width
      let y = 0

      const hex2rgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return { r, g, b }
      }

      // -- Sidebar background --------------------------------------------------
      doc.setFillColor(13, 33, 55)
      doc.rect(0, 0, colLeft, 297, 'F')

      // -- Sidebar: avatar circle ----------------------------------------------
      doc.setFillColor(0, 165, 138)
      doc.circle(colLeft / 2, 22, 10, 'F')
      const initials = cvData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text(initials, colLeft / 2, 25, { align: 'center' })

      // -- Sidebar: name + title -----------------------------------------------
      y = 37
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const nameLines = doc.splitTextToSize(cvData.name, colLeft - 8)
      doc.text(nameLines, colLeft / 2, y, { align: 'center' })
      y += nameLines.length * 4 + 2

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 201, 167)
      const titleLines = doc.splitTextToSize(cvData.title, colLeft - 8)
      doc.text(titleLines, colLeft / 2, y, { align: 'center' })
      y += titleLines.length * 3.5 + 6

      // divider
      doc.setDrawColor(255, 255, 255, 0.15)
      doc.setLineWidth(0.2)
      doc.line(4, y, colLeft - 4, y)
      y += 5

      const sideLabel = (text: string) => {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(130, 160, 190)
        doc.text(text.toUpperCase(), 5, y)
        y += 4
      }

      const sideText = (text: string, color = [200, 215, 230]) => {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(text, colLeft - 10)
        doc.text(lines, 5, y)
        y += lines.length * 3.5 + 1
      }

      // Contact
      sideLabel('Contact')
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      contact.forEach((v: string) => sideText(v))
      y += 3

      // Skills
      if (cvData.skills?.length) {
        sideLabel('Skills')
        cvData.skills.forEach((s: { name: string; level: number }) => {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(200, 215, 230)
          doc.text(s.name, 5, y)
          doc.setTextColor(0, 201, 167)
          doc.text(`${s.level}%`, colLeft - 5, y, { align: 'right' })
          y += 3
          // bar bg
          doc.setFillColor(255, 255, 255, 0.1)
          doc.setFillColor(40, 60, 80)
          doc.rect(5, y, colLeft - 10, 2, 'F')
          // bar fill
          doc.setFillColor(0, 165, 138)
          doc.rect(5, y, (colLeft - 10) * s.level / 100, 2, 'F')
          y += 4.5
        })
        y += 2
      }

      // Languages
      if (cvData.languages?.length) {
        sideLabel('Languages')
        cvData.languages.forEach((l: { name: string; level: number }) => {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(200, 215, 230)
          doc.text(l.name, 5, y)
          const dots = Math.round(l.level / 20)
          for (let d = 0; d < 5; d++) {
            doc.setFillColor(d < dots ? 0 : 40, d < dots ? 165 : 60, d < dots ? 138 : 80)
            doc.circle(colLeft - 18 + d * 4, y - 1, 1.2, 'F')
          }
          y += 4
        })
        y += 2
      }

      // Certifications
      if (cvData.certifications?.length) {
        sideLabel('Certifications')
        cvData.certifications.forEach((c: string) => {
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 200, 220)
          const lines = doc.splitTextToSize(`* ${c}`, colLeft - 10)
          doc.text(lines, 5, y)
          y += lines.length * 3.5 + 1
        })
        y += 2
      }

      // Highlights
      if (cvData.highlights?.length) {
        sideLabel('Highlights')
        cvData.highlights.forEach((h: string) => {
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(160, 185, 210)
          const lines = doc.splitTextToSize(`> ${h}`, colLeft - 10)
          doc.text(lines, 5, y)
          y += lines.length * 3.5 + 1
        })
      }

      // -- Main content area --------------------------------------------------
      const mx = colLeft + 8  // main x start
      const mw = W - mx - margin  // main content width
      let my = 14

      // Name + title header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(13, 33, 55)
      doc.text(cvData.name, mx, my)
      my += 7

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 165, 138)
      doc.text((cvData.title || '').toUpperCase(), mx, my)
      my += 5

      // divider
      doc.setDrawColor(220, 230, 240)
      doc.setLineWidth(0.4)
      doc.line(mx, my, W - margin, my)
      my += 5

      // Stats row
      if (cvData.stats?.length) {
        const sw = mw / cvData.stats.length
        cvData.stats.forEach((s: { value: string; label: string }, i: number) => {
          const sx = mx + i * sw + sw / 2
          doc.setFontSize(13)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(13, 33, 55)
          doc.text(s.value, sx, my + 5, { align: 'center' })
          doc.setFontSize(6)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(130, 150, 170)
          doc.text(s.label, sx, my + 9, { align: 'center' })
        })
        my += 16

        doc.setDrawColor(220, 230, 240)
        doc.setLineWidth(0.3)
        doc.line(mx, my, W - margin, my)
        my += 5
      }

      const mainSection = (title: string) => {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(13, 33, 55)
        doc.text(title.toUpperCase(), mx, my)
        doc.setDrawColor(220, 230, 240)
        doc.setLineWidth(0.3)
        doc.line(mx + doc.getTextWidth(title.toUpperCase()) + 3, my - 1, W - margin, my - 1)
        my += 5
      }

      // Summary
      if (cvData.summary) {
        mainSection('Professional Summary')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(55, 65, 81)
        const lines = doc.splitTextToSize(cvData.summary, mw)
        doc.text(lines, mx, my)
        my += lines.length * 4 + 5
      }

      // Tools
      if (cvData.tools?.length) {
        mainSection('Core Stack')
        const toolText = cvData.tools.join('  .  ')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(24, 95, 165)
        const lines = doc.splitTextToSize(toolText, mw)
        doc.text(lines, mx, my)
        my += lines.length * 4 + 5
      }

      // Experience
      if (cvData.experience?.length) {
        mainSection('Professional Experience')
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          if (my > 260) { doc.addPage(); my = 14 }
          // dot
          doc.setFillColor(0, 165, 138)
          doc.circle(mx - 3, my - 1, 1.5, 'F')
          // role + period
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(13, 33, 55)
          doc.text(exp.role, mx, my)
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 165, 138)
          doc.text(exp.period || '', W - margin, my, { align: 'right' })
          my += 4
          // company
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(107, 124, 147)
          const meta = [exp.company, exp.location, exp.type].filter(Boolean).join('  .  ')
          doc.text(meta, mx, my)
          my += 4
          // bullets
          exp.bullets?.forEach((b: string) => {
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(55, 65, 81)
            doc.setTextColor(29, 158, 117)
            doc.text('+', mx, my)
            doc.setTextColor(55, 65, 81)
            const lines = doc.splitTextToSize(b, mw - 6)
            doc.text(lines, mx + 5, my)
            my += lines.length * 3.8
          })
          my += 4
          // connector line
          doc.setDrawColor(230, 235, 242)
          doc.setLineWidth(0.2)
          doc.line(mx - 3, my - 3, mx - 3, my + 2)
        })
      }

      // Education
      if (cvData.education?.length) {
        if (my > 250) { doc.addPage(); my = 14 }
        mainSection('Education')
        cvData.education.forEach((e: { degree: string; school: string; year: string }) => {
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(13, 33, 55)
          doc.text(e.degree, mx, my)
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(107, 124, 147)
          doc.text(`${e.school}  .  ${e.year}`, mx, my + 3.5)
          my += 8
        })
      }

      const filename = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      doc.save(filename)
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
    sessionStorage.setItem('jl_cvb_tailored', rawCv)
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
    if (template === 'executive') return <ExecutiveTemplate cv={cvData} />
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
      `}</style>

      <Navbar />

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* -- LEFT STUDIO PANEL -- */}
        <div style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #042C53 0%, #073d6e 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/app/smart-apply')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              {'<'}- Back to Jobs
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>CV Studio</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Design your perfect CV</div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: currentAccent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Tailoring for</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
              </div>
            )}
            {!cvText && (
              <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 8, fontSize: 10, color: '#F5A623' }}>
                ! No CV found - upload in Smart Job Search first
              </div>
            )}
          </div>

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
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>Template</span>
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>Style & Format</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Language */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Language</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lang === l ? currentAccent : 'rgba(255,255,255,0.1)'}`, background: lang === l ? currentAccent + '20' : 'rgba(255,255,255,0.04)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {l === 'EN' ? 'English' : 'Deutsch'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Tone</div>
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

                  {/* Length */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Length</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['1', '2'] as Pages[]).map(p => (
                        <button key={p} onClick={() => setPages(p)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${pages === p ? currentAccent : 'rgba(255,255,255,0.1)'}`, background: pages === p ? currentAccent + '20' : 'rgba(255,255,255,0.04)', color: pages === p ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: pages === p ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {p === '1' ? '1 Page' : '2 Pages'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: Output / Summary */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('output')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.output ? currentAccent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.output ? currentAccent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.output ? currentAccent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>03</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.output ? '#fff' : 'rgba(255,255,255,0.55)' }}>Summary</span>
                  {cvData && <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600 }}>Ready</span>}
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.output ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.output && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Template', value: templates.find(t => t.id === template)?.label || '-' },
                    { label: 'Language', value: lang === 'EN' ? 'English' : 'Deutsch' },
                    { label: 'Tone', value: tones.find(t => t.id === tone)?.label || '-' },
                    { label: 'Length', value: `${pages} page${pages === '2' ? 's' : ''}` },
                    ...(cvData ? [
                      { label: 'Skills', value: `${cvData.skills.length} items` },
                      { label: 'Roles', value: `${cvData.experience.length} roles` },
                      { label: 'Tools', value: `${cvData.tools.length} items` },
                    ] : []),
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: currentAccent }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Generate button - pinned bottom */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button className="cvb-gen" onClick={generate} disabled={loading || !cvText.trim()}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${currentAccent}, ${currentAccent}BB)`, color: loading || !cvText.trim() ? 'rgba(255,255,255,0.25)' : '#042C53', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} /> Generating...</>
                : cvData ? 'Regenerate CV' : 'Generate CV'}
            </button>
          </div>
        </div>

        {/* -- RIGHT PREVIEW -- */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', overflow: 'hidden' }}>

          {/* Action bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#042C53', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? currentAccent : 'rgba(255,255,255,0.25)' }}>
                {cvData ? 'CV Ready' : 'Preview'}
              </span>
              {cvData && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {templates.find(t => t.id === template)?.label} | {lang} | {pages}p
                </span>
              )}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'pdf' ? 'Building...' : 'PDF'}
                </button>
                <button className="cvb-action" onClick={downloadDOCX} disabled={downloading === 'docx'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? currentAccent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'docx' ? 'Building...' : 'Word'}
                </button>
                <button onClick={goToCoverLetter}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: currentAccent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                  Cover Letter {'->'}
                </button>
              </div>
            )}
          </div>

          {/* Preview canvas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', justifyContent: 'center' }}>

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
                  Designing your CV...
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
                    {cvText ? 'Ready to design' : 'No CV uploaded'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
                    {cvText ? 'Choose your template and click Generate CV' : 'Go back to Smart Job Search and upload your CV first'}
                  </div>
                  {cvText && (
                    <button onClick={generate} className="cvb-gen"
                      style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: currentAccent, color: '#0a1520', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Generate CV
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rendered CV */}
            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>
                <div ref={previewRef} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                  {renderCV()}
                </div>

                {/* Feedback input */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>Request changes</div>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="e.g. Make the summary shorter, add more focus on leadership, switch to German…"
                    rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <button
                    onClick={applyFeedback}
                    disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? currentAccent : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying…' : 'Apply changes — 1 credit'}
                  </button>
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 32 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}
                  </button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? currentAccent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'docx' ? 'Building Word...' : 'Download Word'}
                  </button>
                  <button onClick={goToCoverLetter}
                    style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: currentAccent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${currentAccent}40` }}>
                    Write Cover Letter {'->'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
