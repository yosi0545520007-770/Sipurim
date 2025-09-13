import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function Component() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // אם כבר מחובר—נתב לאדמין
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/admin', { replace: true })
    })
  }, [nav])

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      setErr(null); setBusy(true)
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      const redirect = params.get('redirect') || '/admin'
      nav(redirect, { replace: true })
    } catch (e:any) {
      setErr(e.message || 'שגיאה בהתחברות')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    try {
      setErr(null); setBusy(true)
const redirectTo = `${window.location.origin}/login`


      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      })
      if (error) throw error
      // Supabase יבצע redirect החוצה—אין המשך קוד פה
    } catch (e:any) {
      setBusy(false)
      setErr(e.message || 'שגיאה ב-Google Login')
    }
  }

  return (
    <section className="p-6 max-w-sm mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">התחברות</h1>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}

      <form onSubmit={onEmailLogin} className="grid gap-3 bg-white border rounded-2xl p-4">
        <div className="grid gap-1">
          <label className="text-sm text-gray-600">אימייל</label>
          <input
            type="email"
            required
            className="border rounded-lg p-3"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@gmail.com"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-gray-600">סיסמה</label>
          <input
            type="password"
            required
            className="border rounded-lg p-3"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50"
          disabled={busy}
        >
          התחברות
        </button>
      </form>

      <div className="my-4 text-center text-sm text-gray-500">או</div>

      <button
        onClick={onGoogle}
        className="w-full border rounded-lg py-2 bg-white hover:bg-gray-50 disabled:opacity-50"
        disabled={busy}
      >
        התחברות עם Google
      </button>

      <div className="text-xs text-gray-500 mt-6 text-center">
        <Link to="/">חזרה לעמוד הבית</Link>
      </div>
    </section>
  )
}
