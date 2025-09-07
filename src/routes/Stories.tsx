import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HDate } from '@hebcal/core'
import { Search } from 'lucide-react'
import { usePlayer } from '@/components/PlayerProvider'

type Story = {
  id: string
  title: string
  excerpt: string | null
  image_url: string | null
  audio_url: string | null
  publish_at: string | null
  play_date: string | null
  category_id: string | null
}

function isValidDate(d: any): d is Date { return d instanceof Date && !isNaN(d.getTime()) }
function coerceDate(val: any): Date { const d = val ? new Date(val) : new Date(); return isValidDate(d) ? d : new Date() }
function toHebrewText(dIn: any): string {
  try {
    const d = coerceDate(dIn)
    const hd: any = new HDate(d)
    if (typeof hd.renderGematriya === 'function') return hd.renderGematriya()
    if (typeof hd.render === 'function') return hd.render('he')
    const day = (hd.getDate && hd.getDate()) || d.getDate()
    const monthName = (hd.getMonthName && hd.getMonthName('h')) || ''
    const year = (hd.getFullYear && hd.getFullYear()) || d.getFullYear()
    return `${day} ${monthName} ${year}`
  } catch { return '' }
}

type Category = { id: string; name: string }
type Tag = { id: string; name: string }

export default function Stories() {
  const player = usePlayer()
  const [items, setItems] = useState<Story[]>([])
  const [siteLogoUrl, setSiteLogoUrl] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [storyTags, setStoryTags] = useState<Record<string,string[]>>({})
  const [categoryFilter, setCategoryFilter] = useState<string>('') // '' = הכל
  const [search, setSearch] = useState<string>('')                 // חיפוש
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // mini-player handles global playing state

  useEffect(() => {
    (async () => {
      try {
        setErr(null); setLoading(true)
        const [{ data: settings }, { data: cats }, { data: stories, error: errStories }, { data: tg }] = await Promise.all([
          supabase.from('settings').select('value').eq('key', 'site_logo_url').maybeSingle(),
          supabase.from('categories').select('id,name').order('name'),
          supabase
            .from('stories')
            .select('id,title,excerpt,image_url,audio_url,publish_at,play_date,category_id')
            .order('play_date', { ascending: false })
            .limit(200),
          supabase.from('tags').select('id,name').order('name'),
        ])
        setSiteLogoUrl(settings?.value || '')
        setCategories((cats || []) as Category[])
        setTags((tg || []) as Tag[])
        if (errStories) throw errStories
        const list = (stories || []) as Story[]
        setItems(list)
        if (list.length) {
          const ids = list.map(s => s.id)
          const { data: st } = await supabase.from('story_tags').select('story_id,tag_id').in('story_id', ids)
          const map: Record<string,string[]> = {}
          for (const r of (st || []) as any[]) {
            (map[r.story_id] ||= []).push(r.tag_id)
          }
          setStoryTags(map)
        } else {
          setStoryTags({})
        }
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינה')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // סינון לפי קטגוריה/תגים + חיפוש
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  let visible = categoryFilter
    ? items.filter(s => s.category_id === categoryFilter)
    : items

  if (search.trim()) {
    const term = search.toLowerCase()
    visible = visible.filter(
      s =>
        s.title.toLowerCase().includes(term) ||
        (s.excerpt || '').toLowerCase().includes(term)
    )
  }
  if (selectedTags.length) {
    visible = visible.filter(s => {
      const set = new Set(storyTags[s.id] || [])
      return selectedTags.every(t => set.has(t))
    })
  }

  return (
    <section className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">כל הסיפורים</h1>

        {/* חיפוש + סינון צמודים בצד ימין */}
        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש סיפורים..."
              className="border rounded-lg p-2 pr-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <select
              className="border rounded-lg p-2 bg-white text-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">הכל</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {/* tag chips filter */}
          <div className="flex flex-wrap gap-2">
            {tags.map(t => {
              const active = selectedTags.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`px-2 py-1 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                  onClick={() => setSelectedTags(prev => active ? prev.filter(x=>x!==t.id) : [...prev, t.id])}
                >
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{err}</div>}
      {loading && <div className="text-gray-500">טוען…</div>}
      {!loading && visible.length === 0 && <div className="text-gray-500">אין סיפורים להצגה.</div>}

      {/* רשת כרטיסים רספונסיבית */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(story => {
          const img = story.image_url || siteLogoUrl || ''
          const shareUrl = `${window.location.origin}/stories/${story.id}`
          const shareText = `📖 ${story.title}\n${shareUrl}`
          const isExpanded = !!expanded[story.id]
          const hasLongExcerpt = (story.excerpt || '').trim().length > 200
          // mini-player is global; no inline fixed audio
          const pg = player.getProgress(story.id)
          const started = !!pg && (pg.pos || 0) > 0
          const done = !!pg && pg.dur > 0 && pg.pos >= pg.dur - 2

          return (
            <article key={story.id} className="relative rounded-2xl border bg-white overflow-hidden shadow-sm">
              {started && (
                <span className={`absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full ${done ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  שמעתי
                </span>
              )}
              {/* מסגרת תמונה ביחס 16:9 */}
              <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                {img ? (
                  <img
                    src={img}
                    alt={story.title}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-gray-400">אין תמונה</div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <h2 className="text-lg font-semibold">{story.title}</h2>
                {/* tags chips on card */}
                {(() => {
                  const ids = storyTags[story.id] || []
                  if (!ids.length) return null
                  return (
                    <div className="flex flex-wrap gap-2">
                      {ids.map(id => <span key={id} className="px-2 py-0.5 rounded-full text-[11px] border bg-gray-50">{tags.find(t=>t.id===id)?.name || id}</span>)}
                    </div>
                  )
                })()}

                {story.excerpt && (
                  <>
                    <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-3'}`}>{story.excerpt}</p>
                    {hasLongExcerpt && (
                      <button
                        type="button"
                        className="text-blue-600 hover:underline text-sm"
                        onClick={() => setExpanded(prev => ({ ...prev, [story.id]: !prev[story.id] }))}
                      >
                        {isExpanded ? 'קרא פחות' : 'קרא עוד'}
                      </button>
                    )}
                  </>
                )}

                {story.play_date && (
                  <div className="text-xs text-gray-500 pt-1">השמעה: {story.play_date}</div>
                )}

                {story.audio_url && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded-lg bg-blue-600 text-white"
                      onClick={() => player.playTrack({ id: story.id, title: story.title, audio_url: story.audio_url! })}
                      aria-label="נגן"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="sr-only">נגן</span>
                    </button>
                    {/* progress badge */}
                    {(() => {
                      const pg = player.getProgress(story.id)
                      if (!pg || !pg.dur) return null
                      const pct = Math.min(100, Math.max(0, Math.round((pg.pos / pg.dur) * 100)))
                      const done = pg.dur > 0 && pg.pos >= pg.dur - 2
                      return (
                        <span className={`text-xs px-2 py-1 rounded border ${done ? 'text-green-700 border-green-300' : 'text-gray-700 border-gray-300'}`}>
                          {done ? 'נשמע' : `התקדמות: ${pct}%`}
                        </span>
                      )
                    })()}
                  </div>
                )}


                {/* כפתור שיתוף בווטסאפ */}
                <div className="pt-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600 hover:underline text-sm"
                  >
                    שתף ב־WhatsApp
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {/* spacer is handled by PlayerProvider bar */}
    </section>
  )
}
