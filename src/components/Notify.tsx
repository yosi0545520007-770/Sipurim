import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Toast = {
  id: string
  message: string
  type?: 'info' | 'success' | 'error'
  duration?: number
}

type NotifyContextType = (message: string, opts?: { type?: Toast['type']; duration?: number }) => void

const NotifyContext = createContext<NotifyContextType | null>(null)

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
    o.start()
    o.stop(ctx.currentTime + 0.16)
  } catch {}
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, number>>({})

  const notify = useCallback<NotifyContextType>((message, opts) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, message, type: opts?.type || 'info', duration: opts?.duration ?? 3000 }
    setToasts(prev => [...prev, toast])
    beep()
    // auto dismiss
    const t = window.setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id))
      delete timers.current[id]
    }, toast.duration)
    timers.current[id] = t
  }, [])

  useEffect(() => {
    return () => { Object.values(timers.current).forEach(clearTimeout) }
  }, [])

  // expose on window for convenience (optional)
  useEffect(() => {
    ;(window as any).notify = notify
  }, [notify])

  const close = (id: string) => {
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id] }
    setToasts(prev => prev.filter(x => x.id !== id))
  }

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {/* Container */}
      <div dir="rtl" className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`border rounded-xl px-3 py-2 shadow bg-white flex items-center gap-3 ${
              t.type === 'success' ? 'border-green-300' : t.type === 'error' ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <div className={`text-sm ${t.type === 'error' ? 'text-red-700' : t.type === 'success' ? 'text-green-700' : 'text-gray-800'}`}>{t.message}</div>
            <button className="ml-auto text-gray-500 hover:text-gray-700" onClick={() => close(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotifyContext)
  if (!ctx) throw new Error('useNotify must be used within NotifyProvider')
  return ctx
}

