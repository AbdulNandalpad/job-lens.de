/**
 * CVPdf — @react-pdf/renderer document for Job-Lens CV builder.
 * Pure PDF layout: no canvas, no DOM capture, no page-slice overlap.
 * template param: 'executive'|'technical'|'executive2' → two-column sidebar layout
 * all others → single-column clean layout
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

const TWO_COL_TEMPLATES = ['executive', 'technical', 'executive2']

function CVPdfTwoColumn({ cv, ac, photo }: { cv: CVData; ac: string; photo?: string }) {
  const lvLabel = (l: number) =>
    l >= 90 ? 'Native' : l >= 75 ? 'Fluent' : l >= 55 ? 'Proficient' : 'Basic'

  const sidebarBg = '#0d2137'
  const sidebarText = 'rgba(255,255,255,0.75)'
  const sidebarMuted = 'rgba(255,255,255,0.4)'

  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'Helvetica', backgroundColor: '#ffffff', flexDirection: 'row', minHeight: '100%' }}>

        {/* ── Left sidebar ── */}
        <View style={{ width: 185, backgroundColor: sidebarBg, padding: 28, flexDirection: 'column', gap: 20 }}>

          {/* Photo */}
          {photo && (
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <Image src={photo} style={{ width: 60, height: 60, borderRadius: 30 }} />
            </View>
          )}
          {/* Name + title */}
          <View style={{ paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 4 }}>{cv.name}</Text>
            <Text style={{ fontSize: 8.5, color: ac, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, textTransform: 'uppercase' }}>{cv.title}</Text>
          </View>

          {/* Contact */}
          {contact.length > 0 && (
            <View>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: sidebarMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Contact</Text>
              {contact.map((c, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: sidebarText, marginBottom: 5, lineHeight: 1.4 }}>{c}</Text>
              ))}
            </View>
          )}

          {/* Skills */}
          {cv.skills?.length > 0 && (
            <View>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: sidebarMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Skills</Text>
              {cv.skills.map((sk, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 8.5, color: sidebarText, marginBottom: 2 }}>{sk.name}</Text>
                  <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <View style={{ height: 3, width: `${sk.level}%`, backgroundColor: ac, borderRadius: 2 }} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Languages */}
          {cv.languages?.length > 0 && (
            <View>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: sidebarMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Languages</Text>
              {cv.languages.map((l, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: sidebarText, marginBottom: 4 }}>{l.name} — {lvLabel(l.level)}</Text>
              ))}
            </View>
          )}

          {/* Tools */}
          {cv.tools?.length > 0 && (
            <View>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: sidebarMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Tech Stack</Text>
              <Text style={{ fontSize: 8.5, color: sidebarText, lineHeight: 1.6 }}>{cv.tools.join('  ·  ')}</Text>
            </View>
          )}

        </View>

        {/* ── Right main content ── */}
        <View style={{ flex: 1, padding: 28, flexDirection: 'column' }}>

          {/* Summary */}
          {cv.summary && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: navy, textTransform: 'uppercase', letterSpacing: 1 }}>Profile</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#d1dae6', marginLeft: 8 }} />
              </View>
              <Text style={{ fontSize: 9.5, color: '#374151', lineHeight: 1.6 }}>{cv.summary}</Text>
            </View>
          )}

          {/* Stats */}
          {cv.stats?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {cv.stats.map((st, i) => (
                <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f8fafc', borderRadius: 4 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: ac }}>{st.value}</Text>
                  <Text style={{ fontSize: 7.5, color: grey }}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Experience */}
          {cv.experience?.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: navy, textTransform: 'uppercase', letterSpacing: 1 }}>Experience</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#d1dae6', marginLeft: 8 }} />
              </View>
              {cv.experience.map((exp, i) => (
                <View key={i} style={{ marginBottom: 12 }} wrap={false}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
                    <Text style={{ fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: navy }}>{exp.role}</Text>
                    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: ac }}>{exp.period}</Text>
                  </View>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Oblique', color: grey, marginBottom: 4 }}>
                    {[exp.company, exp.location, exp.type].filter(Boolean).join('  ·  ')}
                  </Text>
                  {exp.bullets.map((b, j) => (
                    <View key={j} style={{ flexDirection: 'row', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9, color: ac, width: 10 }}>•</Text>
                      <Text style={{ flex: 1, fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Education */}
          {cv.education?.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: navy, textTransform: 'uppercase', letterSpacing: 1 }}>Education</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#d1dae6', marginLeft: 8 }} />
              </View>
              {cv.education.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: navy }}>{e.degree}</Text>
                    <Text style={{ fontSize: 9, color: grey }}>{e.school}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: light }}>{e.year}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Certifications */}
          {cv.certifications?.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: navy, textTransform: 'uppercase', letterSpacing: 1 }}>Certifications</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#d1dae6', marginLeft: 8 }} />
              </View>
              {cv.certifications.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: ac, width: 10 }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 9, color: '#374151' }}>{c}</Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </Page>
    </Document>
  )
}

export function CVPdfDocument({ cv, ac, template, photo }: { cv: CVData; ac: string; template?: string; photo?: string }) {
  if (template && TWO_COL_TEMPLATES.includes(template)) {
    return <CVPdfTwoColumn cv={cv} ac={ac} photo={photo} />
  }
  return <CVPdfSingleColumn cv={cv} ac={ac} photo={photo} />
}

function CVPdfSingleColumn({ cv, ac, photo }: { cv: CVData; ac: string; photo?: string }) {
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
