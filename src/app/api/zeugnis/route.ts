import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { zeugnisText } = await req.json()
  if (!zeugnisText?.trim()) {
    return NextResponse.json({ error: 'No Zeugnis text provided' }, { status: 400 })
  }

  const credits = await checkAndDeductCredits(
    user.id, CREDIT_COST.zeugnisDecoder, 'zeugnis_decoder', user.email ?? '', MARKET.eu
  )
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: CREDIT_COST.zeugnisDecoder }, { status: 402 })
  }

  const prompt = `You are an expert in German employment law and Arbeitszeugnisse (German work reference letters).

Analyze this Arbeitszeugnis and decode the hidden meaning behind the coded language (Zeugnissprache).

ZEUGNIS TEXT:
${zeugnisText}

German Zeugnis grading uses legally mandated coded language. Key rules:
- Grade 1 (Sehr Gut): "stets zu unserer vollsten Zufriedenheit", "in jeder Hinsicht", "hervorragend"
- Grade 2 (Gut): "stets zu unserer vollen Zufriedenheit", "sehr gut"
- Grade 3 (Befriedigend): "zu unserer vollen Zufriedenheit" or "zu unserer Zufriedenheit"
- Grade 4 (Ausreichend): "im Großen und Ganzen zu unserer Zufriedenheit"
- Grade 5 (Mangelhaft): "hat sich bemüht", "war stets bemüht", "zeigte Engagement"
- Negatives coded as positives: "nicht immer einfach" = conflict, "eigenständig" alone = insubordinate, "in der Regel" = unreliable, "nach Möglichkeit" = rarely did it
- Missing farewell wish ("wünschen ihm alles Gute") = employer glad they left
- Missing "bedauern" (we regret) = neutral/negative departure
- "hat sich um Ordnung bemüht" = was messy

Return ONLY valid JSON in this exact structure (no markdown, no explanation outside JSON):
{
  "employeeName": "<full name of the employee extracted from the Zeugnis, or empty string if not found>",
  "employerName": "<name of the company/employer extracted from the Zeugnis, or empty string if not found>",
  "jobTitle": "<job title/position extracted from the Zeugnis, or empty string if not found>",
  "employmentEnd": "<last day of employment extracted from the Zeugnis e.g. '31.12.2024', or empty string if not found>",
  "overallGrade": <number 1-5>,
  "gradeLabel": "<Sehr Gut|Gut|Befriedigend|Ausreichend|Mangelhaft>",
  "gradeColor": "<green|blue|yellow|orange|red>",
  "summary": "<2-3 sentence plain-language summary of what this Zeugnis actually says about the employee>",
  "phrases": [
    {
      "original": "<exact phrase from text>",
      "decoded": "<what it actually means in plain language>",
      "rating": "<positive|neutral|negative|very_negative>",
      "tip": "<optional: what a better phrase would look like>"
    }
  ],
  "redFlags": ["<specific phrase or omission that actively hurts the candidate>"],
  "missingPhrases": ["<important phrase absent from this Zeugnis that a Grade 1-2 Zeugnis would include>"],
  "correctionGrounds": "<if grade 3 or worse: brief note on legal grounds for requesting correction under § 109 GewO>"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
    // Strip markdown code fences if model wraps in them
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(jsonStr)

    return NextResponse.json({ ...result, creditsRemaining: credits.remaining })
  } catch (err) {
    console.error('Zeugnis decode error:', err)
    return NextResponse.json({ error: 'Failed to decode Zeugnis' }, { status: 500 })
  }
}
