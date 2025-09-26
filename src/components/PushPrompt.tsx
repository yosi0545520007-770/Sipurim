import { useEffect, useState } from 'react'
import { usePush } from '@/lib/usePush'

const SEEN_KEY = 'push_prompt_seen'

export default function PushPrompt() {
  const [show, setShow] = useState(false)
  const { isSupported, permission, isSubscribed, subscribe, loading } = usePush()

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY) === '1'
    // Show prompt if supported, user hasn't made a choice, hasn't seen the prompt, and isn't subscribed.
    if (!loading && isSupported && permission === 'default' && !isSubscribed && !seen) {
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [isSupported, permission, isSubscribed, loading])

  async function onApprove() {
    await subscribe()
    localStorage.setItem(SEEN_KEY, '1')
    setShow(false)
  }

  function onDismiss() {
    localStorage.setItem(SEEN_KEY, '1')
    setShow(false)
  }

  if (!show) return null

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
