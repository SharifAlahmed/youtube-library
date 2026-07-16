import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import HelpTip from './HelpTip'

const TABS = ['learn', 'prompts', 'links']

// Parse "1:23" / "1:02:45" / "90" to seconds; returns null if unparseable
function parseTimeSecs(str) {
  const parts = str.trim().split(':').map(Number)
  if (!parts.length || parts.some(isNaN)) return null
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function TabButton({ id, activeTab, label, onClick }) {
  const active = activeTab === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        relative py-3 px-4 text-sm font-medium transition-colors shrink-0
        ${active ? 'text-primary-400' : 'text-gray-400 hover:text-gray-200'}
      `}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary-500 rounded-t-full" />
      )}
    </button>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  )
}

function AddRowBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors mt-1"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
      </svg>
      {label}
    </button>
  )
}

function LearnSection({ icon, title, hint, children, helpTip }) {
  return (
    <div className="space-y-2.5">
      <div>
        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-sm font-semibold text-gray-100">{title}</span>
          {helpTip && <HelpTip tip={helpTip} dark />}
        </div>
        {hint && <p className="text-xs text-gray-500 mt-0.5 ms-6 rtl:text-right">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function toArr(raw) {
  return Array.isArray(raw) ? raw : []
}

function normalizeUrl(url) {
  const s = url.trim()
  if (!s) return s
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

const INPUT_CLS = `w-full px-3 py-2 rounded-xl border border-gray-700
  bg-gray-800 text-gray-100 placeholder-gray-500
  focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm`

export default function VideoPlayerModal({ video, onClose, onEdit }) {
  const { t } = useLang()
  const { session } = useAuth()
  const uid = session?.user?.id

  const [activeTab, setActiveTab] = useState('learn')

  // Intent (why they saved this)
  const [intent, setIntent] = useState('')

  // Free notes (notes text column)
  const [notes, setNotes] = useState('')
  const [freeNotesOpen, setFreeNotesOpen] = useState(false)

  // Active Learning Panel (learning jsonb column)
  const [takeaways,   setTakeaways]   = useState('')  // stored as string
  const [question,    setQuestion]    = useState('')
  const [apply,       setApply]       = useState('')
  const [timestamps,  setTimestamps]  = useState([{ time: '', note: '' }])
  const [learnDirty,  setLearnDirty]  = useState(false)
  const [learnSaving, setLearnSaving] = useState(false)
  const [learnSaved,  setLearnSaved]  = useState(false)

  // Prompts — each item: { text, createdAt }
  const [prompts,    setPrompts]    = useState([])
  const [newPrompt,  setNewPrompt]  = useState('')
  const [copiedIdx,  setCopiedIdx]  = useState(null)

  // Links — each item: { url, label, createdAt }
  const [links,        setLinks]        = useState([])
  const [newLinkUrl,   setNewLinkUrl]   = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')

  // Load all data on mount (select * so every column loads without migration changes)
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('id', video.id)
        .single()
      if (data) {
        setIntent(data.intent ?? '')
        setNotes(data.notes ?? '')
        setPrompts(toArr(data.prompts))
        setLinks(toArr(data.links))
        const raw = (data.learning && typeof data.learning === 'object') ? data.learning : {}
        const tw = raw.takeaways
        setTakeaways(Array.isArray(tw) ? tw.join('\n') : typeof tw === 'string' ? tw : '')
        setQuestion(raw.question ?? '')
        setApply(raw.apply ?? '')
        setTimestamps(Array.isArray(raw.timestamps) && raw.timestamps.length ? raw.timestamps : [{ time: '', note: '' }])
      }
    }
    load()
  }, [video.id])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Learning helpers ────────────────────────────────────────────────────────
  const markLearnDirty = () => { setLearnDirty(true); setLearnSaved(false) }

  const updTS = (i, field, val) => {
    setTimestamps(p => { const n = [...p]; n[i] = { ...n[i], [field]: val }; return n })
    markLearnDirty()
  }
  const addTS = () => { setTimestamps(p => [...p, { time: '', note: '' }]); markLearnDirty() }
  const delTS = (i) => { setTimestamps(p => p.filter((_, j) => j !== i)); markLearnDirty() }

  // ── Save everything (learning jsonb + notes) in one update ──────────────────
  const handleSaveLearning = async () => {
    setLearnSaving(true)
    const payload = {
      takeaways:  takeaways.trim(),
      question:   question.trim(),
      apply:      apply.trim(),
      timestamps: timestamps.filter(ts => ts.time.trim() || ts.note.trim()),
    }
    await supabase.from('videos')
      .update({ learning: payload, notes: notes || null })
      .eq('id', video.id)
      .eq('user_id', uid)
    setLearnSaving(false)
    setLearnDirty(false)
    setLearnSaved(true)
    setTimeout(() => setLearnSaved(false), 2000)
  }

  // ── Prompts ─────────────────────────────────────────────────────────────────
  const handleAddPrompt = async () => {
    const text = newPrompt.trim()
    if (!text) return
    const entry = { text, createdAt: new Date().toISOString() }
    const next = [...prompts, entry]
    setPrompts(next)
    setNewPrompt('')
    await supabase.from('videos').update({ prompts: next }).eq('id', video.id)
  }

  const handleRemovePrompt = async (idx) => {
    const next = prompts.filter((_, i) => i !== idx)
    setPrompts(next)
    await supabase.from('videos').update({ prompts: next.length ? next : null }).eq('id', video.id)
  }

  const handleCopyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx].text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  // ── Links ───────────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    const url = newLinkUrl.trim()
    if (!url) return
    const normalized = normalizeUrl(url)
    const entry = { url: normalized, label: newLinkLabel.trim() || normalized, createdAt: new Date().toISOString() }
    const next = [...links, entry]
    setLinks(next)
    setNewLinkUrl('')
    setNewLinkLabel('')
    await supabase.from('videos').update({ links: next }).eq('id', video.id)
  }

  const handleRemoveLink = async (idx) => {
    const next = links.filter((_, i) => i !== idx)
    setLinks(next)
    await supabase.from('videos').update({ links: next.length ? next : null }).eq('id', video.id)
  }

  const tabLabel = { learn: t.tabLearn, prompts: t.tabPrompts, links: t.tabLinks }

  const saveBtnCls = (dirty, saved) => `
    px-5 py-2 rounded-xl text-sm font-semibold transition-all
    ${saved
      ? 'bg-emerald-600 text-white'
      : dirty
        ? 'bg-primary-600 hover:bg-primary-700 text-white'
        : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
  `

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl
                   max-h-[90dvh] flex flex-col overflow-hidden"
        style={{ background: '#0F1F17' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          title={t.close}
          className="absolute top-3 end-3 z-10 p-2 rounded-full bg-black/60 text-white
                     hover:bg-black/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* 16:9 Video */}
          <div className="relative w-full flex-shrink-0" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Title + Channel + Goal */}
          <div className="px-4 py-3 border-b border-gray-700/60">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h2>
                {video.channel && (
                  <p className="text-xs text-gray-400 mt-0.5">{video.channel}</p>
                )}
                {intent && (
                  <p className="text-xs mt-1">
                    <span className="text-gray-500">{t.intentGoalPrefix}</span>{' '}
                    <span className="text-gray-400">{intent}</span>
                  </p>
                )}
              </div>
              {onEdit && (
                <button
                  onClick={() => onEdit(video)}
                  title={t.editVideo}
                  className="shrink-0 p-1.5 rounded-lg text-gray-500
                             hover:text-primary-400 hover:bg-gray-700/60
                             transition-colors mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Knowledge Hub ── */}
          <div>
            {/* Tab bar */}
            <div className="flex border-b border-gray-700/60 px-2 overflow-x-auto">
              {TABS.map(tab => (
                <TabButton
                  key={tab}
                  id={tab}
                  activeTab={activeTab}
                  label={tabLabel[tab]}
                  onClick={setActiveTab}
                />
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">

              {/* ── Active Learning Panel ── */}
              {activeTab === 'learn' && (
                <div className="space-y-5">

                  {/* 1. Key Takeaways */}
                  <LearnSection icon="💡" title={t.learnTakeaways} hint={t.learnTakeawaysHint} helpTip={t.helpTipTakeaway}>
                    <textarea
                      value={takeaways}
                      onChange={e => { setTakeaways(e.target.value); markLearnDirty() }}
                      placeholder={t.learnTakeawayPlaceholder}
                      rows={3}
                      className={`${INPUT_CLS} resize-none`}
                    />
                  </LearnSection>

                  {/* 2. My Question */}
                  <LearnSection icon="❓" title={t.learnQuestion} hint={t.learnQuestionHint} helpTip={t.helpTipQuestion}>
                    <textarea
                      value={question}
                      onChange={e => { setQuestion(e.target.value); markLearnDirty() }}
                      placeholder={t.learnQuestionPlaceholder}
                      rows={2}
                      className={`${INPUT_CLS} resize-none`}
                    />
                  </LearnSection>

                  {/* 3. What I'll Apply */}
                  <LearnSection icon="⚡" title={t.learnApply} hint={t.learnApplyHint} helpTip={t.helpTipApply}>
                    <textarea
                      value={apply}
                      onChange={e => { setApply(e.target.value); markLearnDirty() }}
                      placeholder={t.learnApplyPlaceholder}
                      rows={2}
                      className={`${INPUT_CLS} resize-none`}
                    />
                  </LearnSection>

                  {/* 4. Timestamps */}
                  <LearnSection icon="🔖" title={t.learnTimestamps} hint={t.learnTimestampsHint}>
                    <div className="space-y-2">
                      {timestamps.map((ts, i) => {
                        const secs = parseTimeSecs(ts.time)
                        const ytHref = video.youtube_id && secs !== null
                          ? `https://www.youtube.com/watch?v=${video.youtube_id}&t=${secs}`
                          : null
                        return (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={ts.time}
                              onChange={e => updTS(i, 'time', e.target.value)}
                              placeholder={t.learnTimePlaceholder}
                              className="w-24 shrink-0 px-3 py-2 rounded-xl border border-gray-700
                                         bg-gray-800 text-gray-100 placeholder-gray-500
                                         focus:outline-none focus:ring-2 focus:ring-primary-500
                                         text-sm font-mono"
                            />
                            <input
                              type="text"
                              value={ts.note}
                              onChange={e => updTS(i, 'note', e.target.value)}
                              placeholder={t.learnNotePlaceholder}
                              className={INPUT_CLS}
                            />
                            {ytHref && (
                              <a
                                href={ytHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open at this timestamp"
                                className="shrink-0 p-1.5 rounded-lg text-primary-400 hover:text-primary-300
                                           hover:bg-gray-700 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                              </a>
                            )}
                            {timestamps.length > 1 && (
                              <RemoveBtn onClick={() => delTS(i)} />
                            )}
                          </div>
                        )
                      })}
                      <AddRowBtn onClick={addTS} label={t.learnAddTimestamp} />
                    </div>
                  </LearnSection>

                  {/* Collapsible free notes */}
                  <div className="border-t border-gray-700/60 pt-3">
                    <button
                      onClick={() => setFreeNotesOpen(o => !o)}
                      className="flex items-center gap-2 text-xs font-medium text-gray-500
                                 hover:text-gray-300 transition-colors w-full text-start"
                    >
                      <svg
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${freeNotesOpen ? '' : '-rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                      {t.learnFreeNotes}
                      {notes && !freeNotesOpen && (
                        <span className="ms-1 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                      )}
                    </button>

                    {freeNotesOpen && (
                      <div className="mt-2">
                        <textarea
                          value={notes}
                          onChange={e => { setNotes(e.target.value); markLearnDirty() }}
                          placeholder={t.notesPlaceholder}
                          rows={4}
                          className={`${INPUT_CLS} resize-none`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Single Save button for everything */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveLearning}
                      disabled={!learnDirty || learnSaving}
                      className={saveBtnCls(learnDirty, learnSaved)}
                    >
                      {learnSaving ? t.saving : learnSaved ? t.notesSaved : t.save}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Prompts ── */}
              {activeTab === 'prompts' && (
                <div className="space-y-3">

                  {prompts.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-6">{t.noPromptsYet}</p>
                  )}

                  <div className="space-y-2">
                    {prompts.map((item, idx) => (
                      <div key={item.createdAt ?? idx} className="flex gap-2 items-start">
                        <pre
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl
                                     px-3 py-2.5 text-xs text-gray-200 whitespace-pre-wrap
                                     font-mono overflow-x-auto"
                        >
                          {item.text}
                        </pre>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopyPrompt(idx)}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                              ${copiedIdx === idx
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                            `}
                          >
                            {copiedIdx === idx ? t.copied : t.copyPrompt}
                          </button>
                          <button
                            onClick={() => handleRemovePrompt(idx)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium
                                       bg-gray-800 border border-gray-700
                                       text-gray-500 hover:text-red-400 hover:border-red-800/50 hover:bg-red-900/20
                                       transition-colors"
                          >
                            {t.remove}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-700/60">
                    <textarea
                      value={newPrompt}
                      onChange={e => setNewPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddPrompt()
                      }}
                      placeholder={t.promptPlaceholder}
                      rows={2}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-700
                                 bg-gray-800 text-gray-100 placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-primary-500
                                 text-sm resize-none"
                    />
                    <button
                      onClick={handleAddPrompt}
                      disabled={!newPrompt.trim()}
                      className="self-start px-4 py-2 bg-primary-600 hover:bg-primary-700
                                 disabled:bg-gray-700 disabled:text-gray-500
                                 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                    >
                      {t.add}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Links ── */}
              {activeTab === 'links' && (
                <div className="space-y-3">

                  {links.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-6">{t.noLinksYet}</p>
                  )}

                  <div className="space-y-2">
                    {links.map((item, idx) => (
                      <div key={item.createdAt ?? idx} className="flex items-center gap-2">
                        <a
                          href={normalizeUrl(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                                     bg-gray-800 border border-gray-700
                                     hover:border-primary-600/50 hover:bg-gray-800/80
                                     transition-colors min-w-0"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          <span className="text-sm text-primary-400 truncate">
                            {item.label || item.url}
                          </span>
                        </a>
                        <RemoveBtn onClick={() => handleRemoveLink(idx)} />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-700/60 space-y-2">
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={e => setNewLinkUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                      placeholder={t.linkUrlPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-gray-700
                                 bg-gray-800 text-gray-100 placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={e => setNewLinkLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                        placeholder={t.linkLabelPlaceholder}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-700
                                   bg-gray-800 text-gray-100 placeholder-gray-500
                                   focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <button
                        onClick={handleAddLink}
                        disabled={!newLinkUrl.trim()}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700
                                   disabled:bg-gray-700 disabled:text-gray-500
                                   text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                      >
                        {t.add}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
