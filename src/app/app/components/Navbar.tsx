'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage, DEFlag, GBFlag } from '@/lib/i18n'
import { SS, LS } from '@/lib/constants'

const { colors: c, gradients: g, fonts: f } = theme

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { lang, setLang, t } = useLanguage()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      const full = user.user_metadata?.full_name ?? user.email ?? ''
      setUserName(full.split(' ')[0] || 'User')
      setIsAdmin(user.email === 'sap.rashid@gmail.com')
      // Clear stale data if a different user is now logged in
      const storedUid = sessionStorage.getItem(SS.uid)
      if (storedUid && storedUid !== user.id) {
        clearAllJLData()
      }
      sessionStorage.setItem(SS.uid, user.id)
    })
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Sign-out / new session: clear sessionStorage only (localStorage persists — Kira history, widget prefs)
  function clearSessionData() {
    Object.keys(sessionStorage).filter(k => k.startsWith('jl_')).forEach(k => sessionStorage.removeItem(k))
  }
  // User-switch: full wipe (different account — nothing should carry over)
  function clearAllJLData() {
    clearSessionData()
    Object.keys(localStorage).filter(k => k.startsWith('jl_')).forEach(k => localStorage.removeItem(k))
  }

  async function signOut() {
    clearSessionData()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function clearSession() {
    clearSessionData()
    setConfirmClear(false)
    window.location.reload()
  }

  const navItems = [
    { label: t.navbar.jobSearch,   href: '/app/jobs' },
    { label: t.navbar.careerScan,  href: '/app/career-scan' },
    { label: t.navbar.cvBuilder,   href: '/app/cv-builder' },
    { label: t.navbar.coverLetter, href: '/app/cover-letter' },
    { label: t.navbar.autoApply,   href: '/app/auto-apply' },
    ...(isAdmin ? [{ label: 'Job Case', href: '/app/job-case' }] : []),
    { label: t.navbar.zeugnis,     href: '/app/zeugnis' },
    { label: t.navbar.account,     href: '/app/account' },
  ]

  // Tracker + Interview live under Account dropdown only
  const accountSubItems = [
    { label: t.navbar.tracker,   href: '/app/tracker' },
    { label: t.navbar.interview, href: '/app/interview' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isAccountArea = ['/app/account', '/app/tracker', '/app/interview'].some(p => pathname === p)
  const currentPage = [...navItems, ...accountSubItems].find(item => pathname === item.href)?.label || 'Job-Lens AI'

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
        .jl-user-name { display: inline; }
        @media (max-width: 768px) {
          .jl-desktop-nav { display: none !important; }
          .jl-hamburger { display: flex !important; }
          .jl-mobile-menu { display: block !important; }
          .jl-mobile-page { display: block !important; }
          .jl-logo-text { display: none !important; }
          .jl-clear-btn { display: none !important; }
          .jl-lang-toggle { display: none !important; }
          .jl-user-name { display: none !important; }
        }
      `}</style>

      <div style={{ background: c.primary, padding: '0 16px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}` }}>

        {/* Logo */}
        <Link href="/app" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
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

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* DE/EN language dropdown */}
          <div className="jl-lang-toggle" style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}
            >
              {lang} <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{langOpen ? '▲' : '▼'}</span>
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#0d2137', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 110, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {(['DE', 'EN'] as const).map(code => (
                  <button key={code} onClick={() => { setLang(code); setLangOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: lang === code ? 'rgba(55,138,221,0.2)' : 'transparent', color: lang === code ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: lang === code ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {code} <span style={{ opacity: 0.5, fontWeight: 400 }}>— {code === 'DE' ? 'Deutsch' : 'English'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New session button */}
          <div className="jl-clear-btn">
            <button
              onClick={() => setConfirmClear(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <span style={{ fontSize: 12, color: '#fff', fontFamily: f.body, fontWeight: 600 }}>+ {t.navbar.newSession}</span>
            </button>
          </div>

          {/* User avatar + logout dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setUserMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px 4px 5px', cursor: 'pointer' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="jl-user-name" style={{ fontSize: 12, color: '#E6F1FB' }}>{userName}</span>
              <span style={{ fontSize: 9, opacity: 0.5, color: '#E6F1FB' }}>{userMenuOpen ? '▲' : '▼'}</span>
            </button>
            {userMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#0d2137', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 300, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <Link href="/app/account" onClick={() => setUserMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', background: isActive('/app/account') ? 'rgba(55,138,221,0.12)' : 'transparent' }}>
                  Account
                </Link>
                <Link href="/app/tracker" onClick={() => setUserMenuOpen(false)}
                  style={{ display: 'block', padding: '9px 14px 9px 22px', fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: isActive('/app/tracker') ? 'rgba(55,138,221,0.1)' : 'transparent' }}>
                  {t.navbar.tracker}
                </Link>
                <Link href="/app/interview" onClick={() => setUserMenuOpen(false)}
                  style={{ display: 'block', padding: '9px 14px 9px 22px', fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', background: isActive('/app/interview') ? 'rgba(55,138,221,0.1)' : 'transparent' }}>
                  {t.navbar.interview}
                </Link>
                <button onClick={signOut}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: 13, color: '#e53e3e', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: 600 }}>
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button className="jl-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E6F1FB', fontSize: 20, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* New session confirmation — fixed overlay, works on mobile and desktop */}
      {confirmClear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setConfirmClear(false)}>
          <div style={{ background: '#0d2137', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '20px 20px 16px', maxWidth: 280, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, color: '#E6F1FB', fontWeight: 700, marginBottom: 6 }}>Clear all session data?</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.6 }}>Removes your CV, job selections, scan results and cover letter.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={clearSession} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#e53e3e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
              <button onClick={() => setConfirmClear(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
          {accountSubItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 8px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 13, marginBottom: 4, color: isActive(item.href) ? '#E6F1FB' : 'rgba(133,183,235,0.6)', background: isActive(item.href) ? 'rgba(55,138,221,0.15)' : 'transparent', fontWeight: isActive(item.href) ? 600 : 400 }}>
              <span>↳ {item.label}</span>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { setMenuOpen(false); setConfirmClear(true) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.navbar.clearAll}
            </button>
            <button onClick={signOut}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(229,62,62,0.12)', border: '1px solid rgba(229,62,62,0.3)', color: '#e53e3e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
