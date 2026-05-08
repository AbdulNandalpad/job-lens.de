'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

interface ScanResult {
  score: number
  readiness: string
  headline: string
  summary: string
  strengths: string[]
  gaps: string[]
  quick_wins: string[]
  role_suggestions: string[]
  salary_min: number
  salary_max: number
  salary_currency: string
  top_keyword: string
  market_insight: string
}

const STEPS = [
  'Extracting skills and experience...',
  'Benchmarking against market data...',
  'Scoring role fit and readiness...',
  'Generating salary estimate...',
  'Composing recommendations...',
]

type Mode = 'insights' | 'roast' | 'upgrade'

export default function CareerScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
const linkedinInputRef = useRef<HTMLInputElement>(null)
const [linkedinFileName, setLinkedinFileName] = useState('')
  const [cvText, setCvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [role, setRole] = useState('')
  const [market, setMarket] = useState('Germany')
  const [phase, setPhase] = useState<'upload'|'loading'|'results'|'error'>('upload')
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ScanResult|null>(null)
  const [drag, setDrag] = useState(false)
const [mobOpen, setMobOpen] = useState(false)
const [mode, setMode] = useState<Mode>('insights')
const [jobTypes, setJobTypes] = useState<string[]>(['Full-time','Hybrid'])
const [experience, setExperience] = useState('Senior (8–15 yrs)')
const [location, setLocation] = useState('Stuttgart, Germany')
const [relocate, setRelocate] = useState<string[]>(['No'])
const [salaryMin, setSalaryMin] = useState('120k')
const [salaryMax, setSalaryMax] = useState('160k €')
const [skills, setSkills] = useState<string[]>(['SAP CX','CRM','Product Owner','SAP BTP'])
const [industries, setIndustries] = useState<string[]>(['Manufacturing','Consulting'])
const [languages, setLanguages] = useState<string[]>(['German C2','English C1'])

function toggleTag(setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
  setter(prev => prev.includes(val) ? prev.filter(x=>x!==val) : [...prev, val])
}
  const [toastMsg, setToastMsg] = useState('')

function handleFile(file: File) {
  setFileName(file.name)
  setCvText('')
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    const r = new FileReader()
    r.onload = e => setCvText((e.target?.result as string) ?? '')
    r.readAsText(file)
  }
}

  async function runScan() {
    setPhase('loading')
    setMobOpen(false)
    setStep(0)
    setMode('insights')
    const t = setInterval(() => setStep(p => Math.min(p+1, STEPS.length-1)), 1800)
    try {
      const res = await fetch('/api/career-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `You are a senior career coach for ${market}. Analyse this CV for "${role}" in ${market}.\nCV:\n---\n${cvText.slice(0,6000)}\n---\nReturn ONLY valid JSON no markdown:\n{"score":<0-100>,"readiness":"<Ready|Strong|Developing|Entry>","headline":"<10-15 words>","summary":"<2 sentences>","strengths":["s1","s2","s3","s4"],"gaps":["g1","g2","g3"],"quick_wins":["w1","w2","w3"],"role_suggestions":["r1","r2","r3","r4"],"salary_min":<int>,"salary_max":<int>,"salary_currency":"<EUR|CHF>","top_keyword":"<word>","market_insight":"<1-2 sentences>"}` }),
      })
      const data = await res.json()
      clearInterval(t)
      if (data.error || !data.score) {
        setPhase('error')
      } else {
        setResult(data)
        setPhase('results')
      }
    } catch {
      clearInterval(t)
      setPhase('error')
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const scoreColor = (s: number) => s >= 80 ? '#1D9E75' : s >= 60 ? '#BA7517' : '#E24B4A'
  const scoreTrack = (s: number) => s >= 80 ? '#E1F5EE' : s >= 60 ? '#FAEEDA' : '#FCEBEB'
  const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n))

  const inp: React.CSSProperties = {
    width:'100%', padding:'8px 10px', borderRadius:8,
    border:'0.5px solid #dce4ef', fontSize:13,
    fontFamily:"'DM Sans',sans-serif", color:'#1a2332',
    background:'#f7f9fc', outline:'none', boxSizing:'border-box',
  }
  const lbl = (t: string) => (
    <div style={{fontSize:11,fontWeight:500,color:'#6b7c93',letterSpacing:0.3,textTransform:'uppercase' as const,marginBottom:5}}>{t}</div>
  )

  const card: React.CSSProperties = {
    background:'#fff', border:'0.5px solid #dce4ef',
    borderRadius:11, padding:14, marginBottom:10,
  }

  const infoItem = (text: string, key?: string) => (
    <div key={key} style={{fontSize:11,color:'#6b7c93',padding:'5px 8px',background:'#f7f9fc',borderRadius:6,marginBottom:4,lineHeight:1.55}}>
      {text}
    </div>
  )

  const cardTitle = (dot: string, label: string) => (
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:500,color:'#042C53',marginBottom:8}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:dot,flexShrink:0,display:'inline-block'}} />
      {label}
    </div>
  )

  const SB = (
  <>
    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,color:'#042C53',textTransform:'uppercase' as const,letterSpacing:0.4}}>LinkedIn PDF</div>
   <div
  onClick={() => linkedinInputRef.current?.click()}
  style={{border:`1.5px ${linkedinFileName?'solid #1D9E75':'dashed #dce4ef'}`,borderRadius:10,padding:14,textAlign:'center',cursor:'pointer',background:linkedinFileName?'#E1F5EE':'#f7f9fc',transition:'all 0.2s'}}
