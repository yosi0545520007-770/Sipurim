import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

export default function PushButton() {
  const [supported, setSupported] = useState(false)
  const [granted, setGranted] = useState(
    typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
  )

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  async function subscribe() {
    try {
      if (!supported) return alert('הדפדפן לא תומך בפוש')

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

  if (!supported) return null

  return (
    <button
      onClick={subscribe}
      className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition"
      title={granted ? 'כבר רשום לקבלת עדכונים' : 'קבל עדכונים'}
    >
      <Bell className="w-6 h-6" />
    </button>
  )
}
