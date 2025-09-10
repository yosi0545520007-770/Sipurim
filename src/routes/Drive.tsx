import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/components/PlayerProvider'
import { useHeard } from '@/lib/heard'

type Track = {
  id: string
  title: string
  audio_url: string
  image_url: string | null
  is_series?: boolean
  series_id?: string | null
  publish_at?: string | null
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
  const { isHeard } = useHeard()
  const [tracks, setTracks] = useState<Track[]>([])
  const [order, setOrder] = useState<Track[]>([])
  const [current, setCurrent] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [err, setErr] = useState<string | null>(null)
  const [skipHeard, setSkipHeard] = useState<boolean>(true)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const { data, error } = await supabase
          .from('stories')
          .select('id,title,audio_url,image_url,is_series,series_id,publish_at')
          .not('audio_url', 'is', null)
          .neq('audio_url', '')
          .order('publish_at', { ascending: false })
          .limit(500)
        if (error) throw error
        const list = ((data || []) as any[])
          .filter((r) => !!r && !!r.audio_url)
          .map((r) => ({
            id: r.id as string,
            title: r.title as string,
            audio_url: r.audio_url as string,
            image_url: (r.image_url ?? null) as string | null,
            is_series: (r.is_series ?? false) as boolean,
            series_id: (r.series_id ?? null) as string | null,
            publish_at: (r.publish_at ?? null) as string | null,
          })) as Track[]
        setTracks(list)
        setOrder(buildOrder(list))
        setCurrent(0)
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינת סיפורים')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Register the reshuffle function with the global player when on this page
  useEffect(() => {
    if (player.setOnReshuffle) {
      player.setOnReshuffle(() => reshuffle)
    }
    return () => { if (player.setOnReshuffle) player.setOnReshuffle(undefined) }
  }, [player.setOnReshuffle, tracks])

  // Register skipHeard state with the global player
  useEffect(() => {
    if (player.setSkipHeard) {
      player.setSkipHeard(skipHeard)
    }
    // No cleanup needed, it's a state setter
  }, [skipHeard, player.setSkipHeard])

  const currentTrack = order[current]

  function playIndex(i: number) {
    setCurrent(i)
    if (order.length) player.playQueue(order.map(t => ({ id: t.id, title: t.title, audio_url: t.audio_url })), i)
  }

  function next() { if (order.length) playIndex((current + 1) % order.length) }
  function prev() { if (order.length) playIndex((current - 1 + order.length) % order.length) }
  function reshuffle() { const o = buildOrder(tracks); setOrder(o); setCurrent(0); player.pause() }

  const playing = player.playing
  
  // Rebuild order when toggling skipHeard
  useEffect(() => { setOrder(buildOrder(tracks)); setCurrent(0) }, [skipHeard])

  // Determine if a track is completed by this user based on saved progress
  function isCompleted(t: Track): boolean {
    if (skipHeard && isHeard(t.id)) return true
    const pg = player.getProgress(t.id)
    if (!pg) return false
    const dur = pg.dur || 0
    const pos = pg.pos || 0
    return dur > 0 && pos >= Math.max(0, dur - 2)
  }

  // Build a randomized order, skipping completed tracks, and grouping series together
  function buildOrder(list: Track[]): Track[] {
    // Group by series_id
    const bySeries = new Map<string, Track[]>()
    const singles: Track[] = []
    for (const t of list) {
      const sid = t.series_id || null
      if (sid) {
        const arr = bySeries.get(sid) || []
        arr.push(t)
        bySeries.set(sid, arr)
      } else {
        singles.push(t)
      }
    }

    // Prepare blocks (arrays) keeping only unplayed episodes; keep series episodes ordered by publish_at ascending
    const blocks: Track[][] = []
    // singles
    for (const t of singles) {
      if (!isCompleted(t)) blocks.push([t])
    }
    // series groups
    for (const arr of bySeries.values()) {
      const sorted = arr.slice().sort((a, b) => {
        const da = a.publish_at ? Date.parse(a.publish_at) : 0
        const db = b.publish_at ? Date.parse(b.publish_at) : 0
        return da - db
      })
      const unplayed = sorted.filter(t => !isCompleted(t))
      if (unplayed.length > 0) blocks.push(unplayed)
    }

    // Shuffle the blocks; keep order within each block
    const shuffledBlocks = shuffle(blocks)
    return shuffledBlocks.flat()
  }

  return (
    <section className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-3">סיפורים ברצף לנסיעה</h1>
      <p className="text-gray-600 mb-4">רשימת השמעה אקראית מכל הסיפורים עם שמע. אפשר לדלג קדימה/אחורה ולערבב מחדש.</p>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {loading && <div className="text-gray-600">טוען...</div>}

      {!loading && order.length === 0 && (
        <div className="text-gray-600">לא נמצאו סיפורים עם קובץ שמע.</div>
      )}

      {!loading && order.length > 0 && (
        <>
        {/* Hero card like Home (הסיפור היומי) */}
        <div className="grid md:grid-cols-2 gap-6 items-start bg-white border rounded-2xl overflow-hidden shadow-sm p-4 mb-10">
          <div className="space-y-3 relative">
            {currentTrack?.image_url ? (
              <img src={currentTrack.image_url} alt={currentTrack.title} className="w-full rounded-lg object-cover" />
            ) : (
              <div className="w-full h-48 bg-gray-100 grid place-items-center text-gray-400">אין תמונה</div>
            )}
            {currentTrack?.audio_url && (
              (() => {
                const isPlaying = player.current?.id === currentTrack.id && player.playing
                if (isPlaying) return null
                return (
                  <button
                    className="absolute inset-0 grid place-items-center"
                    onClick={() => playIndex(current)}
                    aria-label="נגן סיפור"
                    title="נגן"
                  >
                    <span className="w-14 h-14 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </button>
                )
              })()
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-2">{currentTrack?.title || ''}</h2>
            <p className="text-gray-700 leading-relaxed">הפעלה אקראית של סיפורים שטרם הושמעו עבורך. אם יש סיפור בהמשכים, נשמיע את כל הפרקים שלא הושמעו — ברצף.</p>

            <div className="mt-4 flex items-center gap-3 flex-wrap"></div>
          </div>
        </div>
        {/* Hide old layout for now */}
        <div className="grid gap-4 md:grid-cols-[1fr_320px] hidden">
          {/* Controls + Player */}
          <div className="rounded-2xl border bg-white p-4 order-2 md:order-1">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={prev} className="px-3 py-2 rounded border">הקודם</button>
              <button onClick={() => { if (!player.current && order.length) { playIndex(current) } else { player.toggle() } }} className="px-4 py-2 rounded bg-blue-600 text-white" aria-label="נגן">
                {playing ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline" aria-hidden="true">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                    <span className="sr-only">השהה</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="sr-only">נגן</span>
                  </>
                )}
                {playing ? 'השהה' : 'נגן'}
              </button>
              <button onClick={next} className="px-3 py-2 rounded border">הבא</button>
              <button onClick={reshuffle} className="px-3 py-2 rounded border ml-auto">ערבב מחדש</button>
            </div>
            <div className="flex items-center gap-2 mb-3 hidden">
              <button onClick={prev} className="px-3 py-2 rounded border">‹ הקודם</button>
              <button onClick={() => player.toggle()} className="px-4 py-2 rounded bg-blue-600 text-white" aria-label="נגן">
                {playing ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline" aria-hidden="true">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                    <span className="sr-only">השהה</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="sr-only">נגן</span>
                  </>
                )}
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
        </>
      )}
      {playing && <div className="h-20 md:hidden" />}
    </section>
  )
}
