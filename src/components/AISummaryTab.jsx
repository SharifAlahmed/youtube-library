import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// helper: 125 -> "2:05" ; 3661 -> "1:01:01"
function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function AISummaryTab({ videoId, language = 'ar', onSeek, onCreditsChanged }) {
  const isAr = language === 'ar';
  const t = (ar, en) => (isAr ? ar : en);

  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);
  const [credits, setCredits] = useState(null);

  // Load cached summary + credit count on open
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const [{ data: cached }, { data: prof }] = await Promise.all([
        supabase.from('summaries').select('*')
          .eq('user_id', u.user.id).eq('video_id', videoId).maybeSingle(),
        supabase.from('profiles').select('summary_credits')
          .eq('id', u.user.id).single(),
      ]);
      if (!alive) return;
      if (cached) { setSummary(cached); setState('success'); }
      if (prof) setCredits(prof.summary_credits);
    })();
    return () => { alive = false; };
  }, [videoId]);

  async function generate() {
    setState('loading'); setErr(null);
    const { data, error } = await supabase.functions.invoke('summarize-video', {
      body: { video_id: videoId, language },
    });
    if (error || data?.error) {
      setErr(data || { error: 'network' });
      setState('error');
      return;
    }
    setSummary(data.summary ?? data);
    setState('success');
    if (!data.cached) {
      setCredits((c) => (c ?? 1) - 1);
      onCreditsChanged?.();
    }
  }

  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'text-right' : 'text-left';

  return (
    <div dir={dir} className={`p-6 ${align}`}>
      {/* Credits badge */}
      {credits !== null && state !== 'success' && (
        <div className="mb-4 text-sm text-gray-500">
          {t(`لديك ${credits} ملخص متبقٍ`, `${credits} summaries left`)}
        </div>
      )}

      {/* IDLE */}
      {state === 'idle' && (
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

      {/* LOADING */}
      {state === 'loading' && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200"
               style={{ borderTopColor: '#1D9E75' }} />
          <p className="text-gray-500">
            {t('يُلخّص الفيديو... قد يستغرق 20-40 ثانية', 'Summarizing… 20-40 seconds')}
          </p>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && err && (
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

      {/* SUCCESS */}
      {state === 'success' && summary && (
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#15332a' }}>
              {t('الملخّص', 'Summary')}
            </h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {summary.summary_text}
            </p>
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
    </div>
  );
}
