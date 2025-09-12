import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* ---------- Types ---------- */
type Series = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  created_at: string
}

/* ---------- Helpers ---------- */
const BUCKET = 'media'

function hasVal(v?: string | null) {
  return !!(v && String(v).trim())
}

async function uploadToBucket(file: File) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `series-covers/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/* ---------- Component ---------- */
export default function SeriesAdmin() {
  const [list, setList] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filterQ, setFilterQ] = useState('')
  const [logoUrl, setLogoUrl] = useState<string>('')

  // form
  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_url: '',
  })

  async function loadSeries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('series')
      .select('id,title,description,cover_url,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) setErr(error.message)
    else setList(data || [])

    // Fetch site logo
    const { data: logoData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_logo_url')
        .maybeSingle()
    setLogoUrl(logoData?.value || '/logo.png')

    setLoading(false)
  }

  useEffect(() => {
    loadSeries()

  }, [])

  const visibleList = useMemo(() => {
    const q = filterQ.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    )
  }, [list, filterQ])

  async function remove(id: string) {
    if (!confirm('למחוק את הסדרה? פעולה זו לא ניתנת לשחזור.')) return
    const { error } = await supabase.from('series').delete().eq('id', id)
    if (error) setErr(error.message)
    else {
      setMsg('נמחק ✓')
      await loadSeries()
    }
  }

  async function createAndGo() {
    const title = prompt('מה שם הסדרה החדשה?')
    if (!title || !title.trim()) return
    try {
      const { data, error } = await supabase.from('series').insert({ title: title.trim() }).select('id').single()
      if (error) throw error
      if (data?.id) {
        window.location.href = `/admin/series/${data.id}`
      }
    } catch (e: any) {
      setErr(e.message || 'שגיאה ביצירת סדרה')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול סדרות</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={createAndGo}>+ סדרה חדשה</button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      <div className="hidden md:block rounded-2xl border overflow-x-auto bg-white">
        <div className="p-4"><input className="border rounded-lg p-2 text-sm" placeholder="חיפוש..." value={filterQ} onChange={(e) => setFilterQ(e.target.value)} /></div>
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">כותרת</th>
              <th className="p-3 text-right">תמונה</th>
              <th className="p-3 text-right">נוצר</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-3 text-gray-500">טוען...</td></tr>}
            {visibleList.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3"><img src={s.cover_url || logoUrl} className="w-12 h-12 object-cover rounded" alt="" /></td>
                <td className="p-3">{s.created_at ? new Date(s.created_at).toLocaleString('he-IL') : '—'}</td>
                <td className="p-3"><div className="flex gap-2 justify-end">
                  <a href={`/admin/series/${s.id}`} className="px-3 py-1 rounded-lg border bg-blue-50 text-blue-700">ניהול</a>
                  <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(s.id)}>מחיקה</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}