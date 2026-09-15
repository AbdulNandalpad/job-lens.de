// Pure CV data helpers shared by client pages and API routes (no React, no I/O).

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
  experience: {
    role: string
    company: string
    period: string
    location: string
    type: string
    bullets: string[]
  }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
  matchGaps: { requirement: string; missing: string; workaround: string; idealAddition: string }[]
}

export const EMPTY_CV: CVData = {
  name: '', title: '', tagline: '', email: '', phone: '', location: '', linkedin: '',
  summary: '', stats: [], skills: [], experience: [], education: [],
  certifications: [], languages: [], tools: [], highlights: [], matchGaps: [],
}

export function normalizeCv(data: Partial<CVData>): CVData {
  const sa = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : []
  return {
    ...EMPTY_CV,
    ...data,
    name:           typeof data.name    === 'string' ? data.name    : '',
    title:          typeof data.title   === 'string' ? data.title   : '',
    summary:        typeof data.summary === 'string' ? data.summary : '',
    stats:          sa(data.stats),
    skills:         sa(data.skills),
    certifications: sa(data.certifications),
    languages:      sa(data.languages),
    tools:          sa(data.tools),
    highlights:     sa(data.highlights),
    matchGaps:      sa(data.matchGaps),
    education:      sa(data.education),
    experience:     sa(data.experience).map((raw) => {
      const e = raw as Partial<CVData['experience'][0]>
      return { role: '', company: '', period: '', location: '', type: '', ...e, bullets: Array.isArray(e?.bullets) ? e.bullets! : [] }
    }),
  }
}

/** Tolerant parse of a model/JSON CV string: strips fences, takes the outermost object. */
export function parseCvJson(raw: string | null | undefined): CVData | null {
  if (!raw) return null
  const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(s.slice(start, end + 1))
    if (!parsed || typeof parsed !== 'object' || typeof parsed.name !== 'string') return null
    return normalizeCv(parsed as Partial<CVData>)
  } catch {
    return null
  }
}

function looksLikeCvJson(raw: string): boolean {
  const t = raw.trimStart()
  return t.startsWith('{') || t.startsWith('```')
}

/**
 * Plain-text rendering of a tailored CV. Cover letters, skill-gap checks and ATS scans
 * must receive prose, never the tailored CV's raw JSON. Non-JSON input passes through.
 */
export function cvTextFromTailored(input: string | CVData | null | undefined): string {
  if (!input) return ''
  let cv: CVData | null = null
  if (typeof input === 'string') {
    if (!looksLikeCvJson(input)) return input
    cv = parseCvJson(input)
    if (!cv) return input
  } else {
    cv = normalizeCv(input)
  }

  const lines: string[] = []
  if (cv.name) lines.push(cv.name)
  if (cv.title) lines.push(cv.title)
  if (cv.tagline) lines.push(cv.tagline)
  const contact = [cv.email && `Email: ${cv.email}`, cv.phone && `Phone: ${cv.phone}`, cv.location && `Location: ${cv.location}`, cv.linkedin && `LinkedIn: ${cv.linkedin}`].filter(Boolean)
  if (contact.length) lines.push(contact.join(' | '))
  if (cv.summary) lines.push('', 'Summary:', cv.summary)
  if (cv.highlights.length) lines.push('', 'Highlights:', ...cv.highlights.map(h => `- ${h}`))
  if (cv.experience.length) {
    lines.push('', 'Experience:')
    for (const e of cv.experience) {
      const meta = [e.company, e.location, e.type].filter(Boolean).join(', ')
      lines.push(`${e.role}${meta ? ` — ${meta}` : ''}${e.period ? ` (${e.period})` : ''}`)
      for (const b of e.bullets) lines.push(`  - ${b}`)
    }
  }
  if (cv.skills.length) lines.push('', `Skills: ${cv.skills.map(s => s.name).filter(Boolean).join(', ')}`)
  if (cv.tools.length) lines.push(`Tools: ${cv.tools.join(', ')}`)
  if (cv.education.length) lines.push('', 'Education:', ...cv.education.map(e => `${e.degree}${e.school ? `, ${e.school}` : ''}${e.year ? ` (${e.year})` : ''}`))
  if (cv.certifications.length) lines.push('', `Certifications: ${cv.certifications.join(', ')}`)
  if (cv.languages.length) lines.push(`Languages: ${cv.languages.map(l => l.name).filter(Boolean).join(', ')}`)
  return lines.join('\n').trim()
}

/** Small, stable, non-cryptographic hash for client-side cache/draft keys. */
export function hashString(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}
