// Job-Lens Design Tokens
// All UI colors, fonts, spacing, and radii live here.
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
    text: '#1a2332',
    textMuted: '#6b7c93',
    textFaint: '#8fa3b8',
    border: '#edf1f6',
    borderLight: '#dce4ef',
    bg: '#f0f4f8',
    bgCard: '#fff',
    bgInput: '#fafbfd',
    navy: '#185FA5',
  },
  fonts: {
    body: "'DM Sans', system-ui, sans-serif",
    heading: "'Outfit', sans-serif",
  },
  fontSize: {
    xs: 10, sm: 11, base: 12, md: 13, lg: 14, xl: 15, '2xl': 16, '3xl': 18,
  },
  radius: {
    sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, full: 9999,
  },
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
  },
  navbar: {
    height: 52,
    bg: '#042C53',
    text: '#E6F1FB',
    textMuted: '#85B7EB',
    activeText: '#E6F1FB',
    activeBg: 'rgba(55,138,221,0.25)',
  },
  sidebar: {
    width: 280,
    bg: '#fff',
    border: '#edf1f6',
    padding: '20px 16px',
  },
}

export const c = theme.colors
export const f = theme.fonts
export const r = theme.radius
export const s = theme.space