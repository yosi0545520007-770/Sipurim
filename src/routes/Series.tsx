import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // או ../lib/supabase אם אין alias
import { usePlayer } from '@/components/PlayerProvider'
import { List, X, Loader2 } from 'lucide-react'

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

function SeriesCardSkeleton() {
  return (
    <article className="group relative rounded-2xl border bg-white overflow-hidden shadow-sm flex flex-col animate-pulse">
      <div className="w-full h-[170px] bg-gray-200" />
      <div className="p-4 space-y-2 flex-1 flex flex-col min-h-[150px]">
        <h3 className="text-lg font-semibold">
          <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
        </h3>
        <p className="text-sm text-gray-600 space-y-2">
          <div className="h-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
        </p>
        <div className="pt-2 mt-auto">
          <div className="inline-flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200" />
            <div className="h-5 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </article>
  )
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

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 mb-4">{err}</div>}

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SeriesCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {series.map((s) => {
            const isCurrentPlaying = player.queue.some(track => track.id.startsWith(s.id)) && player.playing;
   
            return (
              <article key={s.id} className="group relative rounded-2xl border bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md flex flex-col">
                <div className="relative w-full h-[170px] overflow-hidden bg-gray-100 shrink-0">
                  {s.cover_url || logoUrl ? (
                    <img
                      src={s.cover_url || logoUrl}
                      alt={s.title}
                      className={`w-full h-full ${s.cover_url ? 'object-cover' : 'object-contain p-4'}`}
                      loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-xs text-gray-400">ללא תמונה</div>
                  )}
                  <button
                    onClick={() => playSeries(s.id, s.title)}
                    className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3 text-white text-sm font-medium text-center p-4 disabled:opacity-50 disabled:cursor-wait"
                    aria-label={`נגן את סדרת ${s.title}`}
                    title={`נגן את סדרת ${s.title}`}
                    disabled={playingSeriesId === s.id}
                  >
                    <span className="px-3 py-1 rounded-full bg-black/60 text-xs sm:text-sm">לחצו להאזנה לסדרה</span>
                  </button>
                </div>
   
                <div className="p-4 space-y-2 flex-1 flex flex-col min-h-[150px]">
                  <h3 className="text-lg font-semibold">
                    <a href={`/stories?series_id=${s.id}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                      {s.title}
                    </a>
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{s.description || '—'}</p>
                  <div className="pt-2 mt-auto">
                    <button 
                      onClick={() => player.openSeriesModal?.(s.id, s.title)} 
                      disabled={!player.openSeriesModal}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
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
      )}

      {!loading && !err && series.length === 0 && (
        <div className="mt-4 text-gray-500">אין סדרות להצגה כרגע.</div>
      )}
    </section>
  )
}
