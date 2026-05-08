import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { cvText, job } = await req.json()
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Write a professional cover letter for this job application. Use the CV for background. Keep it to 3-4 paragraphs. Professional but personable tone. Plain text only.

Job Title: ${job.job_title}
Company: ${job.employer_name}
Location: ${job.job_city || ''} ${job.job_country || ''}
Job Description: ${(job.job_description || '').slice(0, 1000)}

Applicant CV:
${cvText.slice(0, 2000)}

Write the cover letter:`
      }],
    })
    const coverLetter = (message.content[0] as { text: string }).text
    return NextResponse.json({ coverLetter })
  } catch (err) {
    console.error('Cover letter error:', err)
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 })
  }
}