'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage, DEFlag, GBFlag } from '@/lib/i18n'

const { colors: c, gradients: g, fonts: f } = theme

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [cleared, setCleared] = useState(false)
  const { lang, setLang, t } = useLanguage()

  function switchToIN() {
    localStorage.setItem('joblens_country', 'in')
    router.push('/in')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const full = data.user?.user_metadata?.full_name ?? data.user?.email ?? ''
      setUserName(full.split(' ')[0] || 'User')
    })
  }, [])

  function clearSession() {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('jl_'))
      .forEach(k => sessionStorage.removeItem(k))
    setCleared(true)
    setTimeout(() => setCleared(false), 2500)
  }

  const navItems = [
    { label: t.navbar.careerScan, href: '/app/career-scan' },
    { label: t.navbar.smartApply, href: '/app/smart-apply' },
    { label: t.navbar.cvBuilder, href: '/app/cv-builder' },
    { label: t.navbar.coverLetter, href: '/app/cover-letter' },
    { label: t.navbar.applyNow, href: '/app/apply-now' },
    ...(process.env.NEXT_PUBLIC_AUTO_APPLY_ENABLED === 'true'
      ? [{ label: t.navbar.autoApply, href: '/app/auto-apply' }]
      : []),
    { label: t.navbar.tracker, href: '/app/tracker' },
    { label: t.navbar.account, href: '/app/account' },
  ]

  const isActive = (href: string) => pathname === href
  const currentPage = navItems.find(item => isActive(item.href))?.label || 'Job-Lens AI'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .jl-desktop-nav { display: flex; }
        .jl-hamburger { display: none; }
        .jl-mobile-menu { display: none; }
        .jl-mobile-page { display: none; }
        .jl-logo-text { display: flex; }
        .jl-clear-btn { display: flex; }
        .jl-lang-toggle { display: flex; }
        @media (max-width: 768px) {
          .jl-desktop-nav { display: none !important; }
          .jl-hamburger { display: flex !important; }
          .jl-mobile-menu { display: block !important; }
          .jl-mobile-page { display: block !important; }
          .jl-logo-text { display: none !important; }
          .jl-clear-btn { display: none !important; }
          .jl-lang-toggle { display: none !important; }
        }
      `}</style>

      <div style={{ background: c.primary, padding: '0 16px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}` }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="jl-logo-text" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: '#378ADD' }}>&nbsp;AI</span>
          </span>
        </Link>

        {/* Mobile: current page name centred */}
        <div className="jl-mobile-page" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: '#E6F1FB', whiteSpace: 'nowrap' }}>
          {currentPage}
        </div>

        {/* Desktop nav */}
        <div className="jl-desktop-nav" style={{ gap: 4 }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, textDecoration: 'none', color: isActive(item.href) ? theme.navbar.text : theme.navbar.textMuted, background: isActive(item.href) ? g.navActivePill : 'transparent', fontWeight: isActive(item.href) ? 600 : 400, transition: 'all 0.15s' }}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* User + clear session + lang toggle + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* DE/EN language toggle */}
          <div className="jl-lang-toggle" style={{ alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '3px 4px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setLang('DE')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', background: lang === 'DE' ? 'rgba(255,255,255,0.12)' : 'transparent', color: lang === 'DE' ? '#fff' : 'rgba(255,255,255,0.4)' }}
            >
              <DEFlag size={13} />
              DE
            </button>
            <button
              onClick={() => setLang('EN')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', background: lang === 'EN' ? 'rgba(255,255,255,0.12)' : 'transparent', color: lang === 'EN' ? '#fff' : 'rgba(255,255,255,0.4)' }}
            >
              <GBFlag size={13} />
              EN
            </button>
          </div>

          {/* Country switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '4px 10px', background: 'rgba(55,138,221,0.2)', fontSize: 11, color: '#378ADD', fontFamily: f.body, fontWeight: 700 }}>
              DACH
            </div>
            <button onClick={switchToIN} style={{ padding: '4px 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: f.body, fontWeight: 500 }}>
              IN
            </button>
          </div>

          {/* Clear session button */}
          <button
            className="jl-clear-btn"
            onClick={clearSession}
            title="Clear all session data (CV, jobs, letters)"
            style={{ alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, background: cleared ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cleared ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: 11, color: cleared ? '#4ade80' : 'rgba(255,255,255,0.45)', fontFamily: f.body, fontWeight: 500 }}>
              {cleared ? `✓ ${t.navbar.cleared}` : `⟳ ${t.navbar.newSession}`}
            </span>
          </button>

          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px 4px 5px' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: '#E6F1FB' }}>{userName}</span>
          </div>

          <button className="jl-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E6F1FB', fontSize: 20, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="jl-mobile-menu" style={{ background: c.primary, borderBottom: `1px solid ${theme.navbar.border}`, padding: '8px 16px 12px', zIndex: 99, position: 'sticky', top: 52 }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14, marginBottom: 4, color: isActive(item.href) ? '#E6F1FB' : '#85B7EB', background: isActive(item.href) ? 'rgba(55,138,221,0.2)' : 'transparent', fontWeight: isActive(item.href) ? 600 : 400 }}>
              {item.label}
              {isActive(item.href) && <span style={{ fontSize: 10, background: '#378ADD', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{t.navbar.current}</span>}
            </Link>
          ))}
          {/* Mobile lang toggle */}
          <div style={{ display: 'flex', gap: 6, margin: '8px 0', padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setLang('DE')} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${lang === 'DE' ? 'rgba(55,138,221,0.4)' : 'rgba(255,255,255,0.12)'}`, background: lang === 'DE' ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.06)', color: lang === 'DE' ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: lang === 'DE' ? 700 : 400 }}>
              <DEFlag size={15} /> DE — Deutsch
            </button>
            <button onClick={() => setLang('EN')} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${lang === 'EN' ? 'rgba(55,138,221,0.4)' : 'rgba(255,255,255,0.12)'}`, background: lang === 'EN' ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.06)', color: lang === 'EN' ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: lang === 'EN' ? 700 : 400 }}>
              <GBFlag size={15} /> EN — English
            </button>
          </div>
          <button onClick={() => { clearSession(); setMenuOpen(false) }}
            style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left' as const }}>
            {t.navbar.clearAll}
          </button>
        </div>
      )}
    </>
  )
}
