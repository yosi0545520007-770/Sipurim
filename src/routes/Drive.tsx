import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/components/PlayerProvider'
import { useHeard } from '@/lib/heard'

type Track = {
  id: string
  title: string
  audio_url: string
  image_url: string | null
  series_id?: string | null
}

function guessAudioMime(url: string): string {
  const u = (url || '').toLowerCase()
  if (u.includes('.m4a') || u.includes('.mp4')) return 'audio/mp4'
  if (u.includes('.mp3')) return 'audio/mpeg'
  if (u.includes('.wav')) return 'audio/wav'
  if (u.includes('.ogg') || u.includes('.oga')) return 'audio/ogg'
  return 'audio/mp4'
}

export function Component() {
  const player = usePlayer()
  const { isHeard } = useHeard()
  const [order, setOrder] = useState<Track[]>([])
  const [current, setCurrent] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [err, setErr] = useState<string | null>(null)
  const [showPrayer, setShowPrayer] = useState<boolean>(false)
  const [isReadingPrayer, setIsReadingPrayer] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const { data, error } = await supabase
          .from('stories')
          .select('id,title,audio_url,image_url')
          .is('series_id', null)
          .not('audio_url', 'is', null)
          .neq('audio_url', '')
        if (error) throw error
        setOrder(shuffle(data || []))
        setCurrent(0)
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינת סיפורים')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // --- Prayer Text-to-Speech ---
  const prayerText = `יְהִי רָצוֹן מִלְּפָנֶיךָ ה' אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתּוֹלִיכֵנוּ לְשָׁלוֹם וְתַצְעִידֵנוּ לְשָׁלוֹם. וְתִסְמְכֵנוּ לְשָׁלוֹם. וְתַדְרִיכֵנוּ בְּדֶרֶךְ יְשָׁרָה. וְתַגִּיעֵנוּ לִמְחוֹז חֶפְצֵנוּ לְחַיִּים וּלְשִׂמְחָה וּלְשָׁלוֹם, וְתַחְזִירֵנוּ לְשָׁלוֹם. וְתַצִּילֵנוּ מִכַּף כָּל אוֹיֵב וְאוֹרֵב וְלִסְטִים וְחַיּוֹת רָעוֹת בַּדֶּרֶךְ, וּמִכָּל מִינֵי פֻּרְעָנֻיּוֹת הַמִּתְרַגְּשׁוֹת לָבוֹא לָעוֹלָם. וְתִשְׁלַח בְּרָכָה בְּכָל מַעֲשֵׂה יָדֵינוּ, וְתִתְּנֵנוּ לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאֵינוּ. וְתִגְמְלֵנוּ חֲסָדִים טוֹבִים, וְתִשְׁמַע קוֹל תְּפִלָּתֵנוּ, כִּי אַתָּה שׁוֹמֵעַ תְּפִלַּת כָּל פֶּה. בָּרוּךְ אַתָּה ה', שׁוֹמֵעַ תְּפִלָּה:
וְיַעֲקֹב הָלַךְ לְדַרְכּוֹ וַיִּפְגְּעוּ בוֹ מַלְאֲכֵי אֱלֹהִים: לִקְרַאתְכֶם יֵצְאוּ. יְבָרֶכְךָ ה' וְיִשְׁמְרֶךָ: יָאֵר ה' פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ: יִשָּׂא ה' פָּנָיו אֵלֶיךָ וְיָשֵׂם לְךָ שָׁלוֹם:`

  function togglePrayerReading() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (isReadingPrayer) {
      window.speechSynthesis.cancel()
      setIsReadingPrayer(false)
    } else {
      const voices = window.speechSynthesis.getVoices()
      const hebrewGoogleVoice = voices.find(
        (voice) => voice.lang === 'he-IL' && voice.name.includes('Google')
      )

      const utterance = new SpeechSynthesisUtterance(prayerText)
      utterance.lang = 'he-IL'
      utterance.rate = 0.9
      utterance.onend = () => setIsReadingPrayer(false)
      if (hebrewGoogleVoice) utterance.voice = hebrewGoogleVoice

      window.speechSynthesis.speak(utterance)
      setIsReadingPrayer(true)
    }
  }

  useEffect(() => {
    // Cleanup speech synthesis on component unmount or when modal closes
    return () => window.speechSynthesis?.cancel()
  }, [])

  const currentTrack = order.length > 0 ? order[current] : null

  function playIndex(i: number) {
    setCurrent(i)
    if (order.length > 0 && order[i]) player.playQueue(order, i)
  }

  function next() { if (order.length) playIndex((current + 1) % order.length) }
  function prev() { if (order.length) playIndex((current - 1 + order.length) % order.length) }
  function reshuffle() { setOrder(shuffle(order)); setCurrent(0); player.pause() }

  const playing = player.playing

  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  return (
    <section className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Floating Prayer Button */}
      <button
        onClick={() => setShowPrayer(true)}
        className="fixed bottom-24 md:bottom-6 left-6 z-40 bg-blue-600 text-white rounded-full shadow-lg px-4 py-2 text-sm hover:bg-blue-700"
      >
        תפילת הדרך
      </button>

      {/* Prayer Modal */}
      {showPrayer && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"
          onClick={() => {
            setShowPrayer(false)
            window.speechSynthesis.cancel()
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-center">תפילת הדרך (נוסח חב"ד)</h2>
            <div className="space-y-4 text-center leading-loose">
              {prayerText.split('\n').map((p, i) => <p key={i} className={i > 0 ? 'font-semibold' : ''}>{p}</p>)}
            </div>
            <div className="text-center mt-6 flex items-center justify-center gap-4">
              {'speechSynthesis' in window && (
                <button
                  onClick={togglePrayerReading}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {isReadingPrayer ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  )}
                  {isReadingPrayer ? 'עצור' : 'הקרא'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowPrayer(false)
                  window.speechSynthesis.cancel()
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-3">סיפורים ברצף לנסיעה</h1>
      <p className="text-gray-600 mb-4">רשימת השמעה אקראית מכל הסיפורים עם שמע. אפשר לדלג קדימה/אחורה ולערבב מחדש.</p>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {loading && <div className="text-gray-600">טוען...</div>}

      {!loading && order.length === 0 && (
        <div className="text-gray-600">לא נמצאו סיפורים עם קובץ שמע.</div>
      )}

      {!loading && order.length > 0 && (
        <>
        {/* Hero card */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start bg-white border rounded-2xl overflow-hidden shadow-sm p-4 mb-10">
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
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30"
                    onClick={() => playIndex(current)}
                    aria-label="נגן סיפור"
                    title="נגן"
                  >
                    <span className="w-14 h-14 rounded-full bg-gray-800/60 text-white backdrop-blur flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                    <span className="text-white font-semibold bg-black/30 px-2 py-1 rounded">
                      לחצו להאזנה לסיפור
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
