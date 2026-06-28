import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits, isUserRateLimited } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'
import { retrieveMemories, formatMemoriesForPrompt, saveMemoriesFromInteraction } from '@/lib/memory'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.coverLetter

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isUserRateLimited(user.id, 'cover_letter', 10)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  const body = await req.json()
  const cvText        = typeof body.cvText        === 'string' ? body.cvText        : ''
  const feedback      = typeof body.feedback      === 'string' ? body.feedback.slice(0, 500)  : ''
  const currentLetter = typeof body.currentLetter === 'string' ? body.currentLetter.slice(0, 3000) : ''
  const { job, tone, length, lang, market } = body
  const resolvedMarket: 'eu' | 'in' = market === MARKET.in ? MARKET.in : MARKET.eu

  const credits = await checkAndDeductCredits(user.id, COST, 'cover_letter', user.email ?? '', resolvedMarket)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {

    // Recall what we know about this user and inject it into the prompt
    const memories = await retrieveMemories(user.id, `${job?.job_title ?? ''} ${cvText.slice(0, 500)}`, 5)
    const memBlock = formatMemoriesForPrompt(memories)

    const lengthGuide = length === 'short' ? '~150 words' : length === 'long' ? '~450 words' : '~300 words'
    const toneGuide = tone === 'formal' ? 'formal German business style' : tone === 'warm' ? 'personal and genuine' : 'confident and direct'
    const langGuide = lang === 'DE' ? 'Write in German (Deutsch).' : 'Write in English.'

    const basePrompt = feedback && currentLetter
      ? `You wrote the cover letter below. The user has requested changes.

User feedback: ${feedback}

Current letter:
${currentLetter}

Job: ${job?.job_title} at ${job?.employer_name}
${langGuide} Keep it ${lengthGuide}. Tone: ${toneGuide}. Plain text only.

Return only the revised cover letter:`
      : `Write a professional cover letter for this job application. Use the CV for background.
Keep it ${lengthGuide}. Tone: ${toneGuide}. ${langGuide} Plain text only.

Job Title: ${job?.job_title}
Company: ${job?.employer_name}
Location: ${job?.job_city || ''} ${(job as { job_country?: string })?.job_country || ''}
Job Description: ${((job as { job_description?: string })?.job_description || '').slice(0, 6000)}

Applicant CV:
${cvText.slice(0, 15000)}

Write the cover letter:`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are an expert cover letter writer. Write compelling, personalised cover letters that directly address the job description and showcase the applicant's most relevant experience. Never invent facts not present in the CV.${memBlock ? '\n' + memBlock : ''}`,
      messages: [{ role: 'user', content: basePrompt }],
    })

    const coverLetter = (message.content[0] as { text: string }).text

    // Extract + persist durable facts after the response (non-blocking)
    after(() => saveMemoriesFromInteraction(
      user.id,
      `User applied for ${job?.job_title} at ${job?.employer_name}.\nCV: ${cvText.slice(0, 1500)}`,
    ))

    return NextResponse.json({ coverLetter, creditsRemaining: credits.remaining })
  } catch (err) {
    console.error('Cover letter error:', err)
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 })
  }
}
