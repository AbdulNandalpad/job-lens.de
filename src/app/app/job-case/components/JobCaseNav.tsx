'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { theme } from '@/lib/theme'

const { colors: c } = theme

export default function JobCaseNav({ credits }: { credits?: number }) {
  const pathname = usePathname()

  const isNew  = pathname.startsWith('/app/job-case/new')
  const isList = pathname === '/app/job-case'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .jcn-link { font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 20px; text-decoration: none; transition: all 0.15s; color: rgba(255,255,255,0.5); }
        .jcn-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .jcn-link.active { color: #fff; background: rgba(55,138,221,0.18); font-weight: 600; }
        .jcn-cta { background: linear-gradient(135deg, #378ADD, #185FA5); color: #fff; border: none; border-radius: 8px; padding: 7px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; transition: opacity 0.15s; }
        .jcn-cta:hover { opacity: 0.88; }
      `}</style>

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(9,21,37,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Left — logo + section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/app" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 44 44">
              <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
              <circle cx="20" cy="20" r="3" fill="#378ADD"/>
              <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
              Job-Lens
            </span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>/</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
            Job Case
          </span>
        </div>

        {/* Centre — nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link href="/app/job-case" className={`jcn-link${isList ? ' active' : ''}`}>
            My Cases
          </Link>
          <Link href="/app/job-case/new" className={`jcn-link${isNew ? ' active' : ''}`}>
            New Case
          </Link>
        </div>

        {/* Right — credits + back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {credits !== undefined && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              <span style={{ color: c.accent, fontWeight: 700 }}>{credits}</span> credits
            </span>
          )}
          <Link href="/app" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
            ← Dashboard
          </Link>
        </div>

      </nav>
    </>
  )
}
