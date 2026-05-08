import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { linkedinText, cvText, targetRole, experience, jobTypes, salaryMin, salaryMax } = await req.json()

    const profileText = linkedinText || cvText || ''

    if (!profileText && !targetRole) {
      return NextResponse.json({
        suggestedQuery: '',
        skills: [],
        titles: [],
        seniority: '',
        industries: [],
        languages: [],
        summary: '',
      })
    }

    // If no CV/LinkedIn, just use target role as-is
    if (!profileText) {
      return NextResponse.json({
        suggestedQuery: targetRole,
        skills: [],
        titles: [targetRole],
        seniority: experience || '',
        industries: [],
        languages: [],
        summary: '',
      })
    }

    const systemPrompt = `You are a career profile analyser. Extract structured data from a CV or LinkedIn profile.
Return ONLY valid JSON, no markdown, no explanation.`

    const userPrompt = `Analyse this profile and return a JSON object with these fields:
- suggestedQuery: string — best job search query (2-5 words, job title focused) based on the profile${targetRole ? `. User's target role is "${targetRole}" — use this as the primary anchor` : ''}
- skills: string[] — top 8 most relevant technical and professional skills
- titles: string[] — 3 most suitable job titles for this person
- seniority: string — one of: Junior, Mid, Senior, Lead, Director
- industries: string[] — top 3 industries this person has worked in
- languages: string[] — spoken languages with level e.g. ["German C2", "English C1"]
- summary: string — one sentence profile summary

Additional context from user:
${experience ? `- Experience level: ${experience}` : ''}
${jobTypes?.length ? `- Job types wanted: ${jobTypes.join(', ')}` : ''}
${salaryMin || salaryMax ? `- Salary expectation: ${salaryMin || ''}${salaryMax ? ` - ${salaryMax}` : ''}` : ''}

Profile text:
${profileText.slice(0, 8000)}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    // Parse JSON response
    const clean = text.replace(/```json|```/g, '').trim()
    const profile = JSON.parse(clean)

    return NextResponse.json(profile)
  } catch (err) {
    console.error('Profile analysis error:', err)
    // Fallback — don't break the search, just return basic data
    return NextResponse.json({
      suggestedQuery: '',
      skills: [],
      titles: [],
      seniority: '',
      industries: [],
      languages: [],
      summary: '',
    })
  }
}
