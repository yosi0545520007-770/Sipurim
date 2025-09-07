import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/components/PlayerProvider'

type Track = {
  id: string
  title: string
  audio_url: string
  image_url: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function guessAudioMime(url: string): string {
  const u = (url || '').toLowerCase()
  if (u.includes('.m4a') || u.includes('.mp4')) return 'audio/mp4'
  if (u.includes('.mp3')) return 'audio/mpeg'
  if (u.includes('.wav')) return 'audio/wav'
  if (u.includes('.ogg') || u.includes('.oga')) return 'audio/ogg'
  return 'audio/mp4'
}

export default function Drive() {
  const player = usePlayer()
  const [tracks, setTracks] = useState<Track[]>([])
  const [order, setOrder] = useState<Track[]>([])
  const [current, setCurrent] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const { data, error } = await supabase
          .from('stories')
          .select('id,title,audio_url,image_url')
          .not('audio_url', 'is', null)
          .neq('audio_url', '')
          .order('publish_at', { ascending: false })
          .limit(500)
        if (error) throw error
        const list = (data || []).filter((r): r is Track => !!r.audio_url)
        setTracks(list)
        setOrder(shuffle(list))
        setCurrent(0)
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינת סיפורים')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const currentTrack = order[current]

  function playIndex(i: number) {
    setCurrent(i)
    if (order.length) player.playQueue(order.map(t => ({ id: t.id, title: t.title, audio_url: t.audio_url })), i)
  }

  function next() { if (order.length) playIndex((current + 1) % order.length) }
  function prev() { if (order.length) playIndex((current - 1 + order.length) % order.length) }
  function reshuffle() { const o = shuffle(tracks); setOrder(o); setCurrent(0); player.pause() }

  const playing = player.playing

  return (
    <section className="p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-3">סיפורים ברצף לנסיעה</h1>
      <p className="text-gray-600 mb-4">רשימת השמעה אקראית מכל הסיפורים עם שמע. אפשר לדלג קדימה/אחורה ולערבב מחדש.</p>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {loading && <div className="text-gray-600">טוען...</div>}

      {!loading && order.length === 0 && (
        <div className="text-gray-600">לא נמצאו סיפורים עם קובץ שמע.</div>
      )}

      {!loading && order.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          {/* Controls + Player */}
          <div className="rounded-2xl border bg-white p-4 order-2 md:order-1">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={prev} className="px-3 py-2 rounded border">‹ הקודם</button>
              <button onClick={() => player.toggle()} className="px-4 py-2 rounded bg-blue-600 text-white">
                {playing ? 'הפסק' : 'נגן'}
              </button>
              <button onClick={next} className="px-3 py-2 rounded border">הבא ›</button>
              <button onClick={reshuffle} className="px-3 py-2 rounded border ml-auto">ערבב מחדש</button>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-600">מנגן כעת:</div>
              <div className="font-medium">{currentTrack?.title || '—'}</div>
            </div>

            {/* הנגן עצמו מוצג בפס התחתון הגלובלי */}
            {currentTrack && (
              <div className="text-sm text-gray-600">מנגן דרך המיני-נגן הגלובלי</div>
            )}
          </div>

          {/* Playlist */}
          <div className="rounded-2xl border bg-white divide-y order-1 md:order-2 max-h-[70vh] overflow-y-auto">
            {order.map((t, i) => (
              <button
                key={t.id}
                onClick={() => playIndex(i)}
                className={`w-full text-right p-3 flex items-center gap-3 hover:bg-gray-50 ${i === current ? 'bg-blue-50' : ''}`}
              >
                <span className="text-xs text-gray-500 w-8 shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-gray-500 truncate">{t.audio_url}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {playing && <div className="h-20 md:hidden" />}
    </section>
  )
}
