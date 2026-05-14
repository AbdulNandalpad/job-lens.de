import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FALLBACK = {
  suggestedQuery: '',
  queryFallbacks: [] as string[],
  skills: [] as string[],
  titles: [] as string[],
  seniority: '',
  industries: [] as string[],
  languages: [] as string[],
  summary: '',
}

export async function POST(req: NextRequest) {
  let targetRole = ''
  try {
    const body = await req.json()
    const { linkedinText, cvText, experience, jobTypes } = body
    targetRole = body.targetRole || ''
    const profileText = (linkedinText || cvText || '').trim()

    // No profile and no role — nothing to work with
    if (!profileText && !targetRole) return NextResponse.json(FALLBACK)

    // No profile — return targetRole simplified, no AI needed
    if (!profileText) {
      const simplified = targetRole.split(/[\s,]+/).slice(0, 3).join(' ')
      return NextResponse.json({
        ...FALLBACK,
        suggestedQuery: simplified,
        queryFallbacks: [targetRole.split(/\s+/)[0]],
        titles: [targetRole],
        seniority: experience || '',
      })
    }

    const prompt = `You are a DACH job search expert. Read the candidate's CV and their target role, then produce a search query that finds real job listings on Adzuna.

CRITICAL RULE FOR suggestedQuery:
- Must be 2–3 words maximum. Job boards fail on long queries.
- Must reflect BOTH what the CV shows AND what the candidate wants.
- If the target role aligns with the CV: simplify it (e.g. "SAP CX Consultant" → "SAP Consultant")
- If the target role is aspirational but plausible given the CV: use an intermediate title (e.g. CV shows "Project Lead", target is "Director" → "Senior Project Manager")
- If the target role is completely unrelated to the CV: use the strongest role from the CV and put target role in queryFallbacks.
- NEVER output a query longer than 3 words. NEVER include company names, locations, or seniority adjectives.

${targetRole ? `Candidate's target role: "${targetRole}"` : 'No target role specified — extract best-fit role from CV.'}

CV / Profile text:
---
${profileText.slice(0, 7000)}
---

Additional context:
${experience ? `- Experience level: ${experience}` : ''}
${jobTypes?.length ? `- Job types: ${jobTypes.join(', ')}` : ''}

Return ONLY valid JSON, no markdown:
{
  "suggestedQuery": "<2-3 word job search query that bridges CV and target role>",
  "queryFallbacks": ["<1-2 word alternative>", "<1-2 word alternative>", "<core skill from CV>"],
  "skills": ["<top 8 specific technical/professional skills from CV>"],
  "titles": ["<most accurate current title from CV>", "<second fit>", "<target-aligned title>"],
  "seniority": "<Junior|Mid|Senior|Lead|Director>",
  "industries": ["<industry 1>", "<industry 2>", "<industry 3>"],
  "languages": ["<language + level e.g. German C2>"],
  "summary": "<one sentence profile summary from CV content>"
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')

    const profile = JSON.parse(clean.slice(start, end + 1))

    // Ensure suggestedQuery is never empty or too long
    if (!profile.suggestedQuery?.trim()) {
      profile.suggestedQuery = targetRole
        ? targetRole.split(/\s+/).slice(0, 2).join(' ')
        : (profile.titles?.[0] || '').split(/\s+/).slice(0, 2).join(' ')
    } else {
      // Hard-limit to 3 words in case AI ignores the instruction
      const words = profile.suggestedQuery.trim().split(/\s+/)
      if (words.length > 3) profile.suggestedQuery = words.slice(0, 3).join(' ')
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.error('Profile analysis error:', err)
    return NextResponse.json({
      ...FALLBACK,
      suggestedQuery: targetRole ? targetRole.split(/\s+/).slice(0, 2).join(' ') : '',
      queryFallbacks: targetRole ? [targetRole.split(/\s+/)[0]] : [],
    })
  }
}
