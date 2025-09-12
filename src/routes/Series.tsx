import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // או ../lib/supabase אם אין alias
import { usePlayer } from '@/components/PlayerProvider'

type SeriesRow = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  created_at: string
}

type StoryTrack = {
  id: string
  title: string
  audio_url: string
  series_id: string
}

export default function Series() {
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

  async function playSeries(seriesId: string) {
    setPlayingSeriesId(seriesId)
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, audio_url, series_id')
        .eq('series_id', seriesId)
        .not('audio_url', 'is', null)
        .order('series_order', { ascending: true })
        .order('publish_at', { ascending: true })

      if (error) throw error

      const tracks = (data || []) as StoryTrack[]
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
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => playSeries(s.id)}
                    className="w-14 h-14 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center disabled:opacity-50 disabled:cursor-wait"
                    aria-label={`נגן את סדרת ${s.title}`}
                    title={`נגן את סדרת ${s.title}`}
                    disabled={playingSeriesId === s.id}
                  >
                    {playingSeriesId === s.id ? (
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
 
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-semibold">
                  <a href={`/stories?series_id=${s.id}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {s.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3">{s.description || '—'}</p>
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
