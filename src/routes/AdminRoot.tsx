import { Outlet, NavLink, Link } from 'react-router-dom'
import { Home, List, Layers, Settings, LogOut, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const adminLinks = [
  { href: '/admin', label: 'דשבורד', icon: Home, end: true },
  { href: '/admin/stories', label: 'סיפורים', icon: List },
  { href: '/admin/series', label: 'סדרות', icon: Layers },
  { href: '/admin/categories', label: 'קטגוריות', icon: Settings },
  { href: '/admin/faq', label: 'שאלות נפוצות', icon: Settings },
]

export default function AdminRoot() {
  return (
    <div className="flex min-h-[calc(100vh-65px)]" dir="rtl">
      <aside className="w-56 bg-gray-50 border-l p-4">
        <nav className="flex flex-col gap-2 h-full">
          {adminLinks.map(link => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-200'
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          ))}
          <div className="mt-auto pt-4 border-t">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>חזרה לאתר</span>
            </Link>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 w-full">
              <LogOut className="w-4 h-4" />
              <span>התנתקות</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 bg-white">
        <Outlet />
      </main>
    </div>
  )
}