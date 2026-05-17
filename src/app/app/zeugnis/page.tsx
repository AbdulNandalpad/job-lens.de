'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'

const blue   = '#378ADD'
const navy   = '#042C53'
const green  = '#1D9E75'
const red    = '#E24B4A'
const orange = '#f59e0b'

interface ZeugnisPhrase {
  original: string
  decoded: string
  rating: 'positive' | 'neutral' | 'negative' | 'very_negative'
  tip?: string
}

interface ZeugnisResult {
  employeeName: string
  employerName: string
  jobTitle: string
  employmentEnd: string
  overallGrade: number
  gradeLabel: string
  gradeColor: 'green' | 'blue' | 'yellow' | 'orange' | 'red'
  summary: string
  phrases: ZeugnisPhrase[]
  redFlags: string[]
  missingPhrases: string[]
  correctionGrounds?: string
  creditsRemaining: number
}

const GRADE_COLORS: Record<string, string> = {
  green: green, blue: blue, yellow: orange, orange: '#e67e22', red: red,
}
const RATING_CONFIG = {
  positive:      { color: green,  bg: '#1D9E7515', label: '✓ Positiv'       },
  neutral:       { color: blue,   bg: '#378ADD15', label: '→ Neutral'        },
  negative:      { color: orange, bg: '#f59e0b15', label: '⚠ Negativ'        },
  very_negative: { color: red,    bg: '#E24B4A15', label: '✗ Sehr negativ'   },
}

// ── Letter templates ────────────────────────────────────────────────────────
function buildRequestLetter(f: RequestForm): string {
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  return `${f.yourName}
${f.yourAddress || '[Ihre Adresse]'}

${f.hrName ? f.hrName : 'Personalabteilung'}
${f.companyName}
${f.companyAddress || '[Adresse des Unternehmens]'}

${today}

Betreff: Anforderung eines qualifizierten Arbeitszeugnisses

Sehr ${f.hrName ? `geehrte/r ${f.hrName}` : 'geehrte Damen und Herren'},

ich war bis zum ${f.lastDay || '[letzter Arbeitstag]'} als ${f.jobTitle || '[Ihre Position]'} in Ihrem Unternehmen tätig und bitte Sie gemäß § 109 GewO höflich um die Ausstellung eines qualifizierten Arbeitszeugnisses.

Das qualifizierte Arbeitszeugnis sollte folgende Angaben enthalten:
- Art und Dauer der Beschäftigung
- Aufgaben und Tätigkeiten
- Leistungsbeurteilung
- Sozialverhalten und Führungsverhalten (soweit zutreffend)
- Schlussformel mit Dank und guten Wünschen

Ich bitte Sie, das Zeugnis innerhalb von zwei Wochen an meine oben genannte Adresse zu übersenden.

Für Rückfragen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,

${f.yourName}`
}

function buildCorrectionLetter(f: RequestForm, flaggedPhrases: string[], correctionGrounds?: string): string {
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  const phraseList = flaggedPhrases.map(p => `  – „${p}"`).join('\n')
  return `${f.yourName}
${f.yourAddress || '[Ihre Adresse]'}

${f.hrName ? f.hrName : 'Personalabteilung'}
${f.companyName}
${f.companyAddress || '[Adresse des Unternehmens]'}

${today}

Betreff: Bitte um Berichtigung meines Arbeitszeugnisses

Sehr ${f.hrName ? `geehrte/r ${f.hrName}` : 'geehrte Damen und Herren'},

vielen Dank für die Übersendung meines Arbeitszeugnisses vom ${f.lastDay || '[Datum des Zeugnisses]'}. Nach sorgfältiger Durchsicht muss ich leider feststellen, dass das Zeugnis in einigen Punkten nicht meiner tatsächlichen Leistung und meinem Verhalten entspricht.

Konkret bitte ich um Überprüfung und Berichtigung der folgenden Formulierungen, die in der deutschen Zeugnissprache eine unterdurchschnittliche Bewertung signalisieren:

${phraseList || '  – [bitte spezifische Formulierungen eintragen]'}

${correctionGrounds ? `Rechtliche Grundlage: ${correctionGrounds}` : 'Gemäß § 109 GewO sowie der ständigen Rechtsprechung des Bundesarbeitsgerichts (BAG) habe ich Anspruch auf ein wohlwollendes und der Wahrheit entsprechendes Zeugnis.'}

Ich bitte Sie, das Zeugnis entsprechend zu korrigieren und mir die berichtigte Fassung innerhalb von 14 Tagen zuzusenden. Sollte keine Einigung möglich sein, behalte ich mir vor, meinen Anspruch auf dem Rechtsweg geltend zu machen.

Ich bin weiterhin an einer einvernehmlichen Lösung interessiert und stehe für ein Gespräch zur Verfügung.

Mit freundlichen Grüßen,

${f.yourName}`
}

