import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { MARKET } from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET — fetch career profile for current user
export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data } = await admin
    .from('profiles')
    .select('career_profile')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ profile: data?.career_profile ?? null })
}

// POST — extract career profile from CV text and persist it
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body    = await req.json()
  const cvText  = typeof body.cvText === 'string' ? body.cvText.slice(0, 6000) : ''
  const market  = body.market === MARKET.in ? MARKET.in : MARKET.eu

  if (!cvText) return NextResponse.json({ error: 'No CV text' }, { status: 400 })

  try {
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     'You extract structured career data from a CV. Respond ONLY with valid JSON — no prose, no markdown.',
      messages:   [{
        role:    'user',
        content: `Extract a career profile from this CV and return ONLY valid JSON.\n\nCV:\n${cvText}\n\nFormat:\n{"name":"Full Name","current_title":"Senior Product Manager","experience_years":7,"skills":["Product Strategy","SQL","Figma"],"education":"MSc Management, LMU Munich","target_roles":[],"languages":["German C2","English C1"],"summary":"Product leader with 7 years building B2B SaaS products.","strengths":["Data-driven decision making","Cross-functional leadership"],"location":"Munich"}\n\nRules:\n- experience_years: integer or null if unclear\n- skills: up to 10 specific technical or professional skills\n- target_roles: only if explicitly stated in the CV, otherwise empty array\n- strengths: 2-3 key strengths inferred from experience and achievements\n- All values must be strings, arrays of strings, integer, or null`,
      }],
    })

    const text  = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const found = text.match(/\{[\s\S]*\}/)
    if (!found) throw new Error('No JSON in response')

    const raw = JSON.parse(found[0])

    // Sanitise every field — never trust raw LLM output as-is
    const profile = {
      name:             typeof raw.name          === 'string' ? raw.name          : null,
      current_title:    typeof raw.current_title === 'string' ? raw.current_title : null,
      experience_years: typeof raw.experience_years === 'number' && isFinite(raw.experience_years) ? Math.floor(raw.experience_years) : null,
      skills:           Array.isArray(raw.skills)       ? raw.skills.slice(0, 10).map(String)       : [],
      education:        typeof raw.education     === 'string' ? raw.education     : null,
      target_roles:     Array.isArray(raw.target_roles) ? raw.target_roles.slice(0, 5).map(String)  : [],
      languages:        Array.isArray(raw.languages)    ? raw.languages.map(String)                  : [],
      summary:          typeof raw.summary       === 'string' ? raw.summary       : null,
      strengths:        Array.isArray(raw.strengths)    ? raw.strengths.slice(0, 5).map(String)      : [],
      location:         typeof raw.location      === 'string' ? raw.location      : null,
      market,
      updated_at:       new Date().toISOString(),
    }

    const admin = createAdminSupabase()
    await admin.from('profiles').update({ career_profile: profile }).eq('id', user.id)

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[career-profile extract]', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}

// DELETE — clear career profile (called from account page "Delete Kira's memory")
export async function DELETE(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  await admin.from('profiles').update({ career_profile: null }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
