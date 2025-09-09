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

  const mountBar = useCallback(() => {
    let bar = document.getElementById('mini-player-bar')
    if (!bar) {
      bar = document.createElement('div')
      bar.id = 'mini-player-bar'
      bar.dir = 'rtl'
      bar.className = 'fixed bottom-0 left-0 right-0 z-50 bg-gray-100 border-t'
      document.body.appendChild(bar)
    }
    const el = ensureAudio()
    if (!bar.contains(el)) {
      const wrap = document.createElement('div')
      wrap.className = 'max-w-6xl mx-auto px-4 py-2 flex items-center gap-3'
      const title = document.createElement('div')
      title.id = 'mini-player-title'
      title.className = 'text-sm text-gray-800 truncate flex-1'
      const controls = document.createElement('div')
      controls.className = 'flex items-center gap-2'

      const btn = (text: string, onClick: () => void, cls = '') => {
        const b = document.createElement('button')
        b.textContent = text
        b.className = 'px-2 py-1 rounded border ' + cls
        b.onclick = onClick
        return b
      }

      const prevBtn = btn('‹', () => prev())
      const toggleBtn = btn('נגן/הפסק', () => toggle(), 'bg-blue-600 text-white')
      const nextBtn = btn('›', () => next())

      controls.appendChild(prevBtn)
      controls.appendChild(toggleBtn)
      controls.appendChild(nextBtn)

      // Replace button text with icons-only and accessible labels
      const setPrevIcon = () => {
        prevBtn.textContent = ''
        prevBtn.setAttribute('aria-label', 'הקודם')
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">'
          + '<path d="M15 5v14l-11-7z" />'
          + '</svg>'
          + '<span class="sr-only">הקודם</span>'
      }
      const setNextIcon = () => {
        nextBtn.textContent = ''
        nextBtn.setAttribute('aria-label', 'הבא')
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">'
          + '<path d="M8 5v14l11-7z" />'
          + '</svg>'
          + '<span class="sr-only">הבא</span>'
      }
      const setToggleIcon = () => {
        toggleBtn.textContent = ''
        if (!el.paused) {
          toggleBtn.setAttribute('aria-label', 'השהה')
          toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">'
            + '<path d="M6 5h4v14H6zM14 5h4v14h-4z" />'
            + '</svg>'
            + '<span class="sr-only">השהה</span>'
        } else {
          toggleBtn.setAttribute('aria-label', 'נגן')
          toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">'
            + '<path d="M8 5v14l11-7z" />'
            + '</svg>'
            + '<span class="sr-only">נגן</span>'
        }
      }
      setPrevIcon(); setNextIcon(); setToggleIcon()
      el.addEventListener('play', setToggleIcon)
      el.addEventListener('pause', setToggleIcon)

      wrap.appendChild(title)
      wrap.appendChild(controls)
      wrap.appendChild(el)
      bar.innerHTML = ''
      bar.appendChild(wrap)
    }
    // spacer
    let spacer = document.getElementById('mini-player-spacer')
    if (!spacer) {
      spacer = document.createElement('div')
      spacer.id = 'mini-player-spacer'
      spacer.className = 'h-24 md:hidden'
      document.body.appendChild(spacer)
    }
  }, [ensureAudio])

  const updateTitle = useCallback(() => {
    const t = document.getElementById('mini-player-title')
    if (t) t.textContent = current ? current.title : ''
  }, [current])

  const loadAndPlay = useCallback((t: Track) => {
    // mount bar before attempting play (user gesture retention)
    mountBar()
    const el = ensureAudio()
    if (el.src !== t.audio_url) {
      el.src = t.audio_url
    }
    // resume position if exists
    const pg = progressMap[t.id]
    if (pg && pg.pos && pg.dur && pg.pos < pg.dur - 2) {
      try { el.currentTime = pg.pos } catch {}
    }
    updateTitle()
    el.play().catch(()=>{})
  }, [ensureAudio, progressMap, mountBar, updateTitle])

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
  }), [queue, index, current, playing, playQueue, playTrack, playIndex, toggle, pause, resume, prev, next, getProgress])

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
