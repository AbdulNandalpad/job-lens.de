import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { retrieveMemories, formatMemoriesForPrompt } from '@/lib/memory'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memories = await retrieveMemories(user.id, 'career job role skills location', 8)
  const memoryBlock = formatMemoriesForPrompt(memories)

  return NextResponse.json({
    name: (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? null,
    memoryBlock,
  })
}
