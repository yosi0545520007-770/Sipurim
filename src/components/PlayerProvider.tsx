import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { markHeard } from '@/lib/heard'

type Track = { id: string; title: string; audio_url: string; series_id?: string | null }

type Progress = {
  pos: number
  dur: number
  updatedAt: number
}

type PlayerContextType = {
  queue: Track[]
  index: number
  current: Track | null
  playing: boolean
  playQueue: (list: Track[], startIndex?: number) => void
  playTrack: (t: Track) => void
  closePlayer: () => void
  playIndex: (i: number) => void
  toggle: () => void
  pause: () => void
  resume: () => void
  prev: () => void
  next: () => void
  getProgress: (id: string) => Progress | null
  onReshuffle?: () => void
  setOnReshuffle: (fn: (() => void) | undefined) => void
  skipHeard?: boolean
  setSkipHeard?: (val: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

function loadAllProgress(): Record<string, Progress> {
  try { return JSON.parse(localStorage.getItem('playState') || '{}') } catch { return {} }
}
function saveAllProgress(obj: Record<string, Progress>) {
  try { localStorage.setItem('playState', JSON.stringify(obj)) } catch {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = queue[index] || null
  const [onReshuffle, setOnReshuffle] = useState<(() => void) | undefined>(undefined)
  const [skipHeard, setSkipHeard] = useState<boolean | undefined>(undefined)

  // progress map in localStorage
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>(() => loadAllProgress())
  useEffect(() => { saveAllProgress(progressMap) }, [progressMap])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = document.createElement('audio')
      el.preload = 'none'
      // Hide native controls; we render our own custom bar
      el.controls = false
      el.className = 'w-full'
      el.setAttribute('controlsList', 'nodownload noplaybackrate')
      el.oncontextmenu = (e) => { e.preventDefault() }
      el.addEventListener('play', () => setPlaying(true))
      el.addEventListener('pause', () => setPlaying(false))
      const marked: Record<string, 1> = {}
      el.addEventListener('timeupdate', () => {
        const c = queue[index]
        if (!c) return
        const pos = el.currentTime || 0
        const dur = el.duration || 0
        setProgressMap(prev => ({ ...prev, [c.id]: { pos, dur, updatedAt: Date.now() } }))
        // Mark as heard when 80% consumed
        if (dur > 0 && pos / dur >= 0.8 && !marked[c.id]) {
          marked[c.id] = 1
          markHeard(c.id)
        }
      })
      el.addEventListener('ended', () => {
        const c = queue[index]
        if (c && !marked[c.id]) { marked[c.id] = 1; markHeard(c.id) }
        // advance locally to avoid referencing callbacks defined later
        setIndex(i => (queue.length ? (i + 1) % queue.length : 0))
      })
      audioRef.current = el
    }
    return audioRef.current!
  }, [queue.length, index])

  // --- New Player UI ---
  const [progress, setProgress] = useState({ pos: 0, dur: 0 })
  // Volume UI removed for a cleaner, driving-friendly player
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const el = ensureAudio()
    const onTime = () => setProgress({ pos: el.currentTime, dur: el.duration })
    const onVol = () => { setVolume(el.volume); setMuted(el.muted) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('durationchange', onTime)
    el.addEventListener('loadedmetadata', onTime)
    el.addEventListener('volumechange', onVol)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('durationchange', onTime)
      el.removeEventListener('loadedmetadata', onTime)
      el.removeEventListener('volumechange', onVol)
    }
  }, [ensureAudio])

  function seek(e: React.MouseEvent<HTMLInputElement>) {
    const el = ensureAudio()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    if (isFinite(el.duration)) el.currentTime = el.duration * pct
  }

  function changeVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const el = ensureAudio()
    el.volume = parseFloat(e.target.value)
  }

  // Skip within current track by delta seconds (e.g., -15 / +15)
  function skipBy(deltaSec: number) {
    const el = ensureAudio()
    const dur = isFinite(el.duration) ? el.duration : 0
    const next = Math.max(0, Math.min((el.currentTime || 0) + deltaSec, dur || (el.currentTime || 0)))
    try { el.currentTime = next } catch {}
  }

  function formatTime(sec: number): string {
    if (!isFinite(sec)) return '00:00'
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const PlayerBar = () => {
    if (!current) return null

    return (
      <div dir="rtl" className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Like | Title | Close (Spotify-like top row) */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setLiked(v => !v)} className="p-2 rounded-full hover:bg-gray-700" aria-label={liked ? 'הסר אהבתי' : 'סמן אהבתי'}>
              {liked ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-pink-400"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.61C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M20.8 8.5C20.8 6 18.8 4 16.3 4c-1.7 0-3.4 1-4.3 2.6C11.1 5 9.4 4 7.7 4 5.2 4 3.2 6 3.2 8.5c0 3.8 3.4 6.9 8.6 11.6 5.2-4.7 8.6-7.8 8.6-11.6z"/></svg>
              )}
            </button>
            <div className="text-center flex-1 px-2" aria-live="polite">

              <div className="text-xs text-gray-300">מנגן כעת</div>

              <div className="font-semibold truncate text-base text-white">{current.title}</div>

              {current.series_id && queue.length > 1 && (
              <div className="text-xs text-gray-400 mt-0.5">
                {`פרק ${index + 1} מתוך ${queue.length}`}
              </div>
            )}

            </div>


            <button onClick={closePlayer} className="p-2 rounded-full hover:bg-gray-700" aria-label="סגירה">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={progress.dur || 1}
            value={progress.pos || 0}
            onClick={seek}
            onChange={(e) => { ensureAudio().currentTime = parseFloat(e.target.value) }}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <div className="flex items-center justify-between text-xs text-gray-300 mt-1">
            <span>{formatTime(progress.pos)}</span>
            <span>{formatTime(progress.dur)}</span>
          </div>

          {/* Bottom row: Controls */}
          <div className="flex items-center justify-between mt-3">
            {/* Left side: Shuffle + Share */}
            <div className="w-32 flex items-center gap-2">
              <button onClick={onReshuffle} className="p-2 rounded-full hover:bg-gray-700" aria-label="ערבוב">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16l5-5 4 4 5-5"/><path d="M14 7h7v7"/></svg>
              </button>
              <button onClick={() => { try { if ((navigator as any).share) { (navigator as any).share({ title: current.title, url: window.location.href }).catch(()=>{}) } else if (navigator.clipboard) { navigator.clipboard.writeText(window.location.href).then(()=>alert('הקישור הועתק')) } } catch {} }} className="p-2 rounded-full hover:bg-gray-700" aria-label="שיתוף">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51L8.59 10.49"/></svg>
              </button>
            </div>

            {/* Main Controls — driving friendly */}
            <div className="flex items-center gap-5">
              {/* Back 15s */}
              <button
                onClick={prev}
                className="p-3 rounded-full hover:bg-gray-700"
                aria-label="הקודם"
                title="הקודם"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M12 5v3l-4-4 4-4v3c5.06 0 9 3.94 9 9s-3.94 9-9 9-9-3.94-9-9h2c0 3.86 3.14 7 7 7s7-3.14 7-7-3.14-7-7-7z"/>
                  <path d="M10.5 9.5v5h1.5v-2.8l1.6 2.8h1.7l-1.9-3.1 1.8-1.9h-1.7l-1.5 1.6V9.5z"/>
                </svg>
              </button>

              {/* Play/Pause */}
              <button onClick={toggle} className="w-16 h-16 rounded-full bg-white text-gray-900 grid place-items-center">
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>

              {/* Forward 15s */}
              <button
                onClick={next}
                className="p-3 rounded-full hover:bg-gray-700"
                aria-label="הבא"
                title="הבא"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M12 5v3l4-4-4-4v3c-5.06 0-9 3.94-9 9s3.94 9 9 9 9-3.94 9-9h-2c0 3.86-3.14 7-7 7s-7-3.14-7-7 3.14-7 7-7z"/>
                  <path d="M12.1 9.5v5h1.5v-2.8l1.6 2.8h1.7l-1.9-3.1 1.8-1.9h-1.7l-1.5 1.6V9.5z"/>
                </svg>
              </button>
            </div>

            {/* Right side controls (Queue) */}
            <div className="w-32 flex items-center justify-end gap-2">
              <button onClick={() => alert(`בתור ${queue.length} פריטים`)} className="p-2 rounded-full hover:bg-gray-700" aria-label="תור">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="12" y2="18"/></svg>
              </button>
              {onReshuffle && (
                <>
                  {typeof skipHeard === 'boolean' && setSkipHeard && (
                    <label className="flex items-center cursor-pointer" title="דלג על סיפורים ששמעתי">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={skipHeard}
                        onChange={(e) => setSkipHeard(e.target.checked)}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors ${skipHeard ? 'text-blue-400' : 'text-gray-400'}`}>
                        <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
                        <path d="m2 12 5 5L12 12"/><path d="m22 12-5-5-5 5"/>
                      </svg>
                    </label>
                  )}

                <button
                  onClick={onReshuffle}
                  className="p-2 rounded-full hover:bg-gray-700"
                  title="ערבב"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.1 8.6c.8 1.1 2 1.7 3.3 1.7H22"/><path d="m18 22-4-4 4-4"/></svg>
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function closePlayer() {
    const el = ensureAudio()
    el.pause()
    el.src = ''
    setQueue([])
    setIndex(0)
  }

  // ✅ עדכון נראות כפתור הערבוב כאשר onReshuffle משתנה
  const loadAndPlay = useCallback((t: Track) => {
    const el = ensureAudio()
    if (el.src !== t.audio_url) {
      el.src = t.audio_url
    }
    // resume position if exists
    const pg = progressMap[t.id]
    if (pg && pg.pos && pg.dur && pg.pos < pg.dur - 2) {
      try { el.currentTime = pg.pos } catch {}
    }
    el.play().catch(()=>{})
  }, [ensureAudio, progressMap])

  const playQueue = useCallback((list: Track[], startIndex = 0) => {
    setQueue(list)
    setIndex(startIndex)
    const t = list[startIndex]
    if (t) {
      // attempt immediate play in the same gesture
      loadAndPlay(t)
    }
  }, [loadAndPlay])

  const playTrack = useCallback((t: Track) => {
    setQueue([t])
    setIndex(0)
    // attempt immediate play in the same gesture
    loadAndPlay(t)
  }, [loadAndPlay])

  const playIndex = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(i, queue.length - 1)))
  }, [queue.length])

  const pause = useCallback(() => {
    const el = ensureAudio(); el.pause(); setPlaying(false)
  }, [ensureAudio])
  const resume = useCallback(() => {
    const el = ensureAudio(); el.play().catch(()=>{}); setPlaying(true)
  }, [ensureAudio])
  const toggle = useCallback(() => {
    const el = ensureAudio(); if (el.paused) { el.play().catch(()=>{}); setPlaying(true) } else { el.pause(); setPlaying(false) }
  }, [ensureAudio])
  const prev = useCallback(() => {
    setIndex(i => (queue.length ? (i - 1 + queue.length) % queue.length : 0))
  }, [queue.length])
  const next = useCallback(() => {
    setIndex(i => (queue.length ? (i + 1) % queue.length : 0))
  }, [queue.length])

  // when current changes, load and play
  useEffect(() => {
    if (current) loadAndPlay(current)
  }, [current, loadAndPlay])

  const getProgress = useCallback((id: string): Progress | null => {
    return progressMap[id] || null
  }, [progressMap])

  const value = useMemo<PlayerContextType>(() => ({
    queue, index, current, playing,
    playQueue, playTrack, closePlayer, playIndex,
    toggle, pause, resume, prev, next,
    getProgress,
    onReshuffle, setOnReshuffle, skipHeard, setSkipHeard
  }), [queue, index, current, playing, playQueue, playTrack, closePlayer, playIndex, toggle, pause, resume, prev, next, getProgress, onReshuffle, setOnReshuffle, skipHeard, setSkipHeard])

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerBar />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
