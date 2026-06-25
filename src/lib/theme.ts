// Job-Lens Design Tokens
// All UI colors, fonts, spacing, radii and gradients live here.
// Change this file to retheme the entire app.

export const theme = {
  colors: {
    primary: '#042C53',
    primaryLight: '#E6F1FB',
    accent: '#378ADD',
    accentLight: '#85B7EB',
    success: '#1D9E75',
    successLight: '#E1F5EE',
    successBorder: '#b6ecd8',
    warning: '#BA7517',
    warningLight: '#FFF8EC',
    warningBorder: '#fcd98a',
    error: '#991B1B',
    errorLight: '#FEF2F2',
    errorBorder: '#FECACA',
    danger: '#E24B4A',
    ai: '#6D28D9',
    aiLight: '#F0EEFF',
    text: '#1a2332',
    textMuted: '#6b7c93',
    textFaint: '#8fa3b8',
    border: '#edf1f6',
    borderLight: '#dce4ef',
    bg: '#f0f4f8',
    bgCard: '#fff',
    bgSubtle: '#fafbfd',
    navy: '#185FA5',
  },
  gradients: {
    hero: `
      radial-gradient(ellipse at 20% 55%, rgba(55,138,221,0.18) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 20%, rgba(29,158,117,0.1) 0%, transparent 50%),
      linear-gradient(160deg, #0d1e30 0%, #142a45 60%, #0f2038 100%)
    `,
    ctaBlock: `
      radial-gradient(ellipse at 15% 50%, rgba(55,138,221,0.15) 0%, transparent 55%),
      linear-gradient(155deg, #0d1e30 0%, #142a45 100%)
    `,
    button: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)',
    buttonHover: 'linear-gradient(135deg, #4a9de0 0%, #1d6fc0 100%)',
    featureBorder: 'linear-gradient(135deg, #378ADD, #6D28D9)',
    navActivePill: 'linear-gradient(135deg, rgba(55,138,221,0.35), rgba(109,40,217,0.20))',
    successBtn: 'linear-gradient(135deg, #1D9E75, #059669)',
    primaryBtn: 'linear-gradient(135deg, #042C53, #185FA5)',
  },
  glass: {
    dark: 'rgba(255,255,255,0.05)',
    light: 'rgba(255,255,255,0.92)',
    borderDark: 'rgba(255,255,255,0.12)',
    borderLight: 'rgba(255,255,255,0.75)',
    blur: 'blur(16px)',
  },
  fonts: {
    body: "'DM Sans', system-ui, sans-serif",
    heading: "'Outfit', sans-serif",
  },
  fontSize: {
    xs: 10, sm: 11, base: 12, md: 13, lg: 14, xl: 15, '2xl': 16, '3xl': 18,
  },
  radius: {
    sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, '3xl': 16, full: 9999,
  },
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
  },
  navbar: {
    height: 52,
    bg: '#042C53',
    border: 'rgba(255,255,255,0.08)',
    text: '#E6F1FB',
    textMuted: '#85B7EB',
    activeText: '#E6F1FB',
    activeBg: 'linear-gradient(135deg, rgba(55,138,221,0.35), rgba(109,40,217,0.20))',
  },
  shadow: {
    card: '0 2px 12px rgba(4,44,83,0.07)',
    cardHover: '0 16px 40px rgba(4,44,83,0.13)',
    float: '0 8px 32px rgba(4,44,83,0.15)',
    glow: '0 6px 20px rgba(55,138,221,0.35)',
  },
}

export const c = theme.colors
export const g = theme.gradients
export const gl = theme.glass
export const f = theme.fonts
export const r = theme.radius
export const s = theme.space
export const sh = theme.shadow