>
  <input
    ref={linkedinInputRef}
    type="file"
    accept=".pdf"
    style={{display:'none'}}
    onChange={e=>{const f=e.target.files?.[0];if(f)setLinkedinFileName(f.name)}}
  />
  <div style={{fontSize:11,color:'#6b7c93',lineHeight:1.5}}>
    <strong style={{display:'block',fontSize:12,color:'#1a2332',fontWeight:500,marginBottom:2}}>Export from LinkedIn → Save to PDF</strong>
    {linkedinFileName?<span style={{color:'#0F6E56',fontWeight:500}}>✓ {linkedinFileName}</span>:'Click to upload · PDF'}
  </div>
</div>

    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,color:'#042C53',textTransform:'uppercase' as const,letterSpacing:0.4}}>CV / Resume</div>
    <div
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)handleFile(f)}}
      onClick={()=>fileInputRef.current?.click()}
      style={{border:`1.5px ${fileName?'solid #1D9E75':drag?'solid #378ADD':'dashed #dce4ef'}`,borderRadius:10,padding:14,textAlign:'center',cursor:'pointer',background:fileName?'#E1F5EE':'#f7f9fc',transition:'all 0.2s'}}
    >
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
      <div style={{fontSize:11,color:'#6b7c93',lineHeight:1.5}}>
        <strong style={{display:'block',fontSize:12,color:'#1a2332',fontWeight:500,marginBottom:2}}>{fileName||'Your CV — tailored per job automatically'}</strong>
        {fileName?<span style={{color:'#0F6E56',fontWeight:500}}>✓ {fileName}</span>:'Click to upload · PDF or DOCX'}
      </div>
    </div>

    <div style={{height:'0.5px',background:'#dce4ef'}} />

    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,color:'#042C53',textTransform:'uppercase' as const,letterSpacing:0.4}}>Or paste CV text</div>
    <textarea
      value={cvText}
      onChange={e=>setCvText(e.target.value)}
      placeholder="Paste your CV content here if you don't have a file..."
      rows={5}
      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'0.5px solid #dce4ef',fontSize:11,fontFamily:"'DM Sans',sans-serif",color:'#1a2332',background:'#f7f9fc',outline:'none',resize:'vertical',boxSizing:'border-box' as const,lineHeight:1.5}}
    />

    <div style={{height:'0.5px',background:'#dce4ef'}} />

    {lbl('Target Role')}
    <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Product Owner" style={inp} />

    {lbl('Target Market')}
    <select value={market} onChange={e=>setMarket(e.target.value)} style={inp}>
      <option>Germany</option>
      <option>Switzerland</option>
      <option>Austria</option>
      <option>DACH</option>
      <option>EU</option>
    </select>

    <button
      disabled={(!cvText&&!fileName&&!linkedinFileName)||!role.trim()||phase==='loading'}
      onClick={runScan}
      style={{
        width:'100%',padding:11,borderRadius:10,border:'none',
        background:(cvText||fileName||linkedinFileName)&&role.trim()?'#042C53':'#dce4ef',
color:(cvText||fileName||linkedinFileName)&&role.trim()?'#E6F1FB':'#6b7c93',
cursor:(cvText||fileName||linkedinFileName)&&role.trim()?'pointer':'not-allowed',
                fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,
        
      }}
    >
      {phase==='loading'?'Analysing...':'Analyse My Profile ↗'}
    </button>
  </>
)
  

  // ── Results UI ────────────────────────────────────────────────────────────
  const ResultsView = result && (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>

      {/* Header row with mode toggle */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#042C53'}}>Career Scan</div>
        <div style={{display:'flex',border:'0.5px solid #dce4ef',borderRadius:8,overflow:'hidden'}}>
          {(['insights','roast','upgrade'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding:'7px 13px', fontSize:11, fontWeight:500, border:'none',
              background: mode===m ? '#042C53' : '#f7f9fc',
              color: mode===m ? '#E6F1FB' : '#6b7c93',
              cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
              textTransform:'capitalize',
            }}>
              {m === 'insights' ? 'Insights' : m === 'roast' ? 'Roast Mode' : 'Upgrade Path'}
            </button>
          ))}
        </div>
      </div>

      {/* ── INSIGHTS ── */}
      {mode === 'insights' && (
        <>
          {/* Score cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
            {[
              {label:'Profile Strength', value: result.score, color: scoreColor(result.score), track: scoreTrack(result.score)},
              {label:'Market Fit', value: Math.round(result.score * 0.9), color:'#BA7517', track:'#FAEEDA'},
              {label:'Keyword Match', value: Math.min(100, Math.round(result.score * 1.1)), color:'#1D9E75', track:'#E1F5EE'},
            ].map(sc => (
              <div key={sc.label} style={{background:'#fff',border:'0.5px solid #dce4ef',borderRadius:10,padding:12,textAlign:'center'}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:30,fontWeight:700,color:sc.color,lineHeight:1}}>{sc.value}</div>
                <div style={{fontSize:10,color:'#6b7c93',marginTop:3}}>{sc.label}</div>
                <div style={{height:3,borderRadius:2,background:sc.track,marginTop:7,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:2,background:sc.color,width:`${sc.value}%`}} />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths + Gaps */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div style={card}>
              {cardTitle('#1D9E75','Strengths')}
              {result.strengths.map((s,i) => infoItem(s, `s${i}`))}
            </div>
            <div style={card}>
              {cardTitle('#EF9F27','Gaps to address')}
              {result.gaps.map((g,i) => infoItem(g, `g${i}`))}
            </div>
          </div>

          {/* Best-fit roles */}
          <div style={card}>
            {cardTitle('#1D9E75','Best-fit roles — click to search')}
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {result.role_suggestions.map(r => (
                <Link key={r} href={`/app/smart-apply?q=${encodeURIComponent(r)}`} style={{
                  display:'inline-flex',alignItems:'center',fontSize:10,
                  padding:'4px 10px',borderRadius:10,background:'#E6F1FB',
                  color:'#185FA5',border:'0.5px solid #dce4ef',
                  textDecoration:'none',transition:'all 0.15s',
                }}>
                  {r} →
                </Link>
              ))}
            </div>
          </div>

          {/* Quick wins */}
          <div style={card}>
            {cardTitle('#EF9F27','Quick wins — do these before applying')}
            {result.quick_wins.map((w,i) => infoItem(w, `w${i}`))}
            {result.top_keyword && (
              <div style={{fontSize:11,color:'#6b7c93',borderTop:'0.5px solid #dce4ef',paddingTop:8,marginTop:4}}>
                Add <strong style={{color:'#185FA5'}}>"{result.top_keyword}"</strong> to your headline for better ATS matching.
              </div>
            )}
          </div>

          {/* Market insight + actions */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:2}}>
            <button onClick={()=>{setPhase('upload');setFileName('');setCvText('')}} style={{padding:'9px 18px',borderRadius:8,background:'#f0f4f8',color:'#6b7c93',border:'0.5px solid #dce4ef',cursor:'pointer',fontSize:13}}>
              ↺ Scan again
            </button>
            <Link href="/app/smart-apply" style={{padding:'9px 18px',borderRadius:8,background:'#042C53',color:'#E6F1FB',fontSize:13,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:6}}>
              Browse matching jobs →
            </Link>
          </div>
        </>
      )}

      {/* ── ROAST MODE ── */}
      {mode === 'roast' && (
        <div style={{background:'#1a0a0a',border:'1.5px solid #E24B4A',borderRadius:11,padding:16,position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:48,fontWeight:700,color:'#E24B4A',lineHeight:1}}>
              {Math.round(result.score / 10 * 3.2 / 8.2 * 10) / 10}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#F09595',fontFamily:"'Outfit',sans-serif"}}>Roast Score / 10</div>
              <div style={{fontSize:11,color:'#F09595',marginTop:3,lineHeight:1.4}}>{result.summary}</div>
            </div>
          </div>
          {[
            result.gaps[0] && `Your CV says "${result.readiness}" but recruiters see zero quantified results. That's not a profile — that's a blank canvas.`,
            result.gaps[1] && `${result.gaps[1]} Fix it before you send a single application.`,
            result.gaps[2] && `${result.gaps[2]} You're invisible to ATS filters right now.`,
            `The good news: ${result.strengths[0]}. That's genuinely rare. You just buried it under terrible presentation. Fix the packaging.`,
            result.market_insight,
          ].filter(Boolean).map((text, i) => (
            <div key={i} style={{fontSize:11,color:'#F09595',padding:'6px 10px',background:'rgba(226,75,74,0.10)',borderRadius:6,marginBottom:5,borderLeft:'2.5px solid #E24B4A',lineHeight:1.55}}>
              {text}
            </div>
          ))}
          <button onClick={() => showToast('Roast card copied — share on LinkedIn!')} style={{width:'100%',marginTop:10,padding:9,borderRadius:8,background:'#E24B4A',color:'#fff',fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,border:'none',cursor:'pointer'}}>
            Share my roast score on LinkedIn
          </button>
          {toastMsg && (
            <div style={{position:'absolute',bottom:-36,left:'50%',transform:'translateX(-50%)',background:'#042C53',color:'#E6F1FB',fontSize:11,padding:'6px 14px',borderRadius:8,whiteSpace:'nowrap'}}>
              {toastMsg}
            </div>
          )}
        </div>
      )}

      {/* ── UPGRADE PATH ── */}
      {mode === 'upgrade' && (
        <div style={card}>
          {cardTitle('#1D9E75',`Your upgrade path — to Senior ${role}`)}
          <div style={{fontSize:11,color:'#6b7c93',marginBottom:14,lineHeight:1.5}}>
            Estimated timeline: 3–4 months to be fully competitive for {result.salary_currency} {fmt(result.salary_max)}+ roles
          </div>
          {[
            { status:'done', period:'Completed', title:'Foundation — credentials and experience', tasks: result.strengths.map(s=>({text:s,done:true})) },
            { status:'now',  period:'Now — Week 1–2', title:'CV and profile overhaul', tasks: result.quick_wins.map(w=>({text:w,done:false})) },
            { status:'next', period:'Month 1', step:3, title:'Certification and visibility', tasks:[
              {text:`Enroll in a formal ${role} certification course`,done:false},
              {text:'Publish 2 LinkedIn articles demonstrating expertise',done:false},
              {text:`Apply to 5–8 high-match ${role} roles`,done:false},
            ]},
            { status:'next', period:'Month 2–3', step:4, title:'Interview readiness and offers', tasks:[
              {text:'Complete certification',done:false},
              {text:'Run 3–5 mock interviews (behavioural + technical deep-dive)',done:false},
              {text:`Negotiate ${result.salary_currency} ${fmt(result.salary_min)}–${fmt(result.salary_max)} salary band`,done:false},
            ]},
          ].map((s, idx, arr) => (
            <div key={idx} style={{display:'flex',gap:10,paddingBottom: idx < arr.length-1 ? 16 : 0}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                <div style={{
                  width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                  background: s.status==='done'?'#E1F5EE':s.status==='now'?'#042C53':'#f7f9fc',
                  color: s.status==='done'?'#1D9E75':s.status==='now'?'#E6F1FB':'#6b7c93',
                  border: s.status==='done'?'1.5px solid #1D9E75':s.status==='now'?'1.5px solid #378ADD':'1.5px solid #dce4ef',
                }}>
                  {s.status==='done'?'✓':s.status==='now'?'→':s.step}
                </div>
                {idx < arr.length-1 && <div style={{width:1.5,flex:1,background:'#dce4ef',marginTop:3}} />}
              </div>
              <div style={{flex:1,paddingTop:3}}>
                <div style={{fontSize:10,color:'#378ADD',fontWeight:500,marginBottom:2}}>{s.period}</div>
                <div style={{fontSize:12,fontWeight:500,color:'#1a2332',marginBottom:5}}>{s.title}</div>
                {s.tasks.map((t,ti) => (
                  <div key={ti} style={{fontSize:10,padding:'3px 8px',borderRadius:5,marginBottom:3,
                    color: t.done?'#1D9E75':'#6b7c93',
                    background: t.done?'#E1F5EE':'#f7f9fc',
                    textDecoration: t.done?'line-through':'none',
                  }}>{t.text}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        .jl-dsb{display:flex!important}.jl-mob{display:none!important}.jl-mbtn{display:none!important}
        @media(max-width:768px){.jl-dsb{display:none!important}.jl-mob{display:flex!important}.jl-mbtn{display:block!important}}
      `}</style>
      <Navbar />
      <div style={{display:'flex',minHeight:'calc(100vh - 52px)'}}>
        <div className="jl-dsb" style={{width:280,flexShrink:0,background:'#fff',borderRight:'0.5px solid #dce4ef',padding:'20px 16px',flexDirection:'column',gap:14,overflowY:'auto'}}>
          {SB}
        </div>
        <div style={{flex:1,minWidth:0,overflowY:'auto'}}>
          <div className="jl-mbtn" style={{padding:'10px 16px',background:'#fff',borderBottom:'0.5px solid #dce4ef'}}>
            <button onClick={()=>setMobOpen(o=>!o)} style={{background:'#042C53',color:'#E6F1FB',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>
              {mobOpen?'↑ Close':'↑ Upload CV & Settings'}
            </button>
          </div>
          {mobOpen&&<div className="jl-mob" style={{background:'#fff',borderBottom:'0.5px solid #dce4ef',padding:16,flexDirection:'column',gap:14}}>{SB}</div>}
          <div style={{padding:20}}>
            {phase==='upload'&&(
              <div style={{textAlign:'center',padding:'60px 20px',color:'#6b7c93'}}>
                <div style={{fontSize:48,marginBottom:16,opacity:0.2}}>◎</div>
                <div style={{fontSize:15,fontWeight:500,color:'#1a2332',marginBottom:8}}>Upload your CV and run the scan</div>
                <div style={{fontSize:13,lineHeight:1.7}}>Add your CV in the sidebar, enter your target role,<br/>then click Run Career Scan.</div>
              </div>
            )}
            {phase==='loading'&&(
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #dce4ef',borderTopColor:'#378ADD',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}} />
                <div style={{fontSize:14,fontWeight:500,color:'#1a2332',marginBottom:6}}>Analysing your CV...</div>
                <div style={{fontSize:13,color:'#6b7c93'}}>{STEPS[step]}</div>
              </div>
            )}
            {phase==='error'&&(
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <div style={{fontSize:13,color:'#E24B4A',marginBottom:16}}>Analysis failed. Try saving your CV as .txt and uploading again.</div>
                <button onClick={()=>{setPhase('upload');setFileName('');setCvText('')}} style={{padding:'8px 20px',borderRadius:8,background:'#042C53',color:'#E6F1FB',border:'none',cursor:'pointer',fontSize:13}}>Try again</button>
              </div>
            )}
            {phase==='results' && ResultsView}
          </div>
        </div>
      </div>
    </div>
  )
}