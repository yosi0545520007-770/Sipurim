import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    let unsub: any
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setAuthed(!!data.session)
      setLoading(false)
      // האזן לשינויי התחברות
      const res = supabase.auth.onAuthStateChange((_e, session) => {
        setAuthed(!!session)
      })
      unsub = res.data.subscription
    })()
    return () => unsub?.unsubscribe?.()
  }, [])

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500" dir="rtl">
        טוען הרשאות…
      </div>
    )
  }

  if (!authed) {
    const redirect = encodeURIComponent(loc.pathname + loc.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}
