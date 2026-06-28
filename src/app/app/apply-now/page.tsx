'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'

const { colors: c, gradients: g, fonts: f } = theme

interface Job {
  job_title: string
  employer_name: string
  job_city?: string
  job_country?: string
  job_apply_link?: string
  job_employment_type?: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
  matchScore?: number
}

export default function ApplyNowPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [job, setJob] = useState<Job | null>(null)
  const [cvReady, setCvReady] = useState(false)
  const [clReady, setClReady] = useState(false)
  const [applied, setApplied] = useState(false)
  const [logged, setLogged] = useState(false)
  const [hasCv, setHasCv] = useState(false)
  const [hasCl, setHasCl] = useState(false)

  useEffect(() => {
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const cv = sessionStorage.getItem('jl_cvb_tailored') || sessionStorage.getItem('jl_sjs_cv_text') || ''
    const cl = sessionStorage.getItem('jl_cl_letter') || ''
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
    setHasCv(cv.length > 0)
    setHasCl(cl.length > 0)
  }, [])

  function saveToTracker() {
    const existing = JSON.parse(localStorage.getItem('jl_tracker') || '[]')
    localStorage.setItem('jl_tracker', JSON.stringify([{
      id: Date.now(),
      role: job?.job_title || 'Unknown Role',
      company: job?.employer_name || 'Unknown Company',
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: lang === 'DE' ? 'Via Job-Lens Jetzt bewerben' : 'Via Job-Lens Apply Now',
      source: 'Job-Lens',
    }, ...existing]))
    setLogged(true)
    setTimeout(() => router.push('/app/tracker'), 800)
  }

  const salary = job?.job_min_salary && job?.job_max_salary
    ? `${job.job_salary_currency || 'EUR'} ${Math.round(job.job_min_salary / 1000)}–${Math.round(job.job_max_salary / 1000)}k`
    : null
  const location = [job?.job_city, job?.job_country].filter(Boolean).join(', ')

  const checklist = [
    {
      id: 'cv',
      done: cvReady,
      toggle: () => setCvReady(p => !p),
      label: lang === 'DE' ? 'Lebenslauf heruntergeladen' : 'CV downloaded',
      desc: hasCv
        ? (lang === 'DE' ? 'Angepasster Lebenslauf im CV Builder erstellt' : 'Tailored CV built in CV Builder')
        : (lang === 'DE' ? 'Gehe zum CV Builder, um deinen Lebenslauf zu erstellen' : 'Go to CV Builder to create your CV first'),
      action: !hasCv ? () => router.push('/app/cv-builder') : null,
      actionLabel: lang === 'DE' ? 'Zum CV Builder →' : 'Go to CV Builder →',
    },
    {
      id: 'cl',
      done: clReady,
      toggle: () => setClReady(p => !p),
      label: lang === 'DE' ? 'Anschreiben heruntergeladen' : 'Cover letter downloaded',
      desc: hasCl
        ? (lang === 'DE' ? 'Anschreiben im Anschreiben-Builder verfasst' : 'Cover letter written in Cover Letter')
        : (lang === 'DE' ? 'Gehe zum Anschreiben-Builder, um deines zu verfassen' : 'Go to Cover Letter to write yours first'),
      action: !hasCl ? () => router.push('/app/cover-letter') : null,
      actionLabel: lang === 'DE' ? 'Zum Anschreiben-Builder →' : 'Go to Cover Letter →',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>
      <Navbar />

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{lang === 'DE' ? 'Bereit zur Bewerbung?' : 'Ready to apply?'}</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>{lang === 'DE' ? 'Hake deine Unterlagen ab und öffne dann die Stellenanzeige.' : 'Tick off your documents, then open the job listing.'}</div>
        </div>

        {/* Job banner */}
        {job ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{job.job_title}</div>
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{job.employer_name}{location ? ` · ${location}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {job.job_employment_type && <span style={{ fontSize: 11, background: c.primaryLight, color: c.navy, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{job.job_employment_type}</span>}
              {salary && <span style={{ fontSize: 11, background: c.bg, color: c.textMuted, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{salary}</span>}
              {job.matchScore && <span style={{ fontSize: 11, background: c.successLight, color: c.success, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>{job.matchScore}% match</span>}
            </div>
          </div>
        ) : (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: c.textFaint }}>
              {lang === 'DE' ? 'Kein Job ausgewählt. Gehe zur ' : 'No job selected. Go to '}
              <strong style={{ color: c.primary, cursor: 'pointer' }} onClick={() => router.push('/app/smart-apply')}>
                {lang === 'DE' ? 'Intelligenten Jobsuche' : 'Smart Job Search'}
              </strong>{' '}
              {lang === 'DE' ? 'um zuerst einen Job zu finden.' : 'to find a job first.'}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 4 }}>{lang === 'DE' ? 'Vor der Bewerbung' : 'Before you apply'}</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 16 }}>
            {lang === 'DE' ? 'Hake jeden Punkt ab, sobald du deine Unterlagen aus CV Builder und Anschreiben-Builder heruntergeladen hast.' : 'Tick each item once you\'ve downloaded your documents from CV Builder and Cover Letter.'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={item.toggle}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: item.done ? c.successLight : c.bgSubtle, border: `1px solid ${item.done ? c.successBorder : c.border}`, transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${item.done ? c.success : c.borderLight}`, background: item.done ? c.success : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                  {item.done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>&#10003;</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.done ? '#0F6E56' : c.primary }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: item.done ? c.success : c.textMuted, marginTop: 2 }}>{item.desc}</div>
                </div>
                {item.action && !item.done && (
                  <button
                    onClick={e => { e.stopPropagation(); item.action!() }}
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, background: c.primaryLight, color: c.navy, border: 'none', cursor: 'pointer', fontFamily: f.heading, fontWeight: 600, flexShrink: 0 }}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Apply card */}
        <div style={{ background: c.bgCard, border: `1px solid ${applied ? c.accent : c.border}`, borderRadius: 14, padding: '20px', transition: 'border-color 0.3s' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 4 }}>{lang === 'DE' ? 'Jetzt bewerben' : 'Now go apply'}</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 18 }}>
            {lang === 'DE' ? 'Öffne die Stellenanzeige, lade deine Unterlagen hoch und klicke auf Einreichen. Komm danach zurück, um deine Bewerbung zu speichern.' : 'Open the job listing, upload your documents, and hit submit. Come back to save your application once you\'re done.'}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {job?.job_apply_link ? (
              <a
                href={job.job_apply_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setApplied(true)}
                style={{ padding: '11px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', textDecoration: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}
              >
                {lang === 'DE' ? 'Stellenanzeige öffnen →' : 'Open job listing →'}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: c.textFaint }}>{lang === 'DE' ? 'Kein Link für diesen Job gespeichert.' : 'No link saved for this job.'}</div>
            )}
            <button
              onClick={saveToTracker}
              disabled={!applied || logged}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700, transition: 'all 0.2s', cursor: (applied && !logged) ? 'pointer' : 'not-allowed', background: logged ? c.success : applied ? g.successBtn : c.border, color: (applied || logged) ? '#fff' : c.textFaint }}
            >
              {logged ? (lang === 'DE' ? '✓ In meinen Bewerbungen gespeichert' : '✓ Saved to my applications') : (lang === 'DE' ? 'In meinen Bewerbungen speichern →' : 'Save to my applications →')}
            </button>
          </div>
          {!applied && (
            <div style={{ fontSize: 12, color: c.textFaint, marginTop: 10 }}>
              {lang === 'DE' ? 'Öffne zuerst die Stellenanzeige, dann speichere deine Bewerbung.' : 'Open the listing first, then save your application.'}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
