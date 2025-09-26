import { Bell } from 'lucide-react'
import { usePlayer } from './PlayerProvider'
import { usePush } from '@/lib/usePush'

export default function PushButton() {
  const player = usePlayer()
  const { isSupported, permission, isSubscribed, subscribe, loading } = usePush()

  const isPlayerVisible = player.current !== null

  // Show button only if supported and user has not yet made a decision or has denied it.
  const isVisible = !loading && isSupported && !isSubscribed && permission !== 'granted'
  if (!isVisible) {
    return null
  }

  return (
    <button
      className={`fixed left-4 z-40 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg grid place-items-center transition-all duration-300 ${isPlayerVisible ? 'bottom-24' : 'bottom-4'}`}
      onClick={subscribe}
      aria-label="הירשם לקבלת עדכונים"
      title="הירשם לקבלת עדכונים"
    >
      <Bell className="w-6 h-6" />
    </button>
  )
}
