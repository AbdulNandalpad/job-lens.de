import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = 1

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'tailor_cv')
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const { cvText, job, template, tone, pages, lang, systemPrompt, returnJson, feedback, currentCv } = await req.json()

    // -- MODE 1: Structured JSON for visual CV rendering ----------------------
    if (returnJson && systemPrompt) {
      const userContent = feedback && currentCv
        ? `Here is the candidate's current CV (already enhanced). Apply the user's requested changes.

User feedback: ${feedback}

Current CV JSON:
${currentCv.slice(0, 3000)}

${job ? `Target Job: ${job.job_title} at ${job.employer_name}` : ''}

Return ONLY the updated JSON object. No markdown, no backticks, no explanation.`
        : `Here is the candidate's CV to extract and enhance:

${cvText.slice(0, 4000)}

${job ? `Target Job: ${job.job_title} at ${job.employer_name}` : ''}
${job?.job_description ? `Job Description: ${job.job_description.slice(0, 800)}` : ''}

Return ONLY the JSON object. No markdown, no backticks, no explanation.`

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        system: systemPrompt,
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
      ? `\n\nThe user has requested changes to the current CV:\nFeedback: ${feedback}\n\nCurrent CV:\n${currentCv.slice(0, 2000)}\n\nApply these changes.`
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
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
${cvText.slice(0, 3000)}${feedbackSection}

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
