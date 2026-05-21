import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface CareerProfile {
  name:             string | null
  current_title:    string | null
  experience_years: number | null
  skills:           string[]
  education:        string | null
  target_roles:     string[]
  languages:        string[]
  summary:          string | null
  strengths:        string[]
  location:         string | null
  market:           'eu' | 'in'
  updated_at:       string
}

// GET — fetch saved career profile for the logged-in user
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('career_data')
    .eq('id', user.id)
    .single()

  return Response.json({ profile: data?.career_data ?? null })
}

// POST — extract structured profile from CV text and save it
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { cvText, market = 'eu' } = await req.json()
  if (!cvText?.trim()) return new Response('No CV text', { status: 400 })

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Extract structured career data from this CV. Return ONLY valid JSON, no markdown, no explanation.

{
  "name": "<full name or null>",
  "current_title": "<most recent job title or null>",
  "experience_years": <number, estimated total years, or null>,
  "skills": ["<up to 15 technical and professional skills>"],
  "education": "<highest degree and field, or null>",
  "target_roles": ["<2-4 roles this person would logically target>"],
  "languages": ["<spoken/written languages>"],
  "summary": "<2 sentence career summary>",
  "strengths": ["<3 key professional strengths>"],
  "location": "<current city/country or null>"
}

CV:
${cvText.slice(0, 5000)}`,
      }],
    })

    const block = res.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No response')

    const raw = block.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const extracted = JSON.parse(raw) as Omit<CareerProfile, 'market' | 'updated_at'>

    const profile: CareerProfile = {
      ...extracted,
      market:     market as 'eu' | 'in',
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('profiles')
      .update({ career_data: profile })
      .eq('id', user.id)

    return Response.json({ profile })
  } catch (err) {
    console.error('Career profile extraction error:', err)
    return new Response('Extraction failed', { status: 500 })
  }
}

// DELETE — wipe career_data for the logged-in user (GDPR/DPDP "right to erasure")
export async function DELETE() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  await supabase
    .from('profiles')
    .update({ career_data: null })
    .eq('id', user.id)

  return Response.json({ ok: true })
}
