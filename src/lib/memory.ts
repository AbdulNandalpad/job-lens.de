import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabase } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Fact extraction runs after every AI interaction. It's a small, high-frequency
// job — switch to 'claude-haiku-4-5' to cut cost ~5x if quality holds.
const EXTRACTION_MODEL = 'claude-opus-4-8'
const EMBEDDING_MODEL  = 'text-embedding-3-small' // 1536-dim
const EMBEDDING_DIM    = 1536

// Kill-switch — memory stays dormant until explicitly enabled. Persisting
// personal facts on EU users needs a consent basis + privacy-policy copy first.
export function memoryEnabled(): boolean {
  return process.env.MEMORY_ENABLED === 'true'
}

// ── Embeddings (OpenAI — Anthropic has no embeddings API) ─────────────────────
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !text.trim()) return null
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    })
    if (!res.ok) { console.error('[memory] embed failed:', res.status); return null }
    const data = await res.json()
    const vec = data?.data?.[0]?.embedding
    return Array.isArray(vec) && vec.length === EMBEDDING_DIM ? vec : null
  } catch (err) {
    console.error('[memory] embed error:', err)
    return null
  }
}

// ── Fact extraction (Claude) ──────────────────────────────────────────────────
export async function extractFacts(context: string): Promise<string[]> {
  if (!context.trim()) return []
  try {
    const msg = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `From the career-assistant interaction below, extract 3-5 DURABLE facts about the user worth remembering across sessions — their role, skills, seniority, target jobs, location, industry, preferences, constraints. Ignore one-off details and anything transient.

Return ONLY a JSON array of short factual strings (each under 120 chars). No prose, no markdown. If nothing durable, return [].

Interaction:
${context.slice(0, 6000)}`,
      }],
    })
    const raw = (msg.content[0] as { text?: string })?.text ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 200)
      .slice(0, 5)
  } catch (err) {
    console.error('[memory] extractFacts error:', err)
    return []
  }
}

// ── Save: extract facts from an interaction, embed, upsert ────────────────────
export async function saveMemoriesFromInteraction(userId: string, context: string): Promise<number> {
  if (!memoryEnabled()) { console.log('[memory] disabled (MEMORY_ENABLED != true) — skipping save'); return 0 }
  const facts = await extractFacts(context)
  console.log(`[memory] extracted ${facts.length} facts for user ${userId.slice(0, 8)}`)
  if (facts.length === 0) return 0
  const saved = await saveMemories(userId, facts)
  console.log(`[memory] saved ${saved}/${facts.length} memories`)
  return saved
}

export async function saveMemories(userId: string, facts: string[]): Promise<number> {
  const admin = createAdminSupabase()
  let saved = 0
  for (const fact of facts) {
    const vec = await embed(fact)
    if (!vec) continue
    const { error } = await admin
      .from('user_memories')
      .upsert(
        { user_id: userId, memory_text: fact, embedding: JSON.stringify(vec) },
        { onConflict: 'user_id,memory_text', ignoreDuplicates: true },
      )
    if (!error) saved++
    else console.error('[memory] upsert error:', error.message)
  }
  return saved
}

// ── Retrieve: top-N memories relevant to a query ──────────────────────────────
export async function retrieveMemories(userId: string, queryText: string, count = 5): Promise<string[]> {
  if (!memoryEnabled()) return []
  const vec = await embed(queryText)
  if (!vec) return []
  const admin = createAdminSupabase()
  const { data, error } = await admin.rpc('match_user_memories', {
    p_user_id:         userId,
    p_query_embedding: JSON.stringify(vec),
    p_match_count:     count,
  })
  if (error) { console.error('[memory] match rpc error:', error.message); return [] }
  return ((data as { memory_text: string }[]) ?? []).map(r => r.memory_text)
}

// Format retrieved memories for injection into a system prompt.
export function formatMemoriesForPrompt(memories: string[]): string {
  if (memories.length === 0) return ''
  return `\n\nWhat you know about this user (from past sessions):\n${memories.map(m => `- ${m}`).join('\n')}`
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteMemory(userId: string, memoryId?: string): Promise<void> {
  const admin = createAdminSupabase()
  let q = admin.from('user_memories').delete().eq('user_id', userId)
  if (memoryId) q = q.eq('id', memoryId)
  const { error } = await q
  if (error) console.error('[memory] delete error:', error.message)
}
