// Chancenkarte (Opportunity Card, §20a) points-system model — the same
// verified 2026 rules as visaGuides.ts and the /api/visa prompt (all sourced
// from make-it-in-germany.com, verified 2026-07-28). Pure data + pure
// function so the public calculator needs no API call and costs nothing.

export interface ChancenkarteAnswers {
  // Baseline gates (Option 2 requires BOTH a qualifying education and language)
  qualification: 'none' | 'vocational' | 'degree' | 'recognised'
  germanLevel:   'none' | 'a1' | 'a2' | 'b1' | 'b2plus'
  englishLevel:  'below_b2' | 'b2' | 'c1plus'
  // Point criteria
  partialEquivalence: boolean
  shortageOccupation: boolean
  experience: 'none' | 'two_in_five' | 'five_in_seven'
  age: 'under35' | 'from35to40' | 'over40'
  priorStay: boolean
  partnerEligible: boolean
}

export interface PointLine {
  label: string
  points: number
}

export interface ChancenkarteResult {
  option1: boolean            // fully recognised qualification — no points needed
  baselineQualification: boolean
  baselineLanguage: boolean
  points: number
  needed: number
  lines: PointLine[]          // only the criteria that scored > 0
  verdict: 'option1' | 'eligible' | 'points_short' | 'baseline_missing'
}

export const POINTS_NEEDED = 6

export function scoreChancenkarte(a: ChancenkarteAnswers): ChancenkarteResult {
  if (a.qualification === 'recognised') {
    return {
      option1: true,
      baselineQualification: true,
      baselineLanguage: true,
      points: 0,
      needed: POINTS_NEEDED,
      lines: [],
      verdict: 'option1',
    }
  }

  const baselineQualification = a.qualification === 'vocational' || a.qualification === 'degree'
  const baselineLanguage = a.germanLevel !== 'none' || a.englishLevel !== 'below_b2'

  const lines: PointLine[] = []
  const add = (label: string, points: number) => { if (points > 0) lines.push({ label, points }) }

  add('Qualification partially recognised in Germany', a.partialEquivalence ? 4 : 0)
  add('Qualification in a shortage occupation', a.shortageOccupation ? 1 : 0)
  add(
    a.experience === 'five_in_seven' ? 'Professional experience: 5+ years in the last 7' : 'Professional experience: 2+ years in the last 5',
    a.experience === 'five_in_seven' ? 3 : a.experience === 'two_in_five' ? 2 : 0,
  )
  add(
    a.germanLevel === 'b2plus' ? 'German B2 or higher' : a.germanLevel === 'b1' ? 'German B1' : 'German A2',
    a.germanLevel === 'b2plus' ? 3 : a.germanLevel === 'b1' ? 2 : a.germanLevel === 'a2' ? 1 : 0,
  )
  add('English C1 or native speaker (bonus)', a.englishLevel === 'c1plus' ? 1 : 0)
  add(
    a.age === 'under35' ? 'Age under 35' : 'Age 35–40',
    a.age === 'under35' ? 2 : a.age === 'from35to40' ? 1 : 0,
  )
  add('6+ months of legal stay in Germany in the last 5 years', a.priorStay ? 1 : 0)
  add('Spouse or partner is also Opportunity-Card-eligible', a.partnerEligible ? 1 : 0)

  const points = lines.reduce((s, l) => s + l.points, 0)

  const verdict: ChancenkarteResult['verdict'] =
    !baselineQualification || !baselineLanguage ? 'baseline_missing'
    : points >= POINTS_NEEDED ? 'eligible'
    : 'points_short'

  return { option1: false, baselineQualification, baselineLanguage, points, needed: POINTS_NEEDED, lines, verdict }
}
