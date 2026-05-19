/**
 * CVPdf — @react-pdf/renderer document for India CV builder.
 * Pure PDF layout: no canvas, no DOM capture, no page-slice overlap.
 * Renders from structured CVData — works for all visual templates.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

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

const navy  = '#0d2137'
const grey  = '#6b7c93'
const light = '#8fa3b8'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingTop: 38,
    paddingBottom: 38,
    paddingLeft: 50,
    paddingRight: 50,
  },
  // ── Header ──
  name:    { fontSize: 24, fontFamily: 'Helvetica-Bold', color: navy, marginBottom: 4 },
  title:   { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 3, letterSpacing: 0.5 },
  tagline: { fontSize: 9.5, fontFamily: 'Helvetica-Oblique', color: grey, marginBottom: 8 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  contactItem: { fontSize: 9, color: grey },
  divider: { height: 0.75, backgroundColor: '#d1dae6', marginBottom: 4 },
  // ── Section header ──
  secRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 7 },
  secLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: navy, textTransform: 'uppercase', letterSpacing: 1.2 },
  secLine:  { flex: 1, height: 0.5, backgroundColor: '#d1dae6', marginLeft: 8 },
  // ── Body text ──
  body:  { fontSize: 10.5, color: '#374151', lineHeight: 1.7 },
  // ── Stats ──
  statsRow: { flexDirection: 'row', marginBottom: 10, marginTop: 4 },
  statBox:  { marginRight: 10, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f8fafc', borderRadius: 6 },
  statVal:  { fontSize: 16, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  statLbl:  { fontSize: 8, color: light, marginTop: 2 },
  // ── Experience ──
  expBlock:  { marginBottom: 14 },
  expHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  expRole:   { fontSize: 12, fontFamily: 'Helvetica-Bold', color: navy },
  expPeriod: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  expMeta:   { fontSize: 9.5, fontFamily: 'Helvetica-Oblique', color: grey, marginBottom: 5 },
  bullet:    { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { fontSize: 10, width: 12 },
  bulletTxt: { flex: 1, fontSize: 10, color: '#374151', lineHeight: 1.6 },
  // ── Education ──
  eduRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  eduDeg:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: navy },
  eduSch:  { fontSize: 10, color: grey },
  eduYr:   { fontSize: 10, color: light },
})

function SecHeader({ title }: { title: string }) {
  return (
    <View style={s.secRow}>
      <Text style={s.secLabel}>{title}</Text>
      <View style={s.secLine} />
    </View>
  )
}

export function CVPdfDocument({ cv, ac, photo }: { cv: CVData; ac: string; photo?: string }) {
  const lvLabel = (l: number) =>
    l >= 90 ? 'Native' : l >= 75 ? 'Fluent' : l >= 55 ? 'Proficient' : 'Basic'

  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        {photo && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
            <Image src={photo} style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16, objectFit: 'cover' }} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{cv.name}</Text>
              <Text style={[s.title, { color: ac }]}>{cv.title}</Text>
              {cv.tagline ? <Text style={s.tagline}>{cv.tagline}</Text> : null}
            </View>
          </View>
        )}
        {!photo && (
          <>
            <Text style={s.name}>{cv.name}</Text>
            <Text style={[s.title, { color: ac }]}>{cv.title}</Text>
            {cv.tagline ? <Text style={s.tagline}>{cv.tagline}</Text> : null}
          </>
        )}

        {/* Contact bar */}
        {contact.length > 0 && (
          <View style={s.contactRow}>
            {contact.map((c, i) => (
              <Text key={i} style={s.contactItem}>
                {c}{i < contact.length - 1 ? '  |  ' : ''}
              </Text>
            ))}
          </View>
        )}

        <View style={s.divider} />

        {/* ── Stats ── */}
        {cv.stats?.length > 0 && (
          <View style={s.statsRow}>
            {cv.stats.map((st, i) => (
              <View key={i} style={s.statBox}>
                <Text style={[s.statVal, { color: ac }]}>{st.value}</Text>
                <Text style={s.statLbl}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Summary ── */}
        {cv.summary ? (
          <>
            <SecHeader title="Professional Summary" />
            <Text style={s.body}>{cv.summary}</Text>
          </>
        ) : null}

        {/* ── Skills ── */}
        {cv.skills.length > 0 ? (
          <>
            <SecHeader title="Core Skills" />
            <Text style={s.body}>{cv.skills.map(sk => sk.name).join('  ·  ')}</Text>
          </>
        ) : null}

        {/* ── Tools ── */}
        {cv.tools.length > 0 ? (
          <>
            <SecHeader title="Tech Stack" />
            <Text style={[s.body, { color: ac }]}>{cv.tools.join('  ·  ')}</Text>
          </>
        ) : null}

        {/* ── Experience ── */}
        {cv.experience.length > 0 ? (
          <>
            <SecHeader title="Professional Experience" />
            {cv.experience.map((exp, i) => (
              <View key={i} style={s.expBlock} wrap={false}>
                <View style={s.expHead}>
                  <Text style={s.expRole}>{exp.role}</Text>
                  <Text style={[s.expPeriod, { color: ac }]}>{exp.period}</Text>
                </View>
                <Text style={s.expMeta}>
                  {[exp.company, exp.location, exp.type].filter(Boolean).join('  ·  ')}
                </Text>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={[s.bulletDot, { color: ac }]}>•</Text>
                    <Text style={s.bulletTxt}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {/* ── Education ── */}
        {cv.education.length > 0 ? (
          <>
            <SecHeader title="Education" />
            {cv.education.map((e, i) => (
              <View key={i} style={s.eduRow}>
                <View>
                  <Text style={s.eduDeg}>{e.degree}</Text>
                  <Text style={s.eduSch}>{e.school}</Text>
                </View>
                <Text style={s.eduYr}>{e.year}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* ── Certifications ── */}
        {cv.certifications.length > 0 ? (
          <>
            <SecHeader title="Certifications" />
            {cv.certifications.map((c, i) => (
              <View key={i} style={s.bullet}>
                <Text style={[s.bulletDot, { color: ac }]}>•</Text>
                <Text style={s.bulletTxt}>{c}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* ── Languages ── */}
        {cv.languages.length > 0 ? (
          <>
            <SecHeader title="Languages" />
            <Text style={s.body}>
              {cv.languages.map((l, i) =>
                `${l.name} (${lvLabel(l.level)})${i < cv.languages.length - 1 ? '  ·  ' : ''}`
              )}
            </Text>
          </>
        ) : null}

        {/* ── Highlights ── */}
        {cv.highlights?.length > 0 ? (
          <>
            <SecHeader title="Key Highlights" />
            {cv.highlights.map((h, i) => (
              <View key={i} style={s.bullet}>
                <Text style={[s.bulletDot, { color: ac }]}>›</Text>
                <Text style={s.bulletTxt}>{h}</Text>
              </View>
            ))}
          </>
        ) : null}

      </Page>
    </Document>
  )
}
