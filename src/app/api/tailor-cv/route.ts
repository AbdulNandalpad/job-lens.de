import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.tailorCv

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const cvText    = typeof body.cvText    === 'string' ? body.cvText                    : ''
  const feedback  = typeof body.feedback  === 'string' ? body.feedback.slice(0, 500)   : ''
  const currentCv = typeof body.currentCv === 'string' ? body.currentCv                : ''
  const confirmedSkills: string[] = Array.isArray(body.confirmedSkills)
    ? body.confirmedSkills.map((s: unknown) => String(s).slice(0, 60)).slice(0, 20)
    : []
  const { job, template, tone, pages, lang, returnJson, market } = body
  const resolvedMarket: 'eu' | 'in' = market === MARKET.in ? MARKET.in : MARKET.eu

  // skipCredit=true when client is still within its 4-free-changes bundle
  const skipCredit = body.skipCredit === true

  let credits = { ok: true, remaining: 0 }
  if (!skipCredit) {
    credits = await checkAndDeductCredits(user.id, COST, 'tailor_cv', user.email ?? '', resolvedMarket)
    if (!credits.ok) {
      return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
    }
  }

  try {
    // -- MODE 1: Structured JSON for visual CV rendering ----------------------
    if (returnJson) {
      // System prompt is always server-side — never accepted from client
      const serverSystemPrompt = feedback && currentCv
        ? `You are an elite CV designer. The user has requested changes to their CV. Apply the feedback exactly and return updated JSON matching the same schema. Return ONLY valid JSON, no markdown.`
        : `You are an elite CV designer and career consultant. Extract, enhance and structure CV information into a rich JSON object for visual rendering.

SOURCE TYPE HINTS — apply these parsing rules:
- If the text looks like a LinkedIn export (has sections like "Experience", "Education", "Skills", "Licenses & Certifications", "Languages"): parse each section carefully. LinkedIn exports often have garbled line breaks — reconstruct full sentences.
- If it looks like a Word/PDF CV: extract all sections including any custom sections.
- In all cases: NEVER skip any role, education entry, or certification. Extract EVERYTHING.

Return ONLY valid JSON — no markdown, no backticks, no preamble.

Schema:
{
  "name": "Full Name",
  "title": "Job Title / Professional Headline",
  "tagline": "Brief role descriptor (optional)",
  "email": "email",
  "phone": "phone",
  "location": "City, Country",
  "linkedin": "linkedin url or handle",
  "summary": "3-4 sentence professional summary, polished and compelling",
  "stats": [{"value": "15+", "label": "Years Experience"}],
  "skills": [{"name": "Skill Name", "level": 90}],
  "experience": [{"role": "Job Title", "company": "Company", "period": "MMM YYYY - MMM YYYY", "location": "City, Country", "type": "Full-time", "bullets": ["Achievement..."]}],
  "education": [{"degree": "...", "school": "...", "year": "YYYY"}],
  "certifications": ["Full cert name"],
  "languages": [{"name": "Language", "level": 90}],
  "tools": ["Tool1", "Tool2"],
  "highlights": ["Short punchy highlight"]
}

Rules:
- CONTACT FIELDS: copy email, phone, location, linkedin EXACTLY from the source. Never invent them. Empty string if not found.
- stats: 3-5 impressive metrics
- skills: up to 12, percentage level 60-99
- languages: native=98, fluent=85, proficient=65, basic=45
- experience: include EVERY role — do not skip or merge positions
- experience bullets: 2-4 achievement-focused bullets per role, start with action verbs
- tools: 10-20 specific technologies/platforms mentioned in the CV
- highlights: 4-6 punchy career highlights
- tone: ${tone || 'professional'}, output language: ${lang || 'EN'}
${job ? `- Tailor for this role: ${job.job_title} at ${job.employer_name}` : ''}
${job?.job_description ? `- Job description context: ${job.job_description.slice(0, 1000)}` : ''}
${confirmedSkills.length > 0 ? `- User confirmed they also have these skills (include them): ${confirmedSkills.join(', ')}` : ''}`

      const userContent = feedback && currentCv
        ? `Here is the candidate's current CV (already enhanced). Apply the user's requested changes.

User feedback: ${feedback}

Current CV JSON:
${currentCv}

${job ? `Target Job: ${job.job_title} at ${job.employer_name}` : ''}

Return ONLY the updated JSON object. No markdown, no backticks, no explanation.`
        : `Here is the candidate's CV to extract and enhance:

${cvText.slice(0, 30000)}

${job ? `Target Job: ${job.job_title} at ${job.employer_name}` : ''}
${job?.job_description ? `Job Description: ${job.job_description.slice(0, 800)}` : ''}

Return ONLY the JSON object. No markdown, no backticks, no explanation.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: serverSystemPrompt,
        messages: [{ role: 'user', content: userContent }],
      })

      const cv = (message.content[0] as { text: string }).text
      return NextResponse.json({ cv, creditsRemaining: credits.remaining })
    }

    // -- MODE 2: Plain text tailoring -----------------------------------------
    const jobTitle = job?.job_title || 'the role'
    const company = job?.employer_name || 'the company'
    const jobDesc = (job?.job_description || '').slice(0, 1500)

    const toneInstruction = tone === 'concise'
      ? 'Be concise and sharp. Use short punchy sentences.'
      : tone === 'detailed'
      ? 'Be thorough and detailed. Expand on achievements and responsibilities.'
      : 'Be professional and polished. Use confident, credible language.'

    const langInstruction = lang === 'DE' ? 'Write the CV in German (Deutsch).' : 'Write the CV in English.'
    const pagesInstruction = pages === '2'
      ? 'This is a 2-page CV - include full detail for all roles.'
      : 'This is a 1-page CV - be selective, prioritise the most relevant experience.'

    const feedbackSection = feedback && currentCv
      ? `\n\nThe user has requested changes to the current CV:\nFeedback: ${feedback}\n\nCurrent CV:\n${currentCv}\n\nApply these changes.`
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a professional CV writer. Tailor this CV for the job below.

${toneInstruction}
${langInstruction}
${pagesInstruction}
Highlight relevant experience, use keywords from the job description. Return plain text only, no markdown.

Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDesc}

Original CV:
${cvText.slice(0, 25000)}${feedbackSection}

Return the tailored CV in plain text format.`,
      }],
    })

    const cv = (message.content[0] as { text: string }).text
    return NextResponse.json({ cv, creditsRemaining: credits.remaining })

  } catch (err) {
    console.error('Tailor CV error:', err)
    return NextResponse.json({ error: 'Failed to tailor CV' }, { status: 500 })
  }
}
