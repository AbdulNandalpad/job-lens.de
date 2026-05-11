import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeForm } from '@/lib/auto-apply-engine'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { jobUrl, cvText, coverLetter } = await req.json()

    if (!jobUrl || !cvText) {
      return NextResponse.json({ error: 'jobUrl and cvText are required' }, { status: 400 })
    }

    const result = await analyzeForm(jobUrl, cvText, coverLetter ?? undefined, anthropic)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[auto-apply/analyze]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}