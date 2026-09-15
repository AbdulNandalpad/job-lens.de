/**
 * CVPdf — @react-pdf/renderer document for the Job-Lens CV builder.
 *
 * Templates (same CVData for all):
 *   'executive' | 'technical' | 'executive2'  → two-column: dark sidebar + main column
 *   'modern'    | 'saffron'                   → single column with a full-bleed navy header band
 *   everything else ('minimal', 'clean', …)   → single column, pure typography
 *
 * Fonts: DM Sans (body) + Outfit (headings) are served from /public/fonts and
 * registered via ensureCvFonts(fontBase). If any font cannot be fetched the
 * document falls back to the built-in Helvetica family so a PDF is always produced.
 */
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer'
import { c, s as sp } from '@/lib/theme'

export interface CVData {
  name: string
  title: string
  tagline: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
  stats: { label: string; value: string }[]
  skills: { name: string; level: number }[]
  experience: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
}

// ───────────────────────── Fonts ─────────────────────────

type Face = { fontFamily: string; fontWeight?: number }
export interface PdfFonts {
  body: Face
  medium: Face
  bold: Face
  heading: Face
  headingBold: Face
}

const FAMILY = { body: 'DM Sans', heading: 'Outfit' } as const

const CUSTOM_FONTS: PdfFonts = {
  body:        { fontFamily: FAMILY.body, fontWeight: 400 },
  medium:      { fontFamily: FAMILY.body, fontWeight: 500 },
  bold:        { fontFamily: FAMILY.body, fontWeight: 700 },
  heading:     { fontFamily: FAMILY.heading, fontWeight: 600 },
  headingBold: { fontFamily: FAMILY.heading, fontWeight: 700 },
}

// Built-in PDF fonts ignore fontWeight, so bold is a separate family name.
export const FALLBACK_FONTS: PdfFonts = {
  body:        { fontFamily: 'Helvetica' },
  medium:      { fontFamily: 'Helvetica' },
  bold:        { fontFamily: 'Helvetica-Bold' },
  heading:     { fontFamily: 'Helvetica-Bold' },
  headingBold: { fontFamily: 'Helvetica-Bold' },
}

const FONT_FILES: { family: string; file: string; fontWeight: number }[] = [
  { family: FAMILY.body,    file: 'DMSans-Regular.ttf', fontWeight: 400 },
  { family: FAMILY.body,    file: 'DMSans-Medium.ttf',  fontWeight: 500 },
  { family: FAMILY.body,    file: 'DMSans-Bold.ttf',    fontWeight: 700 },
  { family: FAMILY.heading, file: 'Outfit-SemiBold.ttf', fontWeight: 600 },
  { family: FAMILY.heading, file: 'Outfit-Bold.ttf',     fontWeight: 700 },
]

let registeredBase: string | null = null
let hyphenationDisabled = false

/**
 * Registers + preloads the brand fonts from `${fontBase}/fonts/*` once per process.
 * Returns the font set to render with. Never throws: a failed fetch (blocked
 * preview deployment, offline dev box, …) degrades to Helvetica instead of a 500.
 */
export async function ensureCvFonts(fontBase?: string | null): Promise<PdfFonts> {
  if (!hyphenationDisabled) {
    // German compound nouns must never be hyphenated across lines (or pages).
    Font.registerHyphenationCallback(word => [word])
    hyphenationDisabled = true
  }
  const base = (fontBase || '').replace(/\/+$/, '')
  if (!base) return FALLBACK_FONTS
  try {
    if (registeredBase !== base) {
      for (const fam of [FAMILY.body, FAMILY.heading]) {
        Font.register({
          family: fam,
          fonts: FONT_FILES.filter(f => f.family === fam).map(f => ({ src: `${base}/fonts/${f.file}`, fontWeight: f.fontWeight })),
        })
      }
      registeredBase = base
    }
    // Load up front so a fetch failure surfaces here (recoverable) rather than mid-render.
    await Promise.all(FONT_FILES.map(f => Font.load({ fontFamily: f.family, fontWeight: f.fontWeight })))
    return CUSTOM_FONTS
  } catch (err) {
    console.error('[cv/pdf] brand fonts unavailable, falling back to Helvetica:', err)
    // Drop only our (poisoned, promise-cached) families so the next request retries.
    // Font.clear() would also wipe the built-in Helvetica registration and break the fallback.
    const families = Font.getRegisteredFonts() as Record<string, unknown>
    delete families[FAMILY.body]
    delete families[FAMILY.heading]
    registeredBase = null
    return FALLBACK_FONTS
  }
}

// ───────────────────────── Tokens ─────────────────────────

const ink   = c.text
const muted = c.textMuted
const faint = c.textFaint
const rule  = c.borderLight
const paper = c.bgCard
const navy  = c.primary

const FS = { name: 24, title: 11, body: 10, meta: 9, small: 8.5, section: 8, stat: 15 }
const LH = 1.4
const PAGE_X = 44
const PAGE_Y = 40
const SIDEBAR_W = 190
const SIDEBAR_PAD = 24

const BULLET = '•'
const DOT_SEP = '   ·   '

const TWO_COL_TEMPLATES = ['executive', 'technical', 'executive2']
const BANDED_TEMPLATES  = ['modern', 'saffron']

const lvLabel = (l: number) => (l >= 90 ? 'Native' : l >= 75 ? 'Fluent' : l >= 55 ? 'Proficient' : 'Basic')
const has = <T,>(arr: T[] | undefined | null): arr is T[] => Array.isArray(arr) && arr.length > 0
const nameSize = (name: string) => (name.length > 30 ? 18 : name.length > 22 ? 20 : FS.name)

// Relative luminance of a #rrggbb colour; used to keep accents legible on the dark sidebar.
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 1
  const n = parseInt(m[1], 16)
  const ch = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255)
}

// ───────────────────────── Shared pieces ─────────────────────────

interface Ctx { cv: CVData; ac: string; fx: PdfFonts; photo?: string }

function SectionTitle({ title, ac, fx, color }: { title: string; ac: string; fx: PdfFonts; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: sp.lg, marginBottom: sp.sm }} minPresenceAhead={52} wrap={false}>
      <Text style={[fx.heading, { fontSize: FS.section, color: color || ac, textTransform: 'uppercase', letterSpacing: 1.4 }]}>{title}</Text>
      <View style={{ flex: 1, height: 0.6, backgroundColor: rule, marginLeft: sp.sm }} />
    </View>
  )
}

function Bullet({ text, ac, fx, size = FS.body, color = muted }: { text: string; ac: string; fx: PdfFonts; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 3 }} wrap={false}>
      <Text style={[fx.bold, { width: 11, fontSize: size, lineHeight: LH, color: ac }]}>{BULLET}</Text>
      <Text style={[fx.body, { flex: 1, fontSize: size, lineHeight: LH, color }]}>{text}</Text>
    </View>
  )
}

function ExperienceBlock({ cv, ac, fx, roleSize = 11 }: Ctx & { roleSize?: number }) {
  return (
    <>
      {cv.experience.map((exp, i) => {
        const meta = [exp.company, exp.location, exp.type].filter(Boolean).join('  ·  ')
        const [first, ...rest] = (exp.bullets || []).filter(Boolean)
        const gap = i < cv.experience.length - 1 ? sp.md : 0
        // Header + first bullet are one unbreakable unit: minPresenceAhead is unreliable in
        // nested wrapping views and produced orphaned headers and half-empty pages.
        return (
          <View key={i}>
            <View wrap={false} style={{ marginBottom: rest.length ? 0 : gap }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={[fx.bold, { flex: 1, fontSize: roleSize, lineHeight: 1.3, color: ink, paddingRight: sp.sm }]}>{exp.role}</Text>
                {exp.period ? <Text style={[fx.medium, { flexShrink: 0, fontSize: FS.meta, lineHeight: 1.3, color: ac, textAlign: 'right', paddingTop: 1 }]}>{exp.period}</Text> : null}
              </View>
              {meta ? <Text style={[fx.body, { fontSize: FS.meta, lineHeight: LH, color: faint, marginBottom: 4 }]}>{meta}</Text> : null}
              {first ? <Bullet text={first} ac={ac} fx={fx} /> : null}
            </View>
            {rest.map((b, j) => (
              <View key={j} style={{ marginBottom: j === rest.length - 1 ? gap : 0 }} wrap={false}>
                <Bullet text={b} ac={ac} fx={fx} />
              </View>
            ))}
          </View>
        )
      })}
    </>
  )
}

function EducationBlock({ cv, fx }: Ctx) {
  return (
    <>
      {cv.education.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: i < cv.education.length - 1 ? sp.sm : 0 }} wrap={false}>
          <View style={{ flex: 1, paddingRight: sp.sm }}>
            <Text style={[fx.bold, { fontSize: FS.body, lineHeight: 1.3, color: ink }]}>{e.degree}</Text>
            {e.school ? <Text style={[fx.body, { fontSize: FS.meta, lineHeight: LH, color: faint }]}>{e.school}</Text> : null}
          </View>
          {e.year ? <Text style={[fx.medium, { flexShrink: 0, fontSize: FS.meta, lineHeight: 1.3, color: faint, textAlign: 'right', paddingTop: 1 }]}>{e.year}</Text> : null}
        </View>
      ))}
    </>
  )
}

