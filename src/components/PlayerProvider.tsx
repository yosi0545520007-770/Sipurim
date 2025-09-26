import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { markHeard } from '@/lib/heard'
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'
import { SeriesModal } from './SeriesModal'
import { List } from 'lucide-react'

type Track = { id: string; title: string; audio_url: string; series_id?: string | null; series_title?: string | null }

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
  playNextInQueue: (track: Track) => void
  getProgress: (id: string) => Progress | null
  onReshuffle?: () => void
  setOnReshuffle: (fn: (() => void) | undefined) => void
  skipHeard?: boolean
  setSkipHeard?: (val: boolean) => void
  openDrivePlaylistModal: () => void
  openSeriesModal: (seriesId: string, seriesTitle: string) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

function loadAllProgress(): Record<string, Progress> {
  try { return JSON.parse(localStorage.getItem('playState') || '{}') } catch { return {} }
}
function saveAllProgress(obj: Record<string, Progress>) {
  try { localStorage.setItem('playState', JSON.stringify(obj)) } catch {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = queue[index] || null
  const [onReshuffle, setOnReshuffle] = useState<(() => void) | undefined>(undefined)
  const [skipHeard, setSkipHeard] = useState<boolean | undefined>(undefined)
  const [showDriveModal, setShowDriveModal] = useState(false)
  const [modalSeriesInfo, setModalSeriesInfo] = useState<{ id: string; title: string } | null>(null)

  // progress map in localStorage
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>(() => loadAllProgress())
  useEffect(() => { saveAllProgress(progressMap) }, [progressMap])

  const [canCast, setCanCast] = useState(false);
  useEffect(() => {
    // Check for cast availability once when the component mounts.
    // The API is a browser feature, not track-dependent.
    if (window.HTMLMediaElement && 'remote' in window.HTMLMediaElement.prototype) {
      setCanCast(true);
    }
  }, []);

  function closePlayer() {
    setQueue([])
    setIndex(0)
  }

  const playQueue = useCallback((list: Track[], startIndex = 0) => {
    setQueue(list)
    setIndex(startIndex)
    const t = list[startIndex]
    if (t) {
      // Use a timeout to ensure the state has updated before trying to play
      setTimeout(() => playerRef.current?.audio.current?.play().catch(() => {}), 0)
    }
  }, [])

  const playTrack = useCallback((t: Track) => {
    setQueue([t])
    setIndex(0)
    setTimeout(() => playerRef.current?.audio.current?.play().catch(() => {}), 0)
  }, [])

  const playIndex = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(i, queue.length - 1)));
  }, [queue.length])

  const pause = useCallback(() => {
    playerRef.current?.audio.current?.pause()
  }, [])
  const resume = useCallback(() => {
    playerRef.current?.audio.current?.play().catch(() => {})
  }, [])
  const toggle = useCallback(() => {
    const audio = playerRef.current?.audio.current
    if (audio) {
      audio.paused ? audio.play().catch(() => {}) : audio.pause()
    }
  }, [])
  const prev = useCallback(() => {
    setIndex(i => (queue.length ? (i - 1 + queue.length) % queue.length : 0))
  }, [queue.length])
  const next = useCallback(() => {
    setIndex(i => (queue.length > 0 ? (i + 1) % queue.length : 0))
  }, [queue.length])

  // Effect to seek to last known position when a track starts playing
  useEffect(() => {
    if (!playing || !current) return; // Only seek when playback starts and there's a current track
    const audioEl = playerRef.current?.audio.current
    if (audioEl && current) {
      const pg = progressMap[current.id]
      if (pg && pg.pos && pg.dur && pg.pos < pg.dur - 2) {
        audioEl.currentTime = pg.pos
      }
    }
  }, [playing, current]) // Re-run when playing status or track changes

  const getProgress = useCallback((id: string): Progress | null => {
    return progressMap[id] || null
  }, [progressMap])

  const playNextInQueue = useCallback((track: Track) => {
    setQueue(currentQueue => {
      if (currentQueue.length === 0 || !current) {
        // If queue is empty or nothing is playing, just start a new queue with this track.
        return [track];
      }
      const newQueue = [...currentQueue];
      // Insert the track after the current one.
      newQueue.splice(index + 1, 0, track);
      return newQueue;
    });
  }, [index, current]);

  const openDrivePlaylistModal = useCallback(() => {
    setShowDriveModal(true)
  }, [])

  const openSeriesModal = useCallback((seriesId: string, seriesTitle: string) => {
    setModalSeriesInfo({ id: seriesId, title: seriesTitle })
  }, [])

  const value = useMemo<PlayerContextType>(() => ({
    queue, index, current, playing,
    playQueue, playTrack, closePlayer, playIndex, openDrivePlaylistModal, playNextInQueue,
    toggle, pause, resume, prev, next,
    getProgress, openSeriesModal,
    onReshuffle, setOnReshuffle, skipHeard, setSkipHeard
  }), [queue, index, current, playing, playQueue, playTrack, closePlayer, playIndex, openDrivePlaylistModal, playNextInQueue, toggle, pause, resume, prev, next, getProgress, openSeriesModal, onReshuffle, setOnReshuffle, skipHeard, setSkipHeard])

  return (
    <PlayerContext.Provider value={value}>
      <style>{`
        html {
          overflow-y: scroll;
        }
        .rhap_container {
          background-color: #2d3748; /* bg-gray-800 */
          box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
        }
        .rhap_main-controls-button, .rhap_button-clear {
          color: #fff;
        }
        .rhap_time, .rhap_current-time, .rhap_total-time {
          color: #a0aec0; /* text-gray-400 */
        }
        .rhap_progress-bar, .rhap_volume-bar {
          background-color: #718096; /* bg-gray-600 */
        }
        .rhap_progress-indicator, .rhap_volume-indicator {
          background: #fff;
        }
        .rhap_header {
          color: #fff;
          font-weight: 600;
        }
      `}</style>
      {children}
      {modalSeriesInfo && (
        <SeriesModal
          seriesId={modalSeriesInfo.id}
          seriesTitle={modalSeriesInfo.title}
          onClose={() => setModalSeriesInfo(null)}
        />
      )}
      {showDriveModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"
          onClick={() => setShowDriveModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">רשימת השמעה לנסיעה</h2>
              <button onClick={() => setShowDriveModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </header>
            <div className="p-4 overflow-y-auto">
              <ul className="space-y-2">
                {queue.map((story, idx) => (
                  <li key={story.id}>
                    <button onClick={() => { playIndex(idx); setShowDriveModal(false); }} className="w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3">
                      <span className="text-sm text-gray-500">{idx + 1}.</span>
                      <span className={`font-medium ${index === idx ? 'text-blue-600' : ''}`}>{story.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {current && (
        <div dir="rtl" className="fixed bottom-0 left-0 right-0 z-50">
          <AudioPlayer
            ref={playerRef}
            autoPlay
            src={current.audio_url}
            header={
              <div className="text-center">
                <div className="text-sm text-gray-300">מנגן כעת</div>
                <div className="font-semibold truncate text-base text-white">{current.title}</div>
                {current.series_id && queue.length > 1 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {`פרק ${index + 1} מתוך ${queue.length}`}
                  </div>
                )}
              </div>
            }
            showSkipControls={true}
            showJumpControls={true}
            onClickPrevious={queue.length > 1 ? prev : undefined}
            onClickNext={next}
            onEnded={next}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onListen={(e) => {
              const audio = e.target as HTMLAudioElement
              const pos = audio.currentTime
              const dur = audio.duration
              if (dur > 0) {
                setProgressMap(prev => ({ ...prev, [current.id]: { pos, dur, updatedAt: Date.now() } }))
                // Mark as heard when 80% consumed
                if (pos / dur >= 0.8) {
                  markHeard(current.id)
                }
              }
            }}
            customProgressBarSection={[
              RHAP_UI.PROGRESS_BAR,
              RHAP_UI.CURRENT_TIME,
              <div key="divider" className="mx-1 text-gray-400">/</div>,
              RHAP_UI.DURATION,
            ]}
            customControlsSection={[
              <button key="share" onClick={() => { try { if ((navigator as any).share) { (navigator as any).share({ title: current.title, url: window.location.href }).catch(()=>{}) } else if (navigator.clipboard) { navigator.clipboard.writeText(window.location.href).then(()=>alert('הקישור הועתק')) } } catch {} }} className="rhap_button-clear" aria-label="שיתוף">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51L8.59 10.49"/></svg>
              </button>,
              (current.series_id && current.series_title) ? (
                <button key="series-list" onClick={() => openSeriesModal(current.series_id!, current.series_title!)} className="rhap_button-clear" aria-label="פרקי הסדרה">
                  <List className="w-5 h-5" />
                </button>
              ) : (onReshuffle && queue.length > 1) ? (
                // This is likely "Drive Mode" if reshuffle is available and it's not a series
                <button key="drive-list" onClick={openDrivePlaylistModal} className="rhap_button-clear" aria-label="רשימת השמעה">
                  <List className="w-5 h-5" />
                </button>
              ) : <div key="series-list-placeholder" className="w-5" />,
              onReshuffle ? <button key="shuffle" onClick={onReshuffle} className="rhap_button-clear" aria-label="ערבוב">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.1 8.6c.8 1.1 2 1.7 3.3 1.7H22"/><path d="m18 22-4-4 4-4"/></svg>
              </button> : <div key="shuffle-placeholder" className="w-5" />,
              RHAP_UI.MAIN_CONTROLS,
              canCast ? <button key="cast" onClick={async () => { try { await playerRef.current?.audio.current?.remote.prompt() } catch(e) { console.error(e) } }} className="rhap_button-clear" aria-label="שיקוף">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 9 9"/><path d="M2 17a4 4 0 0 1 4 4"/><line x1="2" x2="2.01" y1="22" y2="22"/></svg>
              </button> : <div key="cast-placeholder" className="w-5" />,
              <button key="close" onClick={closePlayer} className="rhap_button-clear" aria-label="סגור נגן">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ]}
          />
        </div>
      )}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
