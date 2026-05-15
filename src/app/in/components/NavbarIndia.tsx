'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, fonts: f } = theme

export default function NavbarIndia() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [cleared, setCleared] = useState(false)

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

  function switchToDE() {
    localStorage.setItem('joblens_country', 'de')
    router.push('/')
  }

  const navItems = [
    { label: 'ATS Score', href: '/in/career-scan' },
    { label: 'Job Search', href: '/in/jobs' },
    { label: 'CV Builder', href: '/in/cv-builder' },
    { label: 'Cover Letter', href: '/in/cover-letter' },
    { label: 'Tracker', href: '/in/tracker' },
    { label: 'Account', href: '/in/account' },
  ]

  const isActive = (href: string) => pathname === href
  const currentPage = navItems.find(item => isActive(item.href))?.label || 'Job-Lens India'

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
        @media (max-width: 768px) {
          .jl-desktop-nav { display: none !important; }
          .jl-hamburger { display: flex !important; }
          .jl-mobile-menu { display: block !important; }
          .jl-mobile-page { display: block !important; }
          .jl-logo-text { display: none !important; }
          .jl-clear-btn { display: none !important; }
        }
      `}</style>

      <div style={{ background: c.primary, padding: '0 16px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}` }}>

        {/* Logo */}
        <Link href="/in" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="jl-logo-text" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: '#ff9933' }}>&nbsp;India</span>
          </span>
        </Link>

        {/* Mobile: current page name */}
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

        {/* Right: switcher + user + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Country switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
            <button onClick={switchToDE} style={{ padding: '4px 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: f.body, fontWeight: 500 }}>
              DACH
            </button>
            <div style={{ padding: '4px 10px', background: 'rgba(255,153,51,0.2)', fontSize: 11, color: '#ff9933', fontFamily: f.body, fontWeight: 700 }}>
              IN
            </div>
          </div>

          {/* Clear session */}
          <button className="jl-clear-btn" onClick={clearSession} title="Clear session data"
            style={{ alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, background: cleared ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cleared ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 11, color: cleared ? '#4ade80' : 'rgba(255,255,255,0.45)', fontFamily: f.body, fontWeight: 500 }}>
              {cleared ? '+ Cleared' : '+ New session'}
            </span>
          </button>

          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px 4px 5px' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ff9933', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: '#E6F1FB' }}>{userName}</span>
          </div>

          <button className="jl-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E6F1FB', fontSize: 20, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? 'x' : '='}
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
              {isActive(item.href) && <span style={{ fontSize: 10, background: '#378ADD', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Current</span>}
            </Link>
          ))}
          <button onClick={() => switchToDE()} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left' as const }}>
            Switch to DACH (Germany, Austria, Switzerland)
          </button>
        </div>
      )}
    </>
  )
}
