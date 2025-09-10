import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { usePlayer } from './PlayerProvider'

export default function PushButton() {
  const player = usePlayer()
  const [supported, setSupported] = useState(false)
  const [granted, setGranted] = useState(
    typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
  )
  const [visible, setVisible] = useState(false)

  const isPlayerVisible = player.current !== null
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string


  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(isSupported)
    if (isSupported && Notification.permission !== 'granted') {
      // Show the button only if notifications are not yet granted
      setVisible(true)
    }
  }, [])

  async function subscribe() {
    try {
      if (!supported) return

      const reg = await navigator.serviceWorker.register('/sw.js')

      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      setGranted(true)

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      if (!publicKey) {
        alert('חסר VITE_VAPID_PUBLIC_KEY בקובץ .env.local')
        return
      }

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

      alert('נרשמת לעדכונים בהצלחה!')
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'שגיאה בהרשמה לפוש')
    }
  }

  return (
    <button
      className={`fixed left-4 z-40 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg grid place-items-center transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'} ${isPlayerVisible ? 'bottom-24' : 'bottom-4'}`}
      onClick={subscribe}
      aria-label="הירשם לקבלת עדכונים"
      title="הירשם לקבלת עדכונים"
    >
      <Bell className="w-6 h-6" />
    </button>
  )
}
