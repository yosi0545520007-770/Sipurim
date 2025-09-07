import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DEV_NO_AUTH = import.meta.env.VITE_DEV_NO_AUTH === 'true'

export default function DevGate({ children }: { children: React.ReactNode }) {
  // אם הדגל פעיל — משחררים בלי בדיקות
  if (DEV_NO_AUTH) return <>{children}</>

  // פרודקשן/ללא הדגל — נבדוק שיש סשן
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setOk(!!data.session)
    })()
  }, [])

  if (ok === null) return <div className="p-6 text-gray-500">טוען…</div>
  if (!ok) {
    // אין סשן — שולחים לדף ההתחברות
    window.location.href = '/login'
    return null
  }
  return <>{children}</>
}
