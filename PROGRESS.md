# Job-Lens — Design Progress

## Done

| Page | Status |
|------|--------|
| Home / Landing (`src/app/page.tsx`) | ✅ Full redesign — mesh gradient hero, glass stats strip, feature cards with gradient hover border, How it works section, Auto Apply marketing, dark CTA block |
| Navbar (`src/app/app/components/Navbar.tsx`) | ✅ Theme tokens, gradient active pill, Auto Apply gated by `NEXT_PUBLIC_AUTO_APPLY_ENABLED` |
| Apply Now (`src/app/app/apply-now/page.tsx`) | ✅ Theme tokens, accent header, gradient buttons, progress tracker |
| Auto Apply (`src/app/app/auto-apply/page.tsx`) | ✅ Theme tokens, accent header, gradient buttons, production guard |
| Tracker (`src/app/app/tracker/page.tsx`) | ✅ Theme tokens, accent header, stat cards with colored top borders |

## Pending — inner app pages redesign

These four pages still use the old style: hard table borders, Excel-like grid layout, hardcoded colors.  
Full redesign planned — use Apply Now as the reference for the new style.

| Page | Path |
|------|------|
| Career Scan | `src/app/app/career-scan/page.tsx` |
| Smart Job Search | `src/app/app/smart-apply/page.tsx` |
| CV Builder | `src/app/app/cv-builder/page.tsx` |
| Cover Letter | `src/app/app/cover-letter/page.tsx` |

## Design system

All tokens in `src/lib/theme.ts`. Never hardcode hex — always import from theme.  
Inner page header convention: `paddingLeft: 14, borderLeft: \`3px solid \${c.accent}\``
