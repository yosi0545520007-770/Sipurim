import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // או ../lib/supabase אם אין alias

type SeriesRow = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  created_at: string
}

export default function Series() {
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null)
      const { data, error } = await supabase
        .from('series')
        .select('id,title,description,cover_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) setErr(error.message)
      setSeries(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <section className="container mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">סיפורים בהמשכים</h1>

      {loading && <div className="text-gray-500">טוען…</div>}
      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 mb-4">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {series.map(s => (
          <article key={s.id} className="rounded-2xl border bg-white overflow-hidden">
            {s.cover_url
              ? <img src={s.cover_url} alt="" className="w-full h-48 object-cover" />
              : <div className="w-full h-48 bg-gray-100" />
            }
            <div className="p-4">
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{s.description || '—'}</p>
            </div>
          </article>
        ))}
      </div>

      {!loading && !err && series.length === 0 && (
        <div className="mt-4 text-gray-500">אין סדרות להצגה כרגע.</div>
      )}
    </section>
  )
}
