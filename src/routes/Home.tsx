import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HDate } from '@hebcal/core'
import { Search } from 'lucide-react'
import { usePlayer } from '@/components/PlayerProvider'
import { useHeard } from '@/lib/heard'

type Story = {
  id: string
  title: string
  excerpt: string | null
  image_url: string | null
  audio_url: string | null
  play_date: string | null
  publish_at?: string | null
}

/* ---------- Helpers ---------- */
function getTodayHebrew(): string {
  try {
    const hd: any = new HDate(new Date())
    if (typeof hd.renderGematriya === 'function') return hd.renderGematriya()
    if (typeof hd.render === 'function') return hd.render('he')
    const d = new Date()
    // fallback (נדיר)
    return `${d.getDate()} ${d.toLocaleString('he-IL', { month: 'long' })} ${d.getFullYear()}`
  } catch {
    return ''
  }
}

/* ---------- Component ---------- */
export default function Home() {
  const player = usePlayer()
  const { isHeard } = useHeard()
  // Daily story
  const [story, setStory] = useState<Story | null>(null)
  const [allStories, setAllStories] = useState<Story[]>([])
  const [search, setSearch] = useState('')
  // UI
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Push state
  const [pushSupported, setPushSupported] = useState(false)
  const [pushGranted, setPushGranted] = useState(
    typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
  )
  const [playingMobile, setPlayingMobile] = useState(false)

  useEffect(() => {
    setPushSupported(typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)

        // 1) נסה לפי תאריך עברי של היום
        const { data: daily, error } = await supabase
          .from('stories')
          .select('id,title,excerpt,image_url,audio_url,play_date')
          .is('series_id', null)
          .eq('play_date', getTodayHebrew())
          .order('play_date', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) throw error

        if (daily) {
          setStory(daily as Story)
        } else {
          // 2) אם אין – בחר רנדומלי
          const { data: pool, error: e2 } = await supabase
            .from('stories')
            .select('id,title,excerpt,image_url,audio_url,play_date')
            .is('series_id', null)
          if (e2) throw e2
          if (pool && pool.length > 0) {
            const rand = pool[Math.floor(Math.random() * pool.length)]
            setStory(rand as Story)
          } else {
            setStory(null)
          }
        }

        // רשימת סיפורים לחיפוש
        const { data: list, error: listError } = await supabase
          .from('stories')
          .select('id,title,excerpt,image_url,audio_url,play_date,publish_at')
          .order('publish_at', { ascending: false })
          .limit(200) // Fetch stories for search
        if (listError) throw listError
        setAllStories(list || [])
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינה')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ---- Web Push ----
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  async function subscribePush() {
    try {
      if (!pushSupported) {
        alert('הדפדפן לא תומך בהתראות פוש')
        return
      }

      // רישום Service Worker (קובץ חייב להיות תחת /public)
      const reg = await navigator.serviceWorker.register('/sw.js')

      // בקשת הרשאה
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      setPushGranted(true)

      // מפתח VAPID ציבורי מהסביבה (שים אותו ב-.env.local בשם VITE_VAPID_PUBLIC_KEY)
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      if (!publicKey) {
        alert('חסר VITE_VAPID_PUBLIC_KEY בקובץ .env.local')
        return
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // שלח שמירה לשרת/Edge Function שלך (התאם למסלול שלך)
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      alert('נרשמת לקבלת עדכונים!')
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'שגיאה בהרשמה לפוש')
    }
  }

  // חיפוש
  const filtered = search.trim()
    ? allStories.filter((s) => {
        const term = search.toLowerCase()
        return s.title.toLowerCase().includes(term) || (s.excerpt || '').toLowerCase().includes(term)
      })
    : []

  return (
    <section className="p-6 max-w-6xl mx-auto" dir="rtl">


      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{err}</div>}
      {loading && <div className="text-gray-500">טוען…</div>}
      {!loading && !story && <div className="text-gray-500">אין סיפורים להצגה.</div>}

      {story && (
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start bg-white border rounded-2xl overflow-hidden shadow-sm p-4 mb-10">
          {/* ימין: תמונה + אודיו + וואטסאפ + פוש */}
          <div className="space-y-3">
            <div className="relative aspect-video">
              {story.image_url ? (
                <img src={story.image_url} alt={story.title} className="w-full rounded-lg object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-100 grid place-items-center text-gray-400">��� �����</div>
              )}
              {story.audio_url && (
                (() => {
                  const isPlaying = player.current?.id === story.id && player.playing
                  if (isPlaying) return null
                  return (
                    <button
                      className="absolute inset-0 grid place-items-center"
                      onClick={() => player.playTrack({ id: story.id, title: story.title, audio_url: story.audio_url! })}
                      aria-label="��� �����"
                      title="����"
                    >
                      <span className="w-14 h-14 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="sr-only">����</span>
                      </span>
                    </button>
                  )
                })()
              )}
            </div>

            {/* שיתוף ב־ווטסאפ */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `📖 ${story.title}\n${window.location.origin}/stories/${story.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-green-600 hover:underline text-sm"
            >
              שתף ב־WhatsApp
            </a>

            {/* כפתור פוש */}
            <div>
              {pushGranted ? (
                <span className="text-xs text-green-600">✓ רשום לקבלת עדכונים</span>
              ) : (
                <button
                  onClick={subscribePush}
                  className="mt-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                  disabled={!pushSupported}
                  title={pushSupported ? '' : 'הדפדפן לא תומך בהתראות פוש'}
                >
                  קבל עדכונים (פוש)
                </button>
              )}
            </div>
          </div>

          {/* שמאל: כותרת + תקציר */}
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
            {story.excerpt ? (
              <p className="text-gray-700 leading-relaxed">{story.excerpt}</p>
            ) : (
              <p className="text-gray-400">אין תקציר זמין.</p>
            )}
          </div>
        </div>
      )}

      {search.trim() && (
        <>
          <h3 className="text-xl font-semibold mb-4">תוצאות חיפוש</h3>
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                const pg = player.getProgress(s.id)
                const started = !!pg && (pg.pos || 0) > 0
                const done = (!!pg && pg.dur > 0 && pg.pos >= pg.dur - 2) || isHeard(s.id)
                return (
                  <article key={s.id} className="relative rounded-2xl border bg-white overflow-hidden shadow-sm">
                    {(done || started) && (
                      <span className={`absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full ${done ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>שמעתי</span>
                    )}
                    <img src={s.image_url || '/logo.png'} alt={s.title} className="w-full h-40 object-cover" />
                    <div className="p-4 space-y-2">
                      <h3 className="text-base font-semibold">{s.title}</h3>
                      {s.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{s.excerpt}</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : <p className="text-gray-500">לא נמצאו סיפורים התואמים לחיפוש.</p>}
        </>
      )}
      {/* spacer is handled by PlayerProvider */}
    </section>
  )
}