function Chips({ items, bg, color, border }: { items: string[]; bg: string; color: string; border?: string; fx: PdfFonts }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: -4 }} wrap={false}>
      {items.map((t, i) => (
        <Text key={i} style={{ fontSize: FS.small, lineHeight: 1.2, color, backgroundColor: bg, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 3, marginRight: 4, marginBottom: 4, ...(border ? { borderWidth: 0.5, borderColor: border } : {}) }}>{t}</Text>
      ))}
    </View>
  )
}

function StatsRow({ cv, ac, fx, compact }: Ctx & { compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: sp.md, marginBottom: -sp.sm }} wrap={false}>
      {cv.stats.map((st, i) => (
        <View key={i} style={{ paddingHorizontal: compact ? 10 : 12, paddingVertical: 6, backgroundColor: c.bgSubtle, borderRadius: 4, borderWidth: 0.5, borderColor: rule, marginRight: sp.sm, marginBottom: sp.sm, alignItems: 'center' }}>
          <Text style={[fx.headingBold, { fontSize: compact ? 13 : FS.stat, lineHeight: 1.1, color: ac }]}>{st.value}</Text>
          <Text style={[fx.body, { fontSize: 7.5, color: faint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 }]}>{st.label}</Text>
        </View>
      ))}
    </View>
  )
}

/** Sections shared by both single-column templates (everything below the header). */
function SingleColumnBody({ cv, ac, fx, photo, chips }: Ctx & { chips: boolean }) {
  const skills = (cv.skills || []).map(sk => sk.name).filter(Boolean)
  const tools = (cv.tools || []).filter(Boolean)
  const certs = (cv.certifications || []).filter(Boolean)
  const highlights = (cv.highlights || []).filter(Boolean)
  const langs = (cv.languages || []).filter(l => l?.name)
  const ctx = { cv, ac, fx, photo }
  const bodyTxt = { fontSize: FS.body, lineHeight: LH, color: muted }

  return (
    <>
      {has(cv.stats) && <StatsRow {...ctx} />}

      {cv.summary ? (
        <>
          <SectionTitle title="Profile" ac={ac} fx={fx} />
          <Text style={[fx.body, bodyTxt]}>{cv.summary}</Text>
        </>
      ) : null}

      {has(cv.experience) && (
        <>
          <SectionTitle title="Professional Experience" ac={ac} fx={fx} />
          <ExperienceBlock {...ctx} />
        </>
      )}

      {has(skills) && (
        <>
          <SectionTitle title="Core Skills" ac={ac} fx={fx} />
          {chips
            ? <Chips items={skills} bg={c.bgSubtle} color={ink} border={rule} fx={fx} />
            : <Text style={[fx.body, bodyTxt]} wrap={false}>{skills.join(DOT_SEP)}</Text>}
        </>
      )}

      {has(tools) && (
        <>
          <SectionTitle title="Tech Stack" ac={ac} fx={fx} />
          <Text style={[fx.medium, bodyTxt, { color: ink }]} wrap={false}>{tools.join(DOT_SEP)}</Text>
        </>
      )}

      {has(cv.education) && (
        <>
          <SectionTitle title="Education" ac={ac} fx={fx} />
          <EducationBlock {...ctx} />
        </>
      )}

      {has(certs) && (
        <>
          <SectionTitle title="Certifications" ac={ac} fx={fx} />
          {certs.map((t, i) => <Bullet key={i} text={t} ac={ac} fx={fx} />)}
        </>
      )}

      {has(langs) && (
        <>
          <SectionTitle title="Languages" ac={ac} fx={fx} />
          <Text style={[fx.body, bodyTxt]} wrap={false}>
            {langs.map(l => `${l.name} (${lvLabel(l.level)})`).join(DOT_SEP)}
          </Text>
        </>
      )}

      {has(highlights) && (
        <>
          <SectionTitle title="Key Highlights" ac={ac} fx={fx} />
          {highlights.map((t, i) => <Bullet key={i} text={t} ac={ac} fx={fx} />)}
        </>
      )}
    </>
  )
}

