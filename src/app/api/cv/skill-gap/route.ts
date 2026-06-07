import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const anthropic = new Anthropic()

const rl = new Map<string, { count: number; hour: number }>()
function rateLimit(userId: string, max = 40): boolean {
  const hour = Math.floor(Date.now() / 3_600_000)
  const key = `${userId}:${hour}`
  const cur = rl.get(key) ?? { count: 0, hour }
  if (cur.count >= max) return false
  rl.set(key, { count: cur.count + 1, hour })
  return true
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const cvText         = typeof body.cvText         === 'string' ? body.cvText         : ''
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription : ''
  if (!cvText || !jobDescription) return NextResponse.json({ matching: [], missing: [] })
  if (!rateLimit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Extract technical skills, tools, technologies, frameworks, and domain knowledge from this job description. Then check which appear in the CV text.

Return ONLY valid JSON — no markdown, no explanation:
{ "matching": ["skill1", "skill2"], "missing": ["skill3", "skill4"] }

Rules:
- Keep each item concise (1-4 words)
- Only meaningful professional/technical skills — not soft skills like "communication" or "teamwork"
- Maximum 10 missing items, maximum 10 matching items
- If a skill is partially present (e.g. JD says "Kubernetes" and CV has "K8s"), count it as matching

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

CV TEXT:
${cvText.slice(0, 2000)}`,
      }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ matching: parsed.matching || [], missing: parsed.missing || [] })
  } catch {
    return NextResponse.json({ matching: [], missing: [] })
  }
}
