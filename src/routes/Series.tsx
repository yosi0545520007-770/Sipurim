import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // או ../lib/supabase אם אין alias
import { usePlayer } from '@/components/PlayerProvider'
import { List } from 'lucide-react'

type SeriesRow = {
  id: string
  title: string // This was already correct, just confirming
  description: string | null
  cover_url: string | null
  created_at: string
}

type StoryTrack = {
  id: string
  title: string
  audio_url: string
  series_id: string
  series_title?: string
}

export function Component() {
  const player = usePlayer()
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playingSeriesId, setPlayingSeriesId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null)
      const { data, error } = await supabase
        .from('series')
        .select('id,title,description,cover_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) setErr(error.message)
      setSeries(data || [])

      // Fetch site logo
      const { data: logoData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_logo_url')
        .maybeSingle()
      setLogoUrl(logoData?.value || '/logo.png')

      setLoading(false)
    })()
  }, [])

  async function playSeries(seriesId: string, seriesTitle: string) {
    setPlayingSeriesId(seriesId)
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, audio_url, series_id, series_title:series(title)')
        .eq('series_id', seriesId)
        .not('audio_url', 'is', null)
        .order('series_order', { ascending: true })
        .order('publish_at', { ascending: true })

      if (error) throw error

      const tracks = (data || []).map(story => ({
        ...story,
        series_title: seriesTitle,
      })) as StoryTrack[]
      if (tracks.length > 0) {
        player.playQueue(tracks, 0)
      } else {
        alert('לא נמצאו פרקים עם שמע לסדרה זו.')
      }
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת פרקי הסדרה')
    } finally {
      setPlayingSeriesId(null)
    }
  }

  return (
    <section className="container mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">סיפורים בהמשכים</h1>

      {loading && <div className="text-gray-500">טוען…</div>}
      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 mb-4">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {series.map((s) => {
          const isCurrentPlaying = player.queue.some(track => track.id.startsWith(s.id)) && player.playing;
 
          return (
            <article key={s.id} className="group relative rounded-2xl border bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100">
                {s.cover_url || logoUrl ? (
                  <img
                    src={s.cover_url || logoUrl}
                    alt={s.title}
                    className={`w-full h-full ${s.cover_url ? 'object-cover' : 'object-contain p-4'}`}
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-gray-400">ללא תמונה</div>
                )}
                {isCurrentPlaying ? (
                  <button
                    onClick={() => player.toggle()}
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 text-white"
                    aria-label="השהה"
                  >
                    <span className="w-14 h-14 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><rect width="4" height="14" x="7" y="5"/><rect width="4" height="14" x="13" y="5"/></svg>
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => playSeries(s.id, s.title)}
                    className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3 text-white text-sm font-medium text-center p-4 disabled:opacity-50 disabled:cursor-wait group-hover:bg-black/40 transition-colors"
                    aria-label={`נגן את סדרת ${s.title}`}
                    disabled={playingSeriesId === s.id}
                  >
                    <span className="px-3 py-1 rounded-full bg-black/60 text-xs sm:text-sm">לחצו להאזנה לסדרה</span>
                  </button>
                )}
              </div>
 
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-semibold">
                  <a href={`/stories?series_id=${s.id}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {s.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3">{s.description || '—'}</p>
                <div className="pt-2">
                  <button
                    onClick={() => player.openSeriesModal(s.id, s.title)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    aria-label={`הצג פרקים עבור ${s.title}`}
                  >
                    <List className="w-4 h-4" />
                    <span>הצג פרקים</span>
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {!loading && !err && series.length === 0 && (
        <div className="mt-4 text-gray-500">אין סדרות להצגה כרגע.</div>
      )}
    </section>
  )
}
