import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { HDate } from '@hebcal/core'
import { Menu, X, Search, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type StorySuggestion = {
  id: string
  title: string
}

export default function Header() {
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [hebDate, setHebDate] = useState<string>('')
  const [user, setUser] = useState<any>(null)
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

  const links = [
    { href: '/about', label: 'אודות' },
    { href: '/stories', label: 'רשימת סיפורים' },
    { href: '/series', label: 'סדרות סיפורים' },
    { href: '/ilui', label: 'לעילוי הנשמה' },
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

  return (
    <header className="border-b bg-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center h-16 gap-4">
          <button
            // Hamburger button
            className="md:hidden p-2 rounded hover:bg-gray-100 flex-shrink-0"
            aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          {/* שורת חיפוש */}
          <div className="relative w-full max-w-xs sm:max-w-sm order-2 md:order-none">
            <div className="relative md:ml-auto md:max-w-sm">              
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="חיפוש סיפורים..."
                className="w-full bg-gray-100 border-transparent rounded-full p-3 pr-10 text-base focus:ring-2 focus:ring-blue-300 focus:bg-white transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitSearch() }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)} // Delay to allow click on suggestion
              />
            </div>
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
                  )})}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* לוגו וניווט */}
          <div className="flex items-center gap-6 order-1 md:order-none">
            {/* תפריט (עבר לכאן) */}
            <nav className="hidden md:flex items-center gap-6">
              {links.slice(0, 4).map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-blue-600 whitespace-nowrap">{l.label}</a>
              ))}
            </nav>
          </div>

          <a href="/" className="shrink-0 ml-auto order-3 md:order-none" aria-label="דף הבית"><img src={logoUrl} alt="לוגו האתר" className="w-10 h-10 object-contain" /></a>
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
      <div className="max-w-6xl mx-auto px-4 pb-2">
        <div className="text-sm text-gray-600 text-right">{hebDate}</div>
      </div>
    </header>
  )
}
