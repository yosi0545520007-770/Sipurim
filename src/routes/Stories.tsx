import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/components/PlayerProvider'
import { useHeard, toggleHeard } from '@/lib/heard'

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

type Category = { id: string; name: string }

export default function Stories() {
  const player = usePlayer()
  const { isHeard } = useHeard()

  const [items, setItems] = useState<Story[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [hideHeard, setHideHeard] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [err, setErr] = useState<string | null>(null)
  const PAGE_SIZE = 48
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr(null)
        const { data: cats } = await supabase.from('categories').select('id,name').order('name')
        setCategories((cats || []) as Category[])
        const { data, error } = await supabase
          .from('stories')
          .select('id,title,excerpt,image_url,audio_url,publish_at,play_date,category_id')
          .order('play_date', { ascending: false })
          .range(0, PAGE_SIZE - 1)
        if (error) throw error
        const list = (data || []) as Story[]
        setItems(list)
        setHasMore(list.length >= PAGE_SIZE)
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינת סיפורים')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadMore() {
    try {
      setLoading(true)
      const start = items.length
      const end = start + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('stories')
        .select('id,title,excerpt,image_url,audio_url,publish_at,play_date,category_id')
        .order('play_date', { ascending: false })
        .range(start, end)
      if (error) throw error
      const list = (data || []) as Story[]
      setItems(prev => [...prev, ...list])
      if (list.length < PAGE_SIZE) setHasMore(false)
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת סיפורים')
    } finally {
      setLoading(false)
    }
  }

  // Filtering
  let visible = categoryFilter ? items.filter(s => s.category_id === categoryFilter) : items
  if (hideHeard) {
    visible = visible.filter(s => {
      const pg = player.getProgress(s.id)
      const doneByProgress = !!pg && pg.dur > 0 && pg.pos >= pg.dur - 2
      return !doneByProgress && !isHeard(s.id)
    })
  }

  return (
    <section className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end w-full">
          {categories.length > 0 && (
            <select
              className="border rounded-lg p-2 bg-white text-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">בחר/י קטגוריה להשמעה</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-gray-700">שמעתי/נשמע</span>
            <button
              type="button"
              onClick={() => setHideHeard(v => !v)}
              aria-pressed={hideHeard}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hideHeard ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${hideHeard ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{err}</div>}
      {loading && items.length === 0 && <div className="text-gray-500">טוען…</div>}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(story => {
          const img = story.image_url || ''
          const pg = player.getProgress(story.id)
          const started = !!pg && (pg.pos || 0) > 0
          const done = (!!pg && pg.dur > 0 && pg.pos >= pg.dur - 2) || isHeard(story.id)

          return (
            <article key={story.id} className="relative rounded-2xl border bg-white overflow-hidden shadow-sm">
              {(done || started) && (
                <span className={`absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full ${done ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {done ? 'נשמע' : 'בתהליך'}
                </span>
              )}

              <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                {img ? (
                  <img src={img} alt={story.title} className="w-full h-full object-cover object-center" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-gray-400">ללא תמונה</div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <h2 className="text-lg font-semibold">{story.title}</h2>
                {story.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{story.excerpt}</p>}

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

                    <button
                      type="button"
                      className={`px-2 py-1 rounded border text-xs ${isHeard(story.id) ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300'}`}
                      onClick={() => toggleHeard(story.id)}
                      title={isHeard(story.id) ? 'בטל סימון "שמעתי"' : 'סמן "שמעתי"'}
                    >
                      {isHeard(story.id) ? 'שומע/נשמע' : 'שמעתי'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button onClick={() => loadMore()} disabled={loading} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50">
            {loading ? 'טוען…' : 'טען עוד'}
          </button>
        </div>
      )}
      {/* spacer handled by PlayerProvider bar */}
    </section>
  )
}

