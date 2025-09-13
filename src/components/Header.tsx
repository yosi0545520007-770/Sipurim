import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { listMemorials } from '@/lib/memorials'
import { HDate } from '@hebcal/core'
import { Menu, X, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type StorySuggestion = {
  id: string
  title: string
}

export default function Header() {
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [hebDate, setHebDate] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [memorialName, setMemorialName] = useState<string>('')
  const [open, setOpen] = useState(false)
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<StorySuggestion[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)

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

  useEffect(() => {
    (async () => {
      const { data } = await listMemorials()
      if (data && data.length > 0) {
        const randomHonoree = data[Math.floor(Math.random() * data.length)]
        setMemorialName(randomHonoree.honoree)
      }
    })()
  }, [])

  const links = [
    { href: '/about', label: 'אודות' },
    { href: '/stories', label: 'סיפורים' },
    { href: '/drive', label: 'סיפורים ברצף לנסיעה' },
    { href: '/series', label: 'סדרות' },
    { href: '/ilui', label: 'לעילוי נשמת' },
    { href: '/contact', label: 'צור קשר' },
    { href: '/faq', label: 'שאלות נפוצות' },
  ]

  function submitSearch() {
    const term = (searchQuery || '').trim()
    if (!term) return
    try { window.location.href = `/stories?q=${encodeURIComponent(term)}` } catch {}
  }

  // --- Server-side search with Debouncing ---
  useEffect(() => {
    // Hide suggestions if not focused or query is empty
    if (!isSearchFocused || !searchQuery.trim()) {
      setSearchSuggestions([])
      return
    }

    // Debounce: wait 300ms after user stops typing
    const handler = setTimeout(async () => {
      const term = searchQuery.trim()
      if (!term) return

      // Use Supabase Full-Text Search
      const { data, error } = await supabase
        .from('stories')
        .select('id, title')
        // Format for multi-word search: 'word1' & 'word2'
        .textSearch('title', term.split(' ').filter(Boolean).map(t => `${t}:*`).join(' & '))
        .limit(5)
      if (!error) setSearchSuggestions(data || [])
    }, 300)

    return () => clearTimeout(handler) // Cleanup on new keystroke
  }, [searchQuery, isSearchFocused])

  const renderSearch = (wrapperClassName = "") => (
    <div className={`relative w-full md:w-auto md:max-w-sm ${wrapperClassName}`}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        placeholder="חיפוש סיפורים..."
        className="w-full bg-gray-100 border-transparent rounded-full p-2 pr-10 text-sm focus:ring-2 focus:ring-blue-300 focus:bg-white transition"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submitSearch() }}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)} // Delay to allow click on suggestion
      />
      <AnimatePresence>
        {searchSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10"
          >
            {searchSuggestions.map(story => {
              const href = `/story/${story.id}`
              return (
                <button
                  key={story.id}
                  onClick={() => { try { window.location.href = href } catch {} }}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {story.title}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <header className="border-b bg-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between md:justify-start h-16 gap-4">
          <button
            // Hamburger button
            className="md:hidden p-2 rounded hover:bg-gray-100 flex-shrink-0"
            aria-label={open ? 'סגור תפריט' : 'פתח תפריט'}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* לוגו */}
          <a href="/" className="shrink-0" aria-label="עמוד הבית">
            <img src={logoUrl} alt="סיפורים – דף הבית" className="w-10 h-10 object-contain" />
          </a>

          {/* Mobile search */}
          <div className="flex-1 md:hidden">
            {renderSearch()}
          </div>

          {/* ניווט ראשי */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-blue-600 whitespace-nowrap">{l.label}</a>
            ))}
          </nav>
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
            {/* Mobile date */}
            <div className="md:hidden pt-2 mt-2 border-t text-center text-sm text-gray-500">
              {hebDate}
            </div>
          </div>
        </div>
      )}

      {/* Date row */}
      <div className="max-w-6xl mx-auto px-4 pb-2 border-t md:border-t-0">
        <div className="text-sm text-gray-600 text-center flex items-center justify-center md:justify-start gap-4 flex-wrap">
          {/* Desktop search */}
          <div className="hidden md:block">
            {renderSearch('md:order-none')}
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span>{hebDate}</span>
            {memorialName && <span className="text-gray-500">|</span>}
            {memorialName && <span>לעילוי נשמת: <span className="font-semibold">{memorialName}</span></span>}
          </div>
        </div>
      </div>
    </header>
  )
}