function ContactLine({ items, color, fx, size = FS.meta }: { items: string[]; color: string; fx: PdfFonts; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} wrap={false}>
      {items.map((it, i) => (
        <Text key={i} style={[fx.body, { fontSize: size, lineHeight: LH, color }]}>
          {it}{i < items.length - 1 ? DOT_SEP : ''}
        </Text>
      ))}
    </View>
  )
}

function Photo({ src, size }: { src: string; size: number }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop; this renders to a PDF, not the DOM
  return <Image src={src} style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover' }} />
}

// ───────────────────────── Minimal ─────────────────────────

function CVPdfMinimal({ cv, ac, fx, photo }: Ctx) {
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean)
  return (
    <Document>
      <Page size="A4" style={[fx.body, { backgroundColor: paper, paddingHorizontal: PAGE_X, paddingVertical: PAGE_Y, fontSize: FS.body, color: muted }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: sp.md, borderBottomWidth: 1.2, borderBottomColor: ac }} wrap={false} minPresenceAhead={80}>
          {photo ? <View style={{ marginRight: sp.lg }}><Photo src={photo} size={64} /></View> : null}
          <View style={{ flex: 1 }}>
            <Text style={[fx.headingBold, { fontSize: nameSize(cv.name), lineHeight: 1.15, color: ink }]}>{cv.name}</Text>
            {cv.title ? <Text style={[fx.medium, { fontSize: FS.title, lineHeight: 1.3, color: ac, marginTop: 3 }]}>{cv.title}</Text> : null}
            {cv.tagline ? <Text style={[fx.body, { fontSize: FS.meta, lineHeight: LH, color: faint, marginTop: 3 }]}>{cv.tagline}</Text> : null}
            {contact.length > 0 && <View style={{ marginTop: sp.sm }}><ContactLine items={contact} color={faint} fx={fx} /></View>}
          </View>
        </View>
        <SingleColumnBody cv={cv} ac={ac} fx={fx} photo={photo} chips={false} />
      </Page>
    </Document>
  )
}

// ───────────────────────── Modern (navy header band) ─────────────────────────

function CVPdfModern({ cv, ac, fx, photo }: Ctx) {
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean)
  const onBand = 'rgba(255,255,255,0.82)'
  return (
    <Document>
      <Page size="A4" style={[fx.body, { backgroundColor: paper, paddingHorizontal: PAGE_X, paddingVertical: PAGE_Y, fontSize: FS.body, color: muted }]}>
        {/* Negative margins pull the band out to the page edges on page 1 only; later pages keep normal padding. */}
        <View style={{ marginTop: -PAGE_Y, marginHorizontal: -PAGE_X, paddingHorizontal: PAGE_X, paddingTop: PAGE_Y - 4, paddingBottom: sp.xl, backgroundColor: navy, borderBottomWidth: 4, borderBottomColor: ac }} wrap={false} minPresenceAhead={80}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {photo ? <View style={{ marginRight: sp.lg }}><Photo src={photo} size={68} /></View> : null}
            <View style={{ flex: 1 }}>
              <Text style={[fx.headingBold, { fontSize: nameSize(cv.name), lineHeight: 1.15, color: paper }]}>{cv.name}</Text>
              {cv.title ? <Text style={[fx.medium, { fontSize: FS.title, lineHeight: 1.3, color: onBand, marginTop: 4, letterSpacing: 0.3 }]}>{cv.title}</Text> : null}
              {cv.tagline ? <Text style={[fx.body, { fontSize: FS.meta, lineHeight: LH, color: 'rgba(255,255,255,0.6)', marginTop: 3 }]}>{cv.tagline}</Text> : null}
            </View>
          </View>
          {contact.length > 0 && <View style={{ marginTop: sp.md }}><ContactLine items={contact} color={onBand} fx={fx} /></View>}
        </View>
        <SingleColumnBody cv={cv} ac={ac} fx={fx} photo={photo} chips />
      </Page>
    </Document>
  )
}

