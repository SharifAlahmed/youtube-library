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

function err(
  code: string,
  messageAr: string,
  messageEn: string,
  status = 400,
): Response {
  return json({ error: code, message_ar: messageAr, message_en: messageEn }, status)
}

interface TranscriptEntry { time_seconds: number; text: string }

async function fetchTranscriptEntries(youtubeId: string): Promise<TranscriptEntry[]> {
  const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const html = await res.text()
  const match = html.match(/"captionTracks":(\[.*?\])/)
  if (!match) return []

  const tracks: Array<{ languageCode?: string; baseUrl?: string }> = JSON.parse(match[1])
  const track = tracks.find(t => t.languageCode?.startsWith('en')) ?? tracks[0]
  if (!track?.baseUrl) return []

  const captRes = await fetch(track.baseUrl)
  const xml = await captRes.text()

  // Parse <text start="N" ...>content</text> entries
  const entries: TranscriptEntry[] = []
  const lineRe = /<text[^>]+start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(xml)) !== null) {
    const time_seconds = Math.floor(parseFloat(m[1]))
    const text = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .trim()
    if (text) entries.push({ time_seconds, text })
  }
  return entries
}

function formatTranscriptForPrompt(entries: TranscriptEntry[], maxChars = 5000): string {
  const lines: string[] = []
  let chars = 0
  let lastSec = -1
  for (const e of entries) {
    // Emit a timestamp marker every 30 seconds of content
    if (e.time_seconds - lastSec >= 30) {
      const h = Math.floor(e.time_seconds / 3600)
      const m = Math.floor((e.time_seconds % 3600) / 60)
      const s = e.time_seconds % 60
      const ts = h > 0
        ? `[${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}]`
        : `[${m}:${String(s).padStart(2,'0')}]`
      lines.push(`\n${ts}`)
      lastSec = e.time_seconds
    }
    lines.push(e.text)
    chars += e.text.length
    if (chars > maxChars) { lines.push('…'); break }
  }
  return lines.join(' ').trim()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return err('method_not_allowed', 'الطريقة غير مسموحة', 'Method not allowed', 405)

  // 1. Verify JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return err('unauthorized', 'غير مصرح', 'Unauthorized', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) return err('unauthorized', 'غير مصرح', 'Unauthorized', 401)

  // 2. Parse body
  let body: { video_id?: string; language?: string } = {}
  try { body = await req.json() } catch { return err('invalid_json', 'طلب غير صالح', 'Invalid JSON', 400) }
  const { video_id, language = 'en' } = body
  if (!video_id) return err('missing_video_id', 'معرف الفيديو مطلوب', 'video_id required', 400)

  // 3. Check credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('summary_credits')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.summary_credits ?? 0) <= 0) {
    return err('no_credits', 'نفدت أرصدة الملخصات', 'No summary credits remaining', 402)
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

  if (!video) return err('video_not_found', 'الفيديو غير موجود', 'Video not found', 404)

  // 6. Fetch YouTube transcript with timestamps (best-effort)
  let transcriptText = ''
  let transcriptEntries: TranscriptEntry[] = []
  try {
    transcriptEntries = await fetchTranscriptEntries(video.youtube_id)
    if (transcriptEntries.length) transcriptText = formatTranscriptForPrompt(transcriptEntries)
  } catch (_) { /* proceed without transcript */ }

  // 7. Blend in learner's own context
  const userContext: string[] = []
  const learning = (video.learning && typeof video.learning === 'object')
    ? video.learning as Record<string, unknown>
    : {}
  if (learning.takeaways) userContext.push(`Key takeaways: ${learning.takeaways}`)
  if (learning.question)  userContext.push(`Their question: ${learning.question}`)
  if (learning.apply)     userContext.push(`What they plan to apply: ${learning.apply}`)
  if (video.notes)        userContext.push(`Personal notes: ${video.notes}`)

  const hasTimestamps = transcriptEntries.length > 0
  const respondInLang = language === 'ar'
    ? 'Respond in Arabic.'
    : 'Respond in English.'

  const prompt = `You are summarizing a YouTube video for a personal knowledge library.

Video: "${video.title}" by ${video.channel}
${transcriptText ? `\nTimestamped transcript excerpt:\n${transcriptText}\n` : ''}
${userContext.length ? `\nLearner's own notes:\n${userContext.join('\n')}\n` : ''}
${respondInLang}
Respond ONLY with valid JSON (no markdown fences, no extra text) in exactly this shape:
{
  "summary_text": "3-5 sentence paragraph summarising the main ideas",
  "key_points": ["actionable point 1", "point 2", "point 3", "point 4", "point 5"],
  "video_timestamps": ${hasTimestamps
    ? '[{ "time_seconds": <integer from transcript>, "label": "<short descriptive label>" }, ...]  — pick 4-6 key moments using actual seconds from the transcript above'
    : '[]'}
}`

  // 8. Call Anthropic
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return err('api_key_missing', 'مفتاح API غير موجود', 'API key not configured', 500)

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiRes.ok) {
    const detail = await aiRes.text()
    return err('ai_error', 'خطأ في خدمة الذكاء الاصطناعي', `AI service error: ${aiRes.status}`, 502)
  }

  const aiData = await aiRes.json()
  const rawText: string = aiData.content?.[0]?.text ?? ''
  const tokensUsed: number = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0)

  // 9. Parse JSON — graceful fallback
  let summaryText = ''
  let keyPoints: string[] = []
  let videoTimestamps: Array<{ time_seconds: number; label: string }> = []
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    summaryText     = typeof parsed.summary_text === 'string' ? parsed.summary_text : rawText.slice(0, 1000)
    keyPoints       = Array.isArray(parsed.key_points) ? parsed.key_points : []
    videoTimestamps = Array.isArray(parsed.video_timestamps) ? parsed.video_timestamps : []
  } catch {
    summaryText = rawText.slice(0, 1000)
  }

  // 10. Upsert into summaries
  const { data: newSummary, error: insertError } = await supabase
    .from('summaries')
    .upsert(
      {
        user_id: user.id,
        video_id,
        summary_text: summaryText,
        key_points: keyPoints,
        video_timestamps: videoTimestamps,
        model: 'claude-haiku-4-5-20251001',
        tokens_used: tokensUsed,
      },
      { onConflict: 'user_id,video_id' },
    )
    .select()
    .single()

  if (insertError) return err('store_failed', 'فشل حفظ الملخص', insertError.message, 500)

  // 11. Decrement credits (floored at 0 by the RPC)
  await supabase.rpc('decrement_summary_credits', { uid: user.id })

  return json({ summary: newSummary, cached: false })
})