interface RequestForm {
  yourName: string
  yourAddress: string
  jobTitle: string
  companyName: string
  companyAddress: string
  hrName: string
  hrEmail: string
  lastDay: string
}

const EMPTY_FORM: RequestForm = {
  yourName: '', yourAddress: '', jobTitle: '', companyName: '',
  companyAddress: '', hrName: '', hrEmail: '', lastDay: '',
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ZeugnisPage() {
  const [tab, setTab] = useState<'decode' | 'request'>('decode')
  const [reqTab, setReqTab] = useState<'initial' | 'correction'>('initial')

  // Decode state
  const [zeugnisText, setZeugnisText] = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<ZeugnisResult | null>(null)
  const [error, setError]             = useState('')

  // Letter state
  const [form, setForm]       = useState<RequestForm>(EMPTY_FORM)
  const [letter, setLetter]   = useState('')
  const [copied, setCopied]   = useState(false)

  const f = (k: keyof RequestForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function decode() {
    if (!zeugnisText.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch('/api/zeugnis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zeugnisText }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setResult(data)
      // Pre-fill request form with whatever was extracted from the Zeugnis
      setForm(prev => ({
        ...prev,
        yourName:    data.employeeName   || prev.yourName,
        companyName: data.employerName   || prev.companyName,
        jobTitle:    data.jobTitle       || prev.jobTitle,
        lastDay:     data.employmentEnd  || prev.lastDay,
      }))
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  function generateLetter() {
    const redFlags = result?.redFlags ?? []
    const correctionGrounds = result?.correctionGrounds
    const text = reqTab === 'initial'
      ? buildRequestLetter(form)
      : buildCorrectionLetter(form, redFlags, correctionGrounds)
    setLetter(text)
  }

  function copyLetter() {
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function mailtoLink() {
    if (!form.hrEmail) return '#'
    const subject = encodeURIComponent(reqTab === 'initial'
      ? 'Anforderung qualifiziertes Arbeitszeugnis'
      : 'Bitte um Berichtigung meines Arbeitszeugnisses')
    return `mailto:${form.hrEmail}?subject=${subject}&body=${encodeURIComponent(letter)}`
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #edf1f6',
    boxShadow: '0 2px 12px rgba(4,44,83,0.06)', padding: '22px 24px', marginBottom: 16,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef',
    fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6b7c93', display: 'block',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .zt-tab { transition: all .15s; cursor: pointer; }
        .zt-tab:hover { border-color: rgba(55,138,221,0.4) !important; }
        .zt-phrase-row { border-bottom: 1px solid #f5f7fa; }
        .zt-phrase-row:last-child { border-bottom: none; }
        .zt-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) {
          .zt-input-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar />

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 16px', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${blue}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>
              Arbeitszeugnis
            </h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>
              Decode the hidden language in your German work reference — then request or correct it
            </p>
          </div>

          {/* Main tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {([['decode', '🔍 Decode Zeugnis'], ['request', '✉️ Request / Correct']] as const).map(([key, label]) => (
              <button key={key} className="zt-tab" onClick={() => setTab(key)}
                style={{ padding: '9px 20px', borderRadius: 10, border: `1.5px solid ${tab === key ? blue : '#dce4ef'}`, background: tab === key ? blue + '12' : '#fff', color: tab === key ? blue : '#6b7c93', fontSize: 13, fontWeight: tab === key ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── DECODE TAB ── */}
          {tab === 'decode' && (
            <>
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Paste your Arbeitszeugnis</div>
                <div style={{ fontSize: 12, color: '#9aafbc', marginBottom: 12 }}>Copy the full text of your Zeugnis and paste it below. AI will decode every phrase.</div>
                <textarea
                  value={zeugnisText}
                  onChange={e => setZeugnisText(e.target.value)}
                  placeholder={`Herr Mustermann war vom 01.01.2020 bis 31.12.2024 in unserem Unternehmen als Senior Developer tätig.\n\nEr hat die ihm übertragenen Aufgaben zu unserer Zufriedenheit erledigt...\n\n(paste your full Zeugnis text here)`}
                  style={{ ...inputStyle, height: 200, resize: 'vertical', lineHeight: 1.7 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#9aafbc' }}>1 credit · Decoded by Claude AI · German only</span>
                  <button onClick={decode} disabled={loading || !zeugnisText.trim()}
                    style={{ padding: '10px 28px', borderRadius: 9, background: loading || !zeugnisText.trim() ? '#ccc' : `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loading || !zeugnisText.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                    {loading ? 'Decoding...' : 'Decode Zeugnis →'}
                  </button>
                </div>
                {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: red, fontSize: 13 }}>{error}</div>}
              </div>

              {/* Results */}
              {result && (
                <>
                  {/* Overall grade card */}
                  <div style={{ ...cardStyle, borderLeft: `4px solid ${GRADE_COLORS[result.gradeColor]}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 52, fontWeight: 800, color: GRADE_COLORS[result.gradeColor], lineHeight: 1 }}>{result.overallGrade}</div>
                        <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 2 }}>/ 5</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: GRADE_COLORS[result.gradeColor], marginBottom: 4 }}>{result.gradeLabel}</div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>{result.summary}</p>
                      </div>
                      <button onClick={() => { setTab('request'); setReqTab(result.overallGrade >= 3 ? 'correction' : 'initial') }}
                        style={{ padding: '10px 18px', borderRadius: 9, background: result.overallGrade >= 3 ? `linear-gradient(135deg,${red},#c0392b)` : `linear-gradient(135deg,${green},#16a085)`, color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>
                        {result.overallGrade >= 3 ? '✉️ Request correction' : '✉️ Request Zeugnis'}
                      </button>
                    </div>
                  </div>

                  {/* Red flags */}
                  {result.redFlags.length > 0 && (
                    <div style={{ ...cardStyle, borderLeft: `4px solid ${red}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: red, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>🚩 Red Flags — phrases that actively hurt you</div>
                      {result.redFlags.map((flag, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < result.redFlags.length - 1 ? '1px solid #fef2f2' : 'none' }}>
                          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                          <span style={{ fontSize: 13, color: '#374151' }}>{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phrase breakdown */}
                  <div style={cardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>📋 Phrase-by-phrase breakdown</div>
                    {result.phrases.map((p, i) => {
                      const cfg = RATING_CONFIG[p.rating]
                      return (
                        <div key={i} className="zt-phrase-row" style={{ padding: '14px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#374151', marginBottom: 4 }}>"{p.original}"</div>
                              <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.55 }}>{p.decoded}</div>
                              {p.tip && <div style={{ fontSize: 11, color: blue, marginTop: 4 }}>💡 {p.tip}</div>}
                            </div>
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Missing phrases */}
                  {result.missingPhrases.length > 0 && (
                    <div style={{ ...cardStyle, borderLeft: `4px solid ${orange}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: orange, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>📭 Missing phrases — absent from your Zeugnis</div>
                      <p style={{ fontSize: 12, color: '#9aafbc', margin: '0 0 10px' }}>A Grade 1–2 Zeugnis would typically include these. Their absence signals a weaker reference.</p>
                      {result.missingPhrases.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < result.missingPhrases.length - 1 ? '1px solid #fef9ec' : 'none' }}>
                          <span style={{ color: orange }}>○</span>
                          <span style={{ fontSize: 13, color: '#374151' }}>{m}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Legal grounds for correction */}
                  {result.correctionGrounds && (
                    <div style={{ ...cardStyle, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 6 }}>⚖️ Legal basis for requesting a correction</div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{result.correctionGrounds}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── REQUEST TAB ── */}
          {tab === 'request' && (
            <>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {([['initial', '📄 Request Zeugnis'], ['correction', '✏️ Request Correction']] as const).map(([key, label]) => (
                  <button key={key} className="zt-tab" onClick={() => { setReqTab(key); setLetter('') }}
                    style={{ padding: '8px 18px', borderRadius: 10, border: `1.5px solid ${reqTab === key ? blue : '#dce4ef'}`, background: reqTab === key ? blue + '12' : '#fff', color: reqTab === key ? blue : '#6b7c93', fontSize: 12, fontWeight: reqTab === key ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Context banner */}
              <div style={{ padding: '12px 16px', borderRadius: 10, background: reqTab === 'correction' ? '#fff0f0' : '#f0f9ff', border: `1px solid ${reqTab === 'correction' ? '#fca5a5' : '#bae6fd'}`, marginBottom: 16, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                {reqTab === 'initial'
                  ? '📄 Use this to request your Zeugnis after leaving a job. Under § 109 GewO, your employer must provide it within a reasonable time.'
                  : `✏️ Use this if your Zeugnis contains coded negative language. ${result ? `We've pre-loaded the red flags from your decoded Zeugnis.` : 'Run the Decoder first to automatically load your flagged phrases.'}`}
              </div>

              {/* Form */}
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>Your details</div>
                <div className="zt-input-grid" style={{ marginBottom: 16 }}>
                  <div><label style={labelStyle}>Your full name *</label><input style={inputStyle} value={form.yourName} onChange={f('yourName')} placeholder="Max Mustermann" /></div>
                  <div><label style={labelStyle}>Your address</label><input style={inputStyle} value={form.yourAddress} onChange={f('yourAddress')} placeholder="Musterstraße 1, 10115 Berlin" /></div>
                  <div><label style={labelStyle}>Your job title *</label><input style={inputStyle} value={form.jobTitle} onChange={f('jobTitle')} placeholder="Senior Software Engineer" /></div>
                  <div><label style={labelStyle}>Last working day *</label><input style={inputStyle} value={form.lastDay} onChange={f('lastDay')} placeholder="31.12.2024" /></div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 12, fontFamily: "'Outfit',sans-serif" }}>Employer details</div>
                <div className="zt-input-grid" style={{ marginBottom: 16 }}>
                  <div><label style={labelStyle}>Company name *</label><input style={inputStyle} value={form.companyName} onChange={f('companyName')} placeholder="Muster GmbH" /></div>
                  <div><label style={labelStyle}>Company address</label><input style={inputStyle} value={form.companyAddress} onChange={f('companyAddress')} placeholder="Firmenstraße 10, 80333 München" /></div>
                  <div><label style={labelStyle}>HR contact name</label><input style={inputStyle} value={form.hrName} onChange={f('hrName')} placeholder="Frau Schmidt" /></div>
                  <div><label style={labelStyle}>HR email (for direct send)</label><input style={inputStyle} value={form.hrEmail} onChange={f('hrEmail')} placeholder="hr@muster-gmbh.de" type="email" /></div>
                </div>

                <button onClick={generateLetter} disabled={!form.yourName || !form.companyName}
                  style={{ padding: '10px 28px', borderRadius: 9, background: !form.yourName || !form.companyName ? '#ccc' : `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: !form.yourName || !form.companyName ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  Generate Letter — Free ✓
                </button>
              </div>

              {/* Letter output */}
              {letter && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif" }}>
                      {reqTab === 'initial' ? '📄 Request Letter' : '✏️ Correction Request Letter'}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={copyLetter}
                        style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${blue}40`, background: blue + '10', color: blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {copied ? '✓ Copied!' : 'Copy text'}
                      </button>
                      {form.hrEmail && (
                        <a href={mailtoLink()}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          ✉️ Send via Email
                        </a>
                      )}
                    </div>
                  </div>
                  <pre style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#374151', background: '#f8fafc', border: '1px solid #edf1f6', borderRadius: 10, padding: '18px 20px', whiteSpace: 'pre-wrap', lineHeight: 1.75, margin: 0 }}>
                    {letter}
                  </pre>
                  {!form.hrEmail && (
                    <p style={{ fontSize: 12, color: '#9aafbc', marginTop: 10 }}>
                      💡 Add an HR email above to get a direct "Send via Email" button.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
