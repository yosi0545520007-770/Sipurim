import { useEffect, useState } from 'react'

const SEEN_KEY = 'push_prompt_seen'
const SUB_KEY  = 'push_prompt_subscribed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushPrompt() {
  const [supported, setSupported] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const sup = 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
    setSupported(sup)

    const alreadyGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
    const seen = localStorage.getItem(SEEN_KEY) === '1'
    const subscribed = localStorage.getItem(SUB_KEY) === '1'

    if (sup && !alreadyGranted && !seen && !subscribed) {
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  async function onApprove() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { localStorage.setItem(SEEN_KEY, '1'); setShow(false); return }

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      if (!publicKey) { alert('חסר VITE_VAPID_PUBLIC_KEY ב-.env.local'); localStorage.setItem(SEEN_KEY, '1'); setShow(false); return }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // שמירה לשרת (תעדכן ל-API שלך)
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      localStorage.setItem(SUB_KEY, '1')
      localStorage.setItem(SEEN_KEY, '1')
      setShow(false)
    } catch (e) {
      console.error(e)
      localStorage.setItem(SEEN_KEY, '1')
      setShow(false)
    }
  }

  function onDismiss() { localStorage.setItem(SEEN_KEY, '1'); setShow(false) }

  if (!supported || !show) return null

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60]">
      <div className="flex items-center gap-3 bg-white/95 backdrop-blur border rounded-full shadow-lg px-3 py-2" dir="rtl">
        <img src="/logo.png" alt="לוגו" className="w-7 h-7 rounded-full object-cover" />
        <div className="text-sm">רוצים לקבל עדכונים כשעולה סיפור חדש?</div>
        <button onClick={onApprove} className="text-sm bg-blue-600 text-white rounded-full px-3 py-1">אישור</button>
        <button onClick={onDismiss} className="text-sm text-gray-500 hover:text-gray-700 px-2" title="סגירה">✕</button>
      </div>
    </div>
  )
}
