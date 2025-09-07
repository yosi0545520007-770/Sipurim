import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Faq = {
  id: string
  question: string
  answer: string
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string | null
}

export default function AdminFaq() {
  const [list, setList] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // modal form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [published, setPublished] = useState(true)
  const [order, setOrder] = useState<number>(0)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setErr(null); setLoading(true)
      const { data, error } = await supabase
        .from('faq')
        .select('id,question,answer,sort_order,is_published,created_at,updated_at')
        .order('is_published', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      setList((data || []) as Faq[])
    } catch (e:any) {
      setErr(e.message || 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function clearForm() {
    setEditingId(null)
    setQ(''); setA('')
    setPublished(true)
    setOrder((list.length ? Math.max(...list.map(x=>x.sort_order)) : 0) + 1)
  }

  function openCreate() {
    clearForm()
    setModalOpen(true)
  }

  function openEdit(item: Faq) {
    setEditingId(item.id)
    setQ(item.question)
    setA(item.answer)
    setPublished(item.is_published)
    setOrder(item.sort_order)
    setModalOpen(true)
  }

  async function save() {
    try {
      setBusy(true); setErr(null); setMsg(null)
      if (!q.trim() || !a.trim()) throw new Error('שאלה ותשובה — חובה')
      const payload = {
        question: q.trim(),
        answer: a.trim(),
        sort_order: Number.isFinite(order) ? order : 0,
        is_published: !!published,
        updated_at: new Date().toISOString()
      }
      if (editingId) {
        const { error } = await supabase.from('faq').update(payload).eq('id', editingId)
        if (error) throw error
        setMsg('עודכן ✓')
      } else {
        const { error } = await supabase.from('faq').insert(payload)
        if (error) throw error
        setMsg('נוסף ✓')
      }
      setModalOpen(false)
      await load()
    } catch (e:any) {
      setErr(e.message || 'שגיאת שמירה')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('למחוק את השאלה?')) return
    const { error } = await supabase.from('faq').delete().eq('id', id)
    if (error) setErr(error.message); else { setMsg('נמחק ✓'); load() }
  }

  async function quickToggle(item: Faq) {
    const { error } = await supabase
      .from('faq')
      .update({ is_published: !item.is_published, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (!error) load()
  }

  return (
    <section className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">ניהול שאלות נפוצות (FAQ)</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={openCreate}>+ שאלה חדשה</button>
      </div>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded mb-3">{msg}</div>}

      {/* טבלה */}
      <div className="rounded-2xl border overflow-x-auto bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">שאלה</th>
              <th className="p-3 text-right">מפורסם</th>
              <th className="p-3 text-right">סדר</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-3 text-gray-500">טוען…</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={4} className="p-3 text-gray-500">אין שאלות עדיין.</td></tr>}
            {list.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-3 align-top">
                  <div className="font-medium">{item.question}</div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.answer}</div>
                </td>
                <td className="p-3">{item.is_published ? '✅' : '⛔'}</td>
                <td className="p-3">{item.sort_order}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <button className="px-3 py-1 rounded-lg border" onClick={() => openEdit(item)}>עריכה</button>
                  <button className="px-3 py-1 rounded-lg border" onClick={() => quickToggle(item)}>
                    {item.is_published ? 'השבת' : 'פרסם'}
                  </button>
                  <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(item.id)}>מחיקה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* מודאל יצירה/עריכה */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'עריכת שאלה' : 'שאלה חדשה'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-500">✕</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2" dir="rtl">
              <div className="md:col-span-2 grid gap-1">
                <label className="text-sm text-gray-600">שאלה *</label>
                <input
                  className="border rounded-lg p-3"
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                  placeholder="מהו זמן השמעת הסיפור היומי?"
                />
              </div>

              <div className="md:col-span-2 grid gap-1">
                <label className="text-sm text-gray-600">תשובה *</label>
                <textarea
                  className="border rounded-lg p-3 min-h-[140px]"
                  value={a}
                  onChange={e=>setA(e.target.value)}
                  placeholder="ניתן להאזין לסיפור היומי החל מהשעה..."
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm text-gray-600">סדר הצגה</label>
                <input
                  type="number"
                  className="border rounded-lg p-3"
                  value={order}
                  onChange={e=>setOrder(parseInt(e.target.value || '0',10))}
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  id="pub"
                  type="checkbox"
                  className="w-4 h-4"
                  checked={published}
                  onChange={e=>setPublished(e.target.checked)}
                />
                <label htmlFor="pub" className="text-sm text-gray-700">מפורסם</label>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                onClick={save}
                disabled={busy}
              >
                {editingId ? 'עדכון' : 'שמור'}
              </button>
              <button
                className="bg-gray-200 px-4 py-2 rounded-lg"
                onClick={() => setModalOpen(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
