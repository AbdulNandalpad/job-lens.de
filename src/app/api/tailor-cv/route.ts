import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { cvText, job } = await req.json()
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a professional CV writer. Tailor this CV for the job below. Keep it concise, highlight relevant experience, use keywords from the job description. Return plain text only, no markdown.

Job Title: ${job.job_title}
Company: ${job.employer_name}
Job Description: ${(job.job_description || '').slice(0, 1500)}

Original CV:
${cvText.slice(0, 3000)}

Return the tailored CV in plain text format.`
      }],
    })
    const cv = (message.content[0] as { text: string }).text
    return NextResponse.json({ cv })
  } catch (err) {
    console.error('Tailor CV error:', err)
    return NextResponse.json({ error: 'Failed to tailor CV' }, { status: 500 })
  }
}