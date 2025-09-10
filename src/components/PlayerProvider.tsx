import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { markHeard } from '@/lib/heard'

type Track = { id: string; title: string; audio_url: string }

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
      el.controls = true
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
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

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
          {/* Top row: Title and Time */}
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="font-semibold truncate">{current.title}</div>
            <div>
              <span>{formatTime(progress.pos)}</span> / <span>{formatTime(progress.dur)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={progress.dur || 1}
            value={progress.pos || 0}
            onClick={seek}
            onChange={(e) => { ensureAudio().currentTime = parseFloat(e.target.value) }}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {/* Bottom row: Controls */}
          <div className="flex items-center justify-between mt-2">
            {/* Volume */}
            <div className="flex items-center gap-2 w-32">
              <button onClick={() => { ensureAudio().muted = !muted }}>
                {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-4">
              <button onClick={prev} className="p-2 rounded-full hover:bg-gray-700"><svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform scale-x-[-1]"><path d="M8 5v14l11-7z" /></svg></button>
              <button onClick={toggle} className="w-12 h-12 rounded-full bg-blue-600 grid place-items-center">
                {playing ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={next} className="p-2 rounded-full hover:bg-gray-700"><svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8 5v14l11-7z" /></svg></button>
            </div>

            {/* Right side controls (Shuffle) */}
            <div className="w-32 flex items-center justify-end">
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
    playQueue, playTrack, playIndex,
    toggle, pause, resume, prev, next,
    getProgress,
    onReshuffle, setOnReshuffle, skipHeard, setSkipHeard
  }), [queue, index, current, playing, playQueue, playTrack, playIndex, toggle, pause, resume, prev, next, getProgress, onReshuffle, setOnReshuffle, skipHeard, setSkipHeard])

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
