import { Outlet } from 'react-router-dom'
import Header from '@/components/Header'
import PushButton from '@/components/PushButton'
import { Suspense, useEffect, useState } from 'react'
import PushPrompt from '@/components/PushPrompt'
import { PlayerProvider } from '@/components/PlayerProvider'
import { NotifyProvider } from '@/components/Notify'
import { EditModeProvider, EditModeToggle } from '@/components/EditMode'
import { loadHeardFromRemote } from '@/lib/heard'

export default function Root() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll)
    // sync "heard" markers from Supabase if logged in (best-effort)
    loadHeardFromRemote().catch(() => {})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <PlayerProvider>
      <NotifyProvider>
        <EditModeProvider>
          <div dir="rtl" className="min-h-screen flex flex-col">
            <div className={`sticky top-0 z-50 transition-shadow bg-white ${scrolled ? 'shadow-md' : ''}`}>
              <Header />
              {/* ✅ כפתור פוש צף בכל הדפים */}
              <PushPrompt />
            </div>

            <main className="flex-1">
              <Suspense fallback={<div className="p-6 text-center text-gray-500">טוען...</div>}>
                <Outlet />
              </Suspense>
            </main>

            <footer className="border-t bg-gray-50 py-8 text-center text-sm text-gray-500">
              <div>ספריית הסיפורים {new Date().getFullYear()}</div>
              <div className="mt-1">יחי אדונינו מורינו ורבינו מלך המשיח לעולם ועד</div>
            </footer>

            {/* פוש וניהול מצב עריכה */}
            <PushButton />
          </div>
        </EditModeProvider>
      </NotifyProvider>
    </PlayerProvider>
  )
}
