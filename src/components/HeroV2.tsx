'use client'
import React from 'react'
import { theme } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'

const { colors: c, fonts: f } = theme

interface HeroV2Props {
  market: 'eu' | 'in'
  lang?: 'DE' | 'EN'
  autoApplyHref: string
  kiraHref: string
}

const copy = {
  eu: {
    DE: {
      eyebrow: 'DACH-Markt · KI-Bewerbungsassistent',
      h1a: 'Schluss mit copy-paste.',
      h1b: 'Kira füllt dein Bewerbungsformular.',
      sub: 'Füge eine Bewerbungs-URL ein — Workday, Greenhouse, Lever oder jedes direkte Portal. Kira öffnet die Seite, liest das Formular, ordnet deinen Lebenslauf zu und füllt alle Felder. Du siehst eine Vorschau und bestätigst, bevor etwas abgesendet wird.',
      steps: [
        { icon: 'document' as const,     label: 'Lebenslauf hochladen',   hint: 'PDF, DOCX oder Text' },
        { icon: 'rocket'   as const,     label: 'Job-URL einfügen',       hint: 'Greenhouse, Workday, Lever …' },
        { icon: 'check-circle' as const, label: 'Vorschau & Absenden',    hint: 'Du prüfst, Kira sendet ab' },
      ],
      cta1: 'Auto Apply testen →',
      cta2: 'Mit Kira chatten',
      trust: '5 kostenlose Credits · Keine Karte · Lebenslauf wird nicht gespeichert',
    },
    EN: {
      eyebrow: 'DACH Market · AI Job Application Assistant',
      h1a: 'Stop copy-pasting.',
      h1b: 'Kira fills your job application.',
      sub: 'Paste any job URL — Workday, Greenhouse, Lever, or any direct portal. Kira reads the form, maps your CV, and fills every field. You see a preview and confirm before it submits.',
      steps: [
        { icon: 'document' as const,     label: 'Upload your CV',    hint: 'PDF, DOCX or paste text' },
        { icon: 'rocket'   as const,     label: 'Paste job URL',     hint: 'Greenhouse, Workday, Lever …' },
        { icon: 'check-circle' as const, label: 'Review & submit',   hint: 'You confirm, Kira submits' },
      ],
      cta1: 'Try Auto Apply →',
      cta2: 'Chat with Kira',
      trust: '5 free credits · No card needed · CV not stored',
    },
  },
  in: {
    EN: {
      eyebrow: 'Built for India · Naukri · LinkedIn · Company Portals',
      h1a: 'Stop filling the same details',
      h1b: 'into every job portal.',
      sub: 'Paste any Naukri, LinkedIn, or company portal URL. Kira reads the form, fills CTC, notice period, skills — everything from your profile. You review the pre-filled form, then confirm.',
      steps: [
        { icon: 'document' as const,     label: 'Upload Resume',      hint: 'PDF, DOCX or paste text' },
        { icon: 'rocket'   as const,     label: 'Paste Portal URL',   hint: 'Naukri, Infosys, TCS, Wipro …' },
        { icon: 'check-circle' as const, label: 'Review & submit',    hint: 'You confirm, Kira submits' },
      ],
      cta1: 'Try Auto Apply →',
      cta2: 'Chat with Kira',
      trust: '5 free credits · No card needed · Resume not stored',
    },
  },
} as const

const ACCENT_EU = '#378ADD'
const ACCENT_IN = '#FF9933'

export default function HeroV2({ market, lang = 'EN', autoApplyHref, kiraHref }: HeroV2Props) {
  const accent = market === 'in' ? ACCENT_IN : ACCENT_EU
  const t = market === 'in'
    ? copy.in.EN
    : (lang === 'DE' ? copy.eu.DE : copy.eu.EN)

  const stepBg  = market === 'in' ? 'rgba(255,153,51,0.08)'  : 'rgba(55,138,221,0.08)'
  const stepBdr = market === 'in' ? 'rgba(255,153,51,0.22)'  : 'rgba(55,138,221,0.22)'
  const tagBg   = market === 'in' ? 'rgba(255,153,51,0.12)'  : 'rgba(55,138,221,0.12)'
  const tagBdr  = market === 'in' ? 'rgba(255,153,51,0.28)'  : 'rgba(55,138,221,0.28)'

  return (
    <section style={{
      background: 'linear-gradient(170deg, #0b1929 0%, #091421 60%, #070f1a 100%)',
      padding: '72px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        .hv2-wrap  { max-width: 820px; margin: 0 auto; text-align: center; }
        .hv2-steps { display: flex; align-items: stretch; gap: 0; margin: 44px 0 40px; }
        .hv2-step  { flex: 1; display: flex; flex-direction: column; align-items: center;
                     gap: 10; padding: 22px 16px; background: ${stepBg};
                     border: 1px solid ${stepBdr}; border-radius: 14px; }
        .hv2-arrow { display: flex; align-items: center; padding: 0 10px; color: rgba(255,255,255,0.2);
                     font-size: 20px; flex-shrink: 0; }
        .hv2-ctas  { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        @media(max-width: 640px) {
          .hv2-steps { flex-direction: column; }
          .hv2-arrow { transform: rotate(90deg); padding: 4px 0; justify-content: center; }
          .hv2-step  { flex-direction: row; text-align: left; padding: 16px; gap: 14px; }
        }
      `}</style>

      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="hv2-wrap">

        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: tagBg, border: `1px solid ${tagBdr}`,
          borderRadius: 20, padding: '5px 16px', marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 0.6, textTransform: 'uppercase' as const }}>
            {t.eyebrow}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: f.heading,
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.15,
          margin: '0 0 20px',
          letterSpacing: -0.5,
        }}>
          {t.h1a}<br />
          <span style={{ color: accent }}>{t.h1b}</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(14px, 2vw, 16px)',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.7,
          margin: '0 auto 8px',
          maxWidth: 640,
        }}>
          {t.sub}
        </p>

        {/* 3-step flow */}
        <div className="hv2-steps">
          {t.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="hv2-step">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${accent}20`, border: `1px solid ${accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SvgIcon name={step.icon} size={22} color={accent} />
                </div>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    marginBottom: 3, fontFamily: f.heading,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: accent,
                      marginRight: 6, letterSpacing: 0.4,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {step.hint}
                  </div>
                </div>
              </div>
              {i < t.steps.length - 1 && (
                <div className="hv2-arrow">›</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CTAs */}
        <div className="hv2-ctas">
          <a
            href={autoApplyHref}
            style={{
              display: 'inline-block',
              padding: '13px 32px',
              borderRadius: 11,
              background: market === 'in'
                ? 'linear-gradient(135deg, #FF9933, #e07a1a)'
                : 'linear-gradient(135deg, #378ADD, #185FA5)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              fontFamily: f.heading,
              boxShadow: `0 8px 28px ${accent}38`,
              transition: 'opacity 0.15s',
            }}
          >
            {t.cta1}
          </a>
          <a
            href={kiraHref}
            style={{
              display: 'inline-block',
              padding: '13px 28px',
              borderRadius: 11,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              fontFamily: f.heading,
            }}
          >
            {t.cta2}
          </a>
        </div>

        {/* Trust line */}
        <p style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.28)',
          margin: '20px 0 0',
          letterSpacing: 0.2,
        }}>
          {t.trust}
        </p>

      </div>
    </section>
  )
}
