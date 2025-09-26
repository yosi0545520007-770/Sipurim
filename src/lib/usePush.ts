import { useEffect, useState, useCallback } from 'react'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

type PushState = {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscribe: () => Promise<void>
  error: string | null
  loading: boolean
}

export function usePush(): PushState {
  const [isSupported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSubscriptionStatus() {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
      setSupported(supported)

      if (supported) {
        setPermission(Notification.permission)
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setSubscribed(!!subscription)
      } else {
        setPermission('denied')
      }
      setLoading(false)
    }

    checkSubscriptionStatus()
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('התראות Push אינן נתמכות בדפדפן זה.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const reg = await navigator.serviceWorker.register('/sw.js')
      const currentPermission = await Notification.requestPermission()
      setPermission(currentPermission)

      if (currentPermission !== 'granted') {
        throw new Error('נדרשת הרשאה לקבלת התראות.')
      }

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('מפתח VAPID אינו מוגדר.')
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // TODO: Send subscription to your server
      console.log('Subscription successful:', subscription)
      setSubscribed(true)
    } catch (e: any) {
      console.error('Failed to subscribe:', e)
      setError(e.message || 'שגיאה בתהליך ההרשמה.')
      setSubscribed(false)
    }
    setLoading(false)
  }, [isSupported])

  return { isSupported, permission, isSubscribed, subscribe, error, loading }
}