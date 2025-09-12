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
          .is('series_id', null)
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
        .is('series_id', null)
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
        <div className="flex items-center gap-2 flex-wrap justify-start w-full">
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

          <button
            type="button"
            onClick={() => setHideHeard(v => !v)}
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${hideHeard ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
          >
            {hideHeard ? 'סינון פעיל' : 'הסתר סיפורים ששמעתי'}
          </button>
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
            <a
              key={story.id}
              href={`/story/${story.id}`}
              className="relative block rounded-2xl border bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md"
            >
              <article>
                {(done || started) && (
                  <span className={`absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full z-10 ${done ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {done ? 'נשמע' : 'בתהליך'}
                  </span>
                )}

                <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 group">
                  <div className="w-full h-full">
                    {img ? (
                      <img src={img} alt={story.title} className="w-full h-full object-cover object-center" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-gray-400">ללא תמונה</div>
                    )}
                  </div>
                  {story.audio_url && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        player.playTrack({ id: story.id, title: story.title, audio_url: story.audio_url! })
                      }}
                      className="absolute inset-0 grid place-items-center bg-black/20"
                      aria-label={`נגן את ${story.title}`}
                    >
                      <span className="w-12 h-12 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center"><svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-semibold">{story.title}</h2>
                  {story.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{story.excerpt}</p>}
                </div>
              </article>
            </a>
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
