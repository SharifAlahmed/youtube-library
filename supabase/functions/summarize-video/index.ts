// supabase/functions/summarize-video/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function fetchTranscript(youtubeId: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const html = await res.text()
  const match = html.match(/"captionTracks":(\[.*?\])/)
  if (!match) return ''

  const tracks: Array<{ languageCode?: string; baseUrl?: string }> = JSON.parse(match[1])
  const track = tracks.find(t => t.languageCode?.startsWith('en')) ?? tracks[0]
  if (!track?.baseUrl) return ''

  const captRes = await fetch(track.baseUrl)
  const xml = await captRes.text()
  const text = xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 4000 ? text.slice(0, 4000) + '…' : text
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // 1. Verify JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) return json({ error: 'unauthorized' }, 401)

  // 2. Parse body
  let body: { video_id?: string } = {}
  try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }
  const { video_id } = body
  if (!video_id) return json({ error: 'video_id required' }, 400)

  // 3. Check credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('summary_credits')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.summary_credits ?? 0) <= 0) {
    return json({ error: 'no_credits' }, 402)
  }

  // 4. Return cached summary if one exists
  const { data: cached } = await supabase
    .from('summaries')
    .select('*')
    .eq('user_id', user.id)
    .eq('video_id', video_id)
    .maybeSingle()

  if (cached) return json({ summary: cached, cached: true })

  // 5. Load video data (must belong to this user)
  const { data: video } = await supabase
    .from('videos')
    .select('title, channel, youtube_id, learning, notes')
    .eq('id', video_id)
    .eq('user_id', user.id)
    .single()

  if (!video) return json({ error: 'video_not_found' }, 404)

  // 6. Try to fetch YouTube transcript (best-effort, non-blocking on failure)
  let transcript = ''
  try { transcript = await fetchTranscript(video.youtube_id) } catch (_) { /* proceed without */ }

  // 7. Blend in the learner's own context
  const userContext: string[] = []
  const learning = (video.learning && typeof video.learning === 'object')
    ? video.learning as Record<string, unknown>
    : {}
  if (learning.takeaways) userContext.push(`Key takeaways: ${learning.takeaways}`)
  if (learning.question)  userContext.push(`Their question: ${learning.question}`)
  if (learning.apply)     userContext.push(`What they plan to apply: ${learning.apply}`)
  if (video.notes)        userContext.push(`Personal notes: ${video.notes}`)

  const prompt = `You are summarizing a YouTube video for a learner's personal knowledge library.

Video: "${video.title}" by ${video.channel}
${transcript ? `\nTranscript excerpt:\n${transcript}\n` : ''}
${userContext.length ? `\nLearner's own notes:\n${userContext.join('\n')}\n` : ''}
Respond ONLY with valid JSON in exactly this shape (no markdown, no extra keys):
{
  "summary_text": "3-5 sentence summary of the main ideas",
  "key_points": ["actionable point 1", "actionable point 2", "actionable point 3", "actionable point 4", "actionable point 5"]
}

Respond in the same language as the video title. Be concise and actionable.`

  // 8. Call Anthropic
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'api_key_missing' }, 500)

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiRes.ok) {
    const detail = await aiRes.text()
    return json({ error: 'ai_error', detail }, 502)
  }

  const aiData = await aiRes.json()
  const rawText: string = aiData.content?.[0]?.text ?? ''
  const tokensUsed: number = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0)

  // 9. Parse JSON from Claude — graceful fallback
  let summaryText = ''
  let keyPoints: string[] = []
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    summaryText = typeof parsed.summary_text === 'string' ? parsed.summary_text : rawText.slice(0, 1000)
    keyPoints = Array.isArray(parsed.key_points) ? parsed.key_points : []
  } catch {
    summaryText = rawText.slice(0, 1000)
    keyPoints = []
  }

  // 10. Upsert into summaries
  const { data: newSummary, error: insertError } = await supabase
    .from('summaries')
    .upsert(
      { user_id: user.id, video_id, summary_text: summaryText, key_points: keyPoints, model: 'claude-haiku-4-5-20251001', tokens_used: tokensUsed },
      { onConflict: 'user_id,video_id' },
    )
    .select()
    .single()

  if (insertError) return json({ error: 'store_failed', detail: insertError.message }, 500)

  // 11. Decrement credits (GREATEST(0, ...) guard is in the RPC)
  await supabase.rpc('decrement_summary_credits', { uid: user.id })

  return json({ summary: newSummary, cached: false })
})