// ───────────────────────── Two-column (executive / technical) ─────────────────────────

function SideTitle({ title, fx, color }: { title: string; fx: PdfFonts; color: string }) {
  return <Text style={[fx.heading, { fontSize: 7.5, color, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 6 }]} minPresenceAhead={30}>{title}</Text>
}

const A4_H = 842
const SIDE_INNER = SIDEBAR_W - SIDEBAR_PAD * 2
// Safety margin for the sidebar fit check: an overestimate only moves a section, an underestimate breaks the page.
const SIDE_SLACK = 16
// Used only when real glyph metrics are unavailable (fallback fonts are not preloaded); deliberately wide.
const EM = 0.56

type FontkitLike = { layout(s: string): { advanceWidth: number }; unitsPerEm: number }

function textWidth(text: string, face: Face, size: number, letterSpacing = 0): number {
  try {
    const src = Font.getFont({ fontFamily: face.fontFamily, fontWeight: face.fontWeight }) as unknown as { data?: FontkitLike | null } | undefined
    const data = src?.data
    if (data && typeof data.layout === 'function' && data.unitsPerEm) {
      return (data.layout(text).advanceWidth / data.unitsPerEm) * size + letterSpacing * text.length
    }
  } catch {
    // Unregistered family: fall through to the estimate.
  }
  return text.length * (size * EM + letterSpacing)
}

function lineCount(text: string, face: Face, size: number, width: number, letterSpacing = 0): number {
  const space = textWidth(' ', face, size, letterSpacing)
  let lines = 1, x = 0
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = textWidth(word, face, size, letterSpacing)
    if (x > 0 && x + space + w > width) { lines++; x = 0 }
    if (w > width) { lines += Math.ceil(w / width) - 1; x = w % width; continue }
    x += (x > 0 ? space : 0) + w
  }
  return lines
}

/** Largest name size whose longest word fits the sidebar; a hyphenated token that never fits is broken after its hyphen. */
function fitSidebarName(name: string, face: Face, maxSize = 17, minSize = 12) {
  const text = name.split(' ')
    .map(tok => (textWidth(tok, face, minSize) <= SIDE_INNER || !tok.includes('-') ? tok : tok.replace(/-/g, '-\n')))
    .join(' ')
  let size = maxSize
  const words = text.split(/\s+/).filter(Boolean)
  while (size > minSize && words.some(w => textWidth(w, face, size) > SIDE_INNER)) size -= 0.5
  return { text, size }
}

type SideSection = 'tools' | 'langs' | 'certs'

/**
 * The sidebar is absolutely positioned on page 1 and react-pdf cannot continue an
 * absolute block cleanly onto page 2 (it lands at y=0 with no padding and disturbs
 * page breaks). So sections that would overflow are moved into the main column instead.
 */
