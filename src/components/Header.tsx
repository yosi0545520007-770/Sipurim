import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HDate } from '@hebcal/core'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [hebDate, setHebDate] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_logo_url')
        .maybeSingle()
      setLogoUrl(data?.value || '/logo.png')
    })()
  }, [])

  useEffect(() => {
    try {
      const hd: any = new HDate(new Date())
      const text = typeof hd.renderGematriya === 'function' ? hd.renderGematriya() : hd.render('he')
      setHebDate(text)
    } catch {
      setHebDate('')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data?.user || null) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => { listener.subscription.unsubscribe() }
  }, [])

  const links = [
    { href: '/about', label: 'אודות' },
    { href: '/stories', label: 'רשימת סיפורים' },
    { href: '/drive', label: 'נהיגה – אוסף סיפורים' },
    { href: '/series', label: 'סדרות סיפורים' },
    { href: '/ilui', label: 'לעילוי הנשמה' },
    { href: '/contact', label: 'צור קשר' },
    { href: '/faq', label: 'שאלות נפוצות' },
  ]

  function submitSearch() {
    const term = (q || '').trim()
    if (!term) return
    try { window.location.href = `/stories?q=${encodeURIComponent(term)}` } catch {}
  }

  return (
    <header className="border-b bg-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top row: logo right, date center, hamburger left */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 gap-4">
          <div className="justify-self-start">
            <button
              className="md:hidden p-2 rounded hover:bg-gray-100"
              aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
              onClick={() => setOpen(v => !v)}
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          <div className="justify-self-center text-sm text-gray-700 whitespace-nowrap">{hebDate}</div>
          <div className="justify-self-end">
            <a href="/" className="shrink-0 inline-flex items-center">
              <img src={logoUrl} alt="לוגו האתר" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
            </a>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center justify-center gap-5 py-1">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-blue-600">{l.label}</a>
          ))}
          {user && (
            <a href="/admin" className="text-sm text-gray-700 hover:text-blue-600 font-semibold">ניהול</a>
          )}
        </nav>

        {/* Full-width search below */}
        <div className="py-2">
          <input
            type="text"
            placeholder="חיפוש סיפורים"
            className="w-full border rounded-lg p-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if ((e as any).key === 'Enter') submitSearch() }}
          />
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-gray-700 hover:text-blue-600" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            {user && (
              <a href="/admin" className="text-gray-700 hover:text-blue-600 font-semibold" onClick={() => setOpen(false)}>
                ניהול
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

