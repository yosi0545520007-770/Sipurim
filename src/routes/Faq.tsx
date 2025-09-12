import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Faq = { id: string; question: string; answer: string; sort_order: number }

export default function Faq() {
  const [list, setList] = useState<Faq[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('faq')
          .select('id,question,answer,sort_order,is_published')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
        if (error) throw error
        const mapped = (data || []).map(({ id, question, answer, sort_order }) => ({ id, question, answer, sort_order }))
        setList(mapped)
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינה')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <section className="p-6 max-w-3xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">שאלות נפוצות</h1>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {loading && <div className="text-gray-600">טוען…</div>}

      {!loading && (
        <div className="divide-y rounded-2xl border bg-white">
          {list.length === 0 && <div className="p-4 text-gray-500">אין שאלות כרגע.</div>}

          {list.map((item) => (
            <details key={item.id} className="p-4 group">
              <summary className="cursor-pointer font-medium flex items-center justify-between">
                {item.question}
                <span className="text-gray-400 group-open:rotate-180 transition">⌄</span>
              </summary>
              <div className="mt-2 text-gray-700 whitespace-pre-wrap">{item.answer}</div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