function sidebarOverflow(fx: PdfFonts, p: { photo: boolean; name: { text: string; size: number }; title: string; contact: string[]; skills: string[]; tools: string[]; langs: number; certs: string[] }): Set<SideSection> {
  const lh = FS.small * LH
  const titleH = 7.5 * 1.2 + 6
  const block = (h: number) => titleH + h + sp.lg
  const lines = (t: string, face: Face, size: number, width = SIDE_INNER, ls = 0) => lineCount(t, face, size, width, ls)
  const chipRows = () => {
    let rows = 1, x = 0
    for (const s of p.skills) {
      const w = Math.min(SIDE_INNER, textWidth(s, fx.body, FS.small) + 14) + 4
      if (x > 0 && x + w - 4 > SIDE_INNER) { rows++; x = 0 }
      x += w
    }
    return rows
  }
  const nameLines = p.name.text.split('\n').reduce((n, seg) => n + lines(seg, fx.headingBold, p.name.size), 0)
  let used = PAGE_Y * 2
    + (p.photo ? 72 + sp.md : 0)
    + nameLines * p.name.size * 1.2
    + (p.title ? 4 + lines(p.title, fx.medium, FS.small, SIDE_INNER, 0.4) * FS.small * 1.35 : 0)
    + sp.md + sp.lg
    + (p.contact.length ? block(p.contact.reduce((h, t) => h + lines(t, fx.body, FS.small) * lh + 3, 0)) : 0)
    + (p.skills.length ? block(chipRows() * (FS.small * 1.2 + 6 + 4) - 4) : 0)
  const cost: Record<SideSection, number> = {
    tools: p.tools.length ? block(lines(p.tools.join('  ·  '), fx.body, FS.small) * lh) : 0,
    langs: p.langs ? block(p.langs * (lh + 3)) : 0,
    certs: p.certs.length ? block(p.certs.reduce((h, t) => h + lines(t, fx.body, FS.small, SIDE_INNER - 9) * lh + 3, 0)) : 0,
  }
  const limit = A4_H - SIDE_SLACK
  const moved = new Set<SideSection>()
  used += cost.tools + cost.langs + cost.certs
  for (const key of ['certs', 'langs', 'tools'] as SideSection[]) {
    if (used <= limit) break
    if (cost[key]) { moved.add(key); used -= cost[key] }
  }
  return moved
}

