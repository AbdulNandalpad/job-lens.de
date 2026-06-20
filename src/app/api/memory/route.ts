import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { saveMemories, retrieveMemories, deleteMemory } from '@/lib/memory'

// GET  /api/memory            → list this user's memories
// GET  /api/memory?q=...      → top-5 memories relevant to the query
// POST /api/memory { facts }  → save explicit facts
// DELETE /api/memory          → wipe all; ?id=... → delete one
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  if (q) {
    const memories = await retrieveMemories(user.id, q, 5)
    return NextResponse.json({ memories })
  }

  const admin = createAdminSupabase()
  const { data } = await admin
    .from('user_memories')
    .select('id, memory_text, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  return NextResponse.json({ memories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const facts: string[] = Array.isArray(body.facts)
    ? body.facts.filter((f: unknown): f is string => typeof f === 'string').slice(0, 10)
    : []
  if (facts.length === 0) return NextResponse.json({ error: 'No facts' }, { status: 400 })

  const saved = await saveMemories(user.id, facts)
  return NextResponse.json({ ok: true, saved })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id') ?? undefined
  await deleteMemory(user.id, id)
  return NextResponse.json({ ok: true })
}
