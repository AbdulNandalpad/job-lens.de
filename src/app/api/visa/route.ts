import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.json()
  // Sanitise every field — never inject unsanitised client input into an LLM prompt
  const market = raw.market === MARKET.in ? MARKET.in : MARKET.eu
  const body = {
    citizenship:          typeof raw.citizenship          === 'string' ? raw.citizenship.slice(0, 100)          : '',
    isEU:                 Boolean(raw.isEU),
    qualification:        typeof raw.qualification        === 'string' ? raw.qualification.slice(0, 100)        : '',
    qualificationField:   typeof raw.qualificationField   === 'string' ? raw.qualificationField.slice(0, 100)   : '',
    qualificationCountry: typeof raw.qualificationCountry === 'string' ? raw.qualificationCountry.slice(0, 100) : '',
    germanLevel:          typeof raw.germanLevel          === 'string' ? raw.germanLevel.slice(0, 20)           : '',
    experience:           typeof raw.experience           === 'string' ? raw.experience.slice(0, 50)            : '',
    hasJobOffer:          typeof raw.hasJobOffer          === 'string' ? raw.hasJobOffer.slice(0, 20)           : '',
    offeredSalary:        typeof raw.offeredSalary        === 'string' ? raw.offeredSalary.slice(0, 20)         : '',
    targetField:          typeof raw.targetField          === 'string' ? raw.targetField.slice(0, 100)          : '',
    germanyConnection:    typeof raw.germanyConnection    === 'string' ? raw.germanyConnection.slice(0, 100)    : '',
    age:                  typeof raw.age                  === 'string' ? raw.age.slice(0, 10)                   : '',
  }
  const credits = await checkAndDeductCredits(
    user.id, CREDIT_COST.visaCheck, 'visa_check', user.email ?? '', market
  )
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: CREDIT_COST.visaCheck }, { status: 402 })
  }

  const prompt = `You are an expert in German immigration law, specifically the Fachkräfteeinwanderungsgesetz (FEG) 2023 and all subsequent amendments including the 2024 Chancenkarte reform.

Analyse this applicant profile and determine their visa eligibility for working in Germany:

APPLICANT PROFILE:
- Citizenship: ${body.citizenship}
- EU Citizen: ${body.isEU ? 'Yes (free movement — no visa needed, skip to work tips)' : 'No'}
- Highest Qualification: ${body.qualification} (${body.qualificationField})
- Qualification Country: ${body.qualificationCountry}
- German Language Level: ${body.germanLevel}
- Years of Work Experience: ${body.experience}
- Job Offer in Germany: ${body.hasJobOffer} ${body.offeredSalary ? `(offered salary: €${body.offeredSalary}/year)` : ''}
- Target Field in Germany: ${body.targetField}
- Previous Germany Connection: ${body.germanyConnection}
- Age: ${body.age}

KEY THRESHOLDS (2024):
- EU Blue Card general salary threshold: €45,300/year
- EU Blue Card shortage occupations (IT, engineering, healthcare, natural sciences, maths, teaching): €41,042/year
- Chancenkarte points needed: minimum 6 points
  - Qualified profession in shortage occupation: 6 points
  - Otherwise qualified: 4 points
  - German B2+: 3 points, B1: 2 points, A2: 1 point
  - Age under 35: 2 points, 35-40: 1 point
  - 5+ years experience: 2 points, 2-5 years: 1 point
  - Previous stay in Germany or German family member: 1 point
- Fachkraft mit akademischer Ausbildung: recognised degree + job offer in field (no salary threshold)
- Fachkraft mit Berufsausbildung: recognised vocational qualification + job offer in that occupation
- Anerkennungsvisum: for those who need to get their qualification officially recognised in Germany first

Return ONLY valid JSON (no markdown):
{
  "isEU": <boolean>,
  "euNote": "<if EU citizen, brief note about free movement rights>",
  "visaOptions": [
    {
      "id": "<blue_card|fachkraft_academic|fachkraft_vocational|chancenkarte|anerkennungsvisum>",
      "title": "<visa name in English and German>",
      "emoji": "<relevant emoji>",
      "eligibility": "<eligible|partial|not_eligible>",
      "matchScore": <0-100>,
      "headline": "<one-line verdict>",
      "metRequirements": ["<requirement met>"],
      "missingRequirements": ["<requirement not met or unclear>"],
      "timeline": "<realistic timeline to arrive in Germany e.g. '3-6 months'>",
      "keyAdvantage": "<main benefit of this path>",
      "nextStep": "<most important single action to take now>"
    }
  ],
  "recommendedPath": "<id of the best visa option>",
  "chancenkartePoints": <calculated points if applicable, else null>,
  "qualificationRecognitionNeeded": <boolean>,
  "recognitionBody": "<relevant German recognition authority if applicable e.g. anabin, IHK, Kultusministerkonferenz>",
  "documents": [
    { "category": "<category name>", "items": ["<document>"] }
  ],
  "urgentWarnings": ["<any blockers or time-sensitive issues>"],
  "usefulLinks": [],
  "summary": "<3-4 sentence personalised summary of their situation and best path>"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { text: string }).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(jsonStr)

    // Always override usefulLinks with verified official German immigration resources.
    // Never trust Claude to generate URLs — they can be hallucinated or outdated.
    const OFFICIAL_LINKS = [
      { label: 'Make it in Germany (official portal)', url: 'https://www.make-it-in-germany.com/en/' },
      { label: 'EU Blue Card Germany', url: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card' },
      { label: 'Chancenkarte (Opportunity Card)', url: 'https://www.make-it-in-germany.com/en/visa-residence/opportunity-card/job-search' },
      { label: 'Fachkräfteeinwanderungsgesetz overview', url: 'https://www.make-it-in-germany.com/en/visa-residence/skilled-immigration-act' },
      { label: 'Qualification recognition (Anerkennung)', url: 'https://www.anerkennung-in-deutschland.de/html/en/index.php' },
      { label: 'Anabin database (degree recognition)', url: 'https://anabin.kmk.org/anabin.html' },
      { label: 'BAMF — Federal Office for Migration', url: 'https://www.bamf.de/EN/Themen/MigrationAufenthalt/migrationaufenthalt-node.html' },
      { label: 'German embassy visa applications', url: 'https://www.auswaertiges-amt.de/en/visa-service' },
    ]
    result.usefulLinks = OFFICIAL_LINKS

    return NextResponse.json({ ...result, creditsRemaining: credits.remaining })
  } catch (err) {
    console.error('Visa check error:', err)
    return NextResponse.json({ error: 'Failed to analyse visa eligibility' }, { status: 500 })
  }
}