function CVPdfTwoColumn({ cv, ac, fx, photo }: Ctx) {
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean)
  const skills = (cv.skills || []).map(sk => sk.name).filter(Boolean)
  const tools = (cv.tools || []).filter(Boolean)
  const certs = (cv.certifications || []).filter(Boolean)
  const langs = (cv.languages || []).filter(l => l?.name)
  const highlights = (cv.highlights || []).filter(Boolean)
  const ctx = { cv, ac, fx, photo }
  const name = fitSidebarName(cv.name, fx.headingBold)
  const moved = sidebarOverflow(fx, { photo: !!photo, name, title: cv.title || '', contact, skills, tools, langs: langs.length, certs })
  const mainBody = { fontSize: FS.body, lineHeight: LH, color: muted }

  // A dark accent (e.g. navy) vanishes on the navy sidebar; keep a light one there.
  const sideAc = luminance(ac) < 0.2 ? c.accentLight : ac
  const onDark = 'rgba(255,255,255,0.84)'
  const onDarkMuted = 'rgba(255,255,255,0.5)'
  const sideBody = { fontSize: FS.small, lineHeight: LH, color: onDark }

  return (
    <Document>
      <Page size="A4" style={[fx.body, { backgroundColor: paper, paddingTop: PAGE_Y, paddingBottom: PAGE_Y, paddingLeft: SIDEBAR_W + 30, paddingRight: 38, fontSize: FS.body, color: muted }]}>
        {/* Sidebar band repeats on every page so continuation pages keep the same left margin. */}
        <View fixed style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: SIDEBAR_W, backgroundColor: navy }} />

        {/* Sidebar content is absolutely placed so the main column's x-offset never depends on it. */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: SIDEBAR_W, paddingTop: PAGE_Y, paddingBottom: PAGE_Y, paddingHorizontal: SIDEBAR_PAD }}>
          {photo ? <View style={{ alignItems: 'center', marginBottom: sp.md }}><Photo src={photo} size={72} /></View> : null}

          <View style={{ paddingBottom: sp.md, marginBottom: sp.lg, borderBottomWidth: 0.6, borderBottomColor: 'rgba(255,255,255,0.15)' }} wrap={false}>
            <Text style={[fx.headingBold, { fontSize: name.size, lineHeight: 1.2, color: paper }]}>{name.text}</Text>
            {cv.title ? <Text style={[fx.medium, { fontSize: FS.small, lineHeight: 1.35, color: sideAc, marginTop: 4, letterSpacing: 0.4 }]}>{cv.title}</Text> : null}
          </View>

          {contact.length > 0 && (
            <View style={{ marginBottom: sp.lg }} wrap={false}>
              <SideTitle title="Contact" fx={fx} color={sideAc} />
              {contact.map((it, i) => <Text key={i} style={[fx.body, sideBody, { marginBottom: 3 }]}>{it}</Text>)}
            </View>
          )}

          {has(skills) && (
            <View style={{ marginBottom: sp.lg }}>
              <SideTitle title="Skills" fx={fx} color={sideAc} />
              <Chips items={skills} bg="rgba(255,255,255,0.1)" color={onDark} fx={fx} />
            </View>
          )}

          {has(tools) && !moved.has('tools') && (
            <View style={{ marginBottom: sp.lg }} wrap={false}>
              <SideTitle title="Tech Stack" fx={fx} color={sideAc} />
              <Text style={[fx.body, sideBody]}>{tools.join('  ·  ')}</Text>
            </View>
          )}

          {has(langs) && !moved.has('langs') && (
            <View style={{ marginBottom: sp.lg }} wrap={false}>
              <SideTitle title="Languages" fx={fx} color={sideAc} />
              {langs.map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={[fx.body, sideBody]}>{l.name}</Text>
                  <Text style={[fx.body, sideBody, { color: onDarkMuted }]}>{lvLabel(l.level)}</Text>
                </View>
              ))}
            </View>
          )}

          {has(certs) && !moved.has('certs') && (
            <View>
              <SideTitle title="Certifications" fx={fx} color={sideAc} />
              {certs.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }} wrap={false}>
                  <Text style={[fx.bold, sideBody, { width: 9, color: sideAc }]}>{BULLET}</Text>
                  <Text style={[fx.body, sideBody, { flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main column */}
        {cv.summary ? (
          <>
            <SectionTitle title="Profile" ac={ac} fx={fx} color={navy} />
            <Text style={[fx.body, { fontSize: FS.body, lineHeight: LH, color: muted }]}>{cv.summary}</Text>
          </>
        ) : null}

        {has(cv.stats) && <StatsRow {...ctx} compact />}

        {has(cv.experience) && (
          <>
            <SectionTitle title="Experience" ac={ac} fx={fx} color={navy} />
            <ExperienceBlock {...ctx} roleSize={10.5} />
          </>
        )}

        {has(cv.education) && (
          <>
            <SectionTitle title="Education" ac={ac} fx={fx} color={navy} />
            <EducationBlock {...ctx} />
          </>
        )}

        {has(highlights) && (
          <>
            <SectionTitle title="Key Highlights" ac={ac} fx={fx} color={navy} />
            {highlights.map((t, i) => <Bullet key={i} text={t} ac={ac} fx={fx} />)}
          </>
        )}

        {moved.has('certs') && (
          <>
            <SectionTitle title="Certifications" ac={ac} fx={fx} color={navy} />
            {certs.map((t, i) => <Bullet key={i} text={t} ac={ac} fx={fx} />)}
          </>
        )}

        {moved.has('langs') && (
          <>
            <SectionTitle title="Languages" ac={ac} fx={fx} color={navy} />
            <Text style={[fx.body, mainBody]} wrap={false}>{langs.map(l => `${l.name} (${lvLabel(l.level)})`).join(DOT_SEP)}</Text>
          </>
        )}

        {moved.has('tools') && (
          <>
            <SectionTitle title="Tech Stack" ac={ac} fx={fx} color={navy} />
            <Text style={[fx.medium, mainBody, { color: ink }]} wrap={false}>{tools.join(DOT_SEP)}</Text>
          </>
        )}
      </Page>
    </Document>
  )
}

// ───────────────────────── Entry point ─────────────────────────

export function CVPdfDocument({ cv, ac, template, photo, fonts }: { cv: CVData; ac: string; template?: string; photo?: string; fonts?: PdfFonts }) {
  const fx = fonts || FALLBACK_FONTS
  const safe: CVData = {
    ...cv,
    name: cv.name || '',
    stats: cv.stats || [], skills: cv.skills || [], experience: cv.experience || [], education: cv.education || [],
    certifications: cv.certifications || [], languages: cv.languages || [], tools: cv.tools || [], highlights: cv.highlights || [],
  }
  if (template && TWO_COL_TEMPLATES.includes(template)) return <CVPdfTwoColumn cv={safe} ac={ac} fx={fx} photo={photo} />
  if (template && BANDED_TEMPLATES.includes(template)) return <CVPdfModern cv={safe} ac={ac} fx={fx} photo={photo} />
  return <CVPdfMinimal cv={safe} ac={ac} fx={fx} photo={photo} />
}
