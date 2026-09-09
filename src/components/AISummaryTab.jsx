import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';

// Automatic (AI) summarization is disabled: YouTube blocks transcript scraping
// from Supabase Edge Function IPs, so summarize-video now returns `no_transcript`
// for every video (not just Arabic ones) — there is nothing to summarize from.
// Paste-your-own-summary is the primary flow until upstream scraping is fixed.
// Disabled 2026-09-09. Flip back to true to re-enable; the code below it is
// kept intact and functional.
const AI_SUMMARY_ENABLED = false;

// helper: 125 -> "2:05" ; 3661 -> "1:01:01"
function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function AISummaryTab({ videoId, language = 'ar', onSeek, onCreditsChanged, onSummarySaved }) {
  const isAr = language === 'ar';
  const t = (ar, en) => (isAr ? ar : en);

  // AI flow state — only rendered/reachable when AI_SUMMARY_ENABLED is true
  const [state, setState] = useState('idle'); // idle | loading | success | error | no_transcript
  const [err, setErr] = useState(null);
  const [credits, setCredits] = useState(null);

  // Shared summary data (populated by either flow)
  const [summary, setSummary] = useState(null);
  const [hasTranscript, setHasTranscript] = useState(null);

  // Paste flow state
  const [mode, setMode] = useState('edit'); // 'view' | 'edit'
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Load cached summary (+ credit count, only when the AI flow is enabled) on open
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const [{ data: cached }, profResult] = await Promise.all([
        supabase.from('summaries').select('*')
          .eq('user_id', u.user.id).eq('video_id', videoId).maybeSingle(),
        AI_SUMMARY_ENABLED
          ? supabase.from('profiles').select('summary_credits').eq('id', u.user.id).single()
          : Promise.resolve({ data: null }),
      ]);
      if (!alive) return;
      if (cached) {
        setSummary(cached);
        setHasTranscript(cached.video_timestamps?.length > 0);
        setState('success');
        setMode('view');
      } else {
        setMode('edit');
      }
      if (profResult.data) setCredits(profResult.data.summary_credits);
    })();
    return () => { alive = false; };
  }, [videoId]);

  async function generate() {
    setState('loading'); setErr(null);
    const { data, error } = await supabase.functions.invoke('summarize-video', {
      body: { video_id: videoId, language },
    });
    if (error) {
      setErr({ error: 'network' });
      setState('error');
      return;
    }
    if (data?.error === 'no_transcript') {
      setState('no_transcript');
      return;
    }
    if (data?.error) {
      setErr(data);
      setState('error');
      return;
    }
    const newSummary = data.summary ?? data;
    setSummary(newSummary);
    setHasTranscript(data.has_transcript ?? (newSummary.video_timestamps?.length > 0));
    setState('success');
    setMode('view');
    if (!data.cached) {
      setCredits((c) => (c ?? 1) - 1);
      onCreditsChanged?.();
    }
  }

  function enterEdit() {
    setDraftText(summary?.summary_text ?? '');
    setSaveError(null);
    setMode('edit');
  }

  function cancelEdit() {
    setSaveError(null);
    setMode('view');
  }

  function handleSaveClick() {
    if (!draftText.trim() || saving) return;
    if (summary) { setConfirmOverwrite(true); return; }
    doSave();
  }

  async function doSave() {
    setConfirmOverwrite(false);
    setSaving(true);
    setSaveError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setSaving(false); setSaveError('auth'); return; }

    // Requires the "Users can update own summaries" UPDATE policy on public.summaries
    // (auth.uid() = user_id), added 2026-09-09 — SELECT/INSERT/DELETE already existed,
    // but UPDATE didn't, since the old AI path only ever wrote via the service-role
    // Edge Function (which bypasses RLS entirely). Without that policy this upsert's
    // conflict-path UPDATE is rejected.
    // user_id is set explicitly below rather than left to the column default: RLS
    // evaluates the row as sent by the client, so an explicit value is required here.
    const { data, error } = await supabase
      .from('summaries')
      .upsert({
        user_id: u.user.id,
        video_id: videoId,
        summary_text: draftText.trim(),
        source: 'external',
        model: null,
        key_points: [],
        video_timestamps: [],
      }, { onConflict: 'user_id,video_id' })
      .select()
      .single();

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSummary(data);
    setHasTranscript(data.video_timestamps?.length > 0);
    setMode('view');
    // Local optimistic patch, not a full library refetch: HomePage's loading
    // state briefly unmounts every VideoCard (including this open modal) while
    // refetching, which would close the modal out from under the user.
    onSummarySaved?.();
  }

  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'text-right' : 'text-left';

  return (
    <div dir={dir} className={`p-6 ${align}`}>
      {/* Credits badge — AI flow only */}
      {AI_SUMMARY_ENABLED && credits !== null && state !== 'success' && (
        <div className="mb-4 text-sm text-gray-500">
          {t(`لديك ${credits} ملخص متبقٍ`, `${credits} summaries left`)}
        </div>
      )}

      {/* IDLE — AI flow only */}
      {AI_SUMMARY_ENABLED && state === 'idle' && (
        <div className="flex flex-col items-center py-12 gap-4">
          <p className="text-gray-600 max-w-md">
            {t('احصل على ملخص ذكي للفيديو مع أهم النقاط ولحظات مفصلية قابلة للنقر.',
               'Get an AI summary of this video with key points and clickable timestamps.')}
          </p>
          <button
            onClick={generate}
            disabled={credits === 0}
            className="px-6 py-3 rounded-lg font-medium text-white disabled:opacity-40"
            style={{ background: '#1D9E75' }}
          >
            {credits === 0
              ? t('نفدت الأرصدة', 'No credits left')
              : t('لخّص الفيديو', 'Summarize video')}
          </button>
        </div>
      )}

      {/* LOADING — AI flow only */}
      {AI_SUMMARY_ENABLED && state === 'loading' && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200"
               style={{ borderTopColor: '#1D9E75' }} />
          <p className="text-gray-500">
            {t('يُلخّص الفيديو... قد يستغرق 20-40 ثانية', 'Summarizing… 20-40 seconds')}
          </p>
        </div>
      )}

      {/* NO TRANSCRIPT — AI flow only */}
      {AI_SUMMARY_ENABLED && state === 'no_transcript' && (
        <div className="py-8">
          <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 text-gray-800">
            <p className="font-medium mb-2">
              {t('لا يتوفر نص لهذا الفيديو — يمكنك لصق ملخصك بنفسك',
                 'No transcript is available for this video — you can paste your own summary instead.')}
            </p>
            <p className="text-sm text-gray-500">
              {t('لم يتم خصم أي رصيد.', 'No credit was consumed.')}
            </p>
          </div>
        </div>
      )}

      {/* ERROR — AI flow only */}
      {AI_SUMMARY_ENABLED && state === 'error' && err && (
        <div className="py-8">
          <div className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-900">
            <p className="font-medium mb-2">
              {isAr ? (err.message_ar || 'حدث خطأ') : (err.message_en || 'Something went wrong')}
            </p>
            {err.error !== 'no_credits' && (
              <button
                onClick={() => { setState('idle'); setErr(null); }}
                className="mt-2 text-sm underline"
              >
                {t('حاول مرة أخرى', 'Try again')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW — saved summary (external paste or legacy AI row) */}
      {mode === 'view' && summary && (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold" style={{ color: '#15332a' }}>
                  {t('الملخّص', 'Summary')}
                </h3>
                {summary.source === 'external' && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(29,158,117,0.12)', color: '#1D9E75' }}
                  >
                    {t('ملخص خارجي', 'External summary')}
                  </span>
                )}
              </div>
              <button
                onClick={enterEdit}
                className="text-sm font-medium underline shrink-0"
                style={{ color: '#1D9E75' }}
              >
                {t('تعديل', 'Edit')}
              </button>
            </div>

            {summary.source !== 'external' && hasTranscript !== null && (
              <div className="mb-3">
                <span className={`text-xs font-medium ${hasTranscript ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {hasTranscript
                    ? t('✓ مبني على نص الفيديو', '✓ Grounded in the video transcript')
                    : t('⚠ غير مبني على نص الفيديو (بناءً على العنوان فقط)', '⚠ Not grounded in the transcript (based on title only)')}
                </span>
              </div>
            )}

            {/* prose-invert: this tab renders on the video modal's fixed dark
                chrome (#0F1F17) regardless of the app's light/dark theme, so
                default (light-background) heading colors are unreadable here */}
            <div dir={dir} className={`prose prose-invert prose-green max-w-none ${align}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summary_text}</ReactMarkdown>
            </div>
          </section>

          {summary.key_points?.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#15332a' }}>
                {t('أهم النقاط', 'Key points')}
              </h3>
              <ul className="space-y-2">
                {summary.key_points.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-bold" style={{ color: '#1D9E75' }}>
                      {i + 1}.
                    </span>
                    <span className="text-gray-800">{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {summary.video_timestamps?.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#15332a' }}>
                {t('لحظات مفصلية', 'Key moments')}
              </h3>
              <div className="space-y-2">
                {summary.video_timestamps.map((ts, i) => (
                  <button
                    key={i}
                    onClick={() => onSeek?.(ts.time_seconds)}
                    className="flex gap-3 w-full text-start p-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span
                      className="font-mono text-sm px-2 py-1 rounded shrink-0"
                      style={{ background: '#1D9E75', color: 'white' }}
                    >
                      {fmtTime(ts.time_seconds)}
                    </span>
                    <span className="text-gray-800">{ts.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* EDIT — paste form, the primary input */}
      {mode === 'edit' && (
        <div className="space-y-4">
          {!summary && (
            <p className="text-gray-600">
              {t('لخّص هذا الفيديو بأداتك المفضّلة، والصق الملخص هنا ليبقى مع ملاحظاتك في مكان واحد.',
                 'Summarize this video with your preferred tool, and paste it here to keep it with your notes in one place.')}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              {t('الصق ملخصك', 'Paste your summary')}
            </label>
            <textarea
              dir={dir}
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              placeholder={t('الصق الملخص من أداتك الخارجية…', 'Paste the summary from your external tool…')}
              rows={12}
              className={`w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]
                         focus:border-transparent text-sm resize-y ${align}`}
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-700">
              {t('تعذّر الحفظ — حاول مرة أخرى', 'Failed to save — please try again')}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveClick}
              disabled={!draftText.trim() || saving}
              className="px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-40"
              style={{ background: '#1D9E75' }}
            >
              {saving ? t('جارٍ الحفظ...', 'Saving…') : t('حفظ الملخص', 'Save summary')}
            </button>
            {summary && (
              <button onClick={cancelEdit} className="text-sm text-gray-500 underline">
                {t('إلغاء', 'Cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overwrite confirmation — no silent replacement of an existing summary */}
      {confirmOverwrite && summary && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setConfirmOverwrite(false)}
        >
          <div
            dir={dir}
            className={`bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 ${align}`}
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              {t('استبدال الملخص الحالي؟', 'Replace the current summary?')}
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {t(
                `يوجد ملخص محفوظ بالفعل (${summary.source === 'external' ? 'خارجي' : 'بالذكاء الاصطناعي'} — ${new Date(summary.created_at).toLocaleDateString('ar')})، وسيتم استبداله بالكامل. لا يمكن التراجع عن هذا الإجراء.`,
                `A summary already exists (${summary.source === 'external' ? 'external' : 'AI-generated'} — ${new Date(summary.created_at).toLocaleDateString('en')}) and will be fully replaced. This can't be undone.`
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmOverwrite(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={doSave}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#1D9E75' }}
              >
                {t('استبدال', 'Replace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
