import { Outlet } from 'react-router-dom'
import Header from '@/components/Header'
import PushButton from '@/components/PushButton'
import { useEffect, useState } from 'react'
import PushPrompt from '@/components/PushPrompt'
import { PlayerProvider } from '@/components/PlayerProvider'
import { NotifyProvider } from '@/components/Notify'

export default function Root() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <PlayerProvider>
    <NotifyProvider>
    <div dir="rtl" className="min-h-screen flex flex-col">
      <div className={`sticky top-0 z-50 transition-shadow bg-white ${scrolled ? 'shadow-md' : ''}`}>
        <Header />
        {/* פופ־אפ הרשמה בביקור ראשון */}
<PushPrompt />

      </div>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ספריית הסיפורים
      </footer>

      {/* ✅ כפתור פוש צף בכל הדפים */}
      <PushButton />
    </div>
    </NotifyProvider>
    </PlayerProvider>
  )
}
