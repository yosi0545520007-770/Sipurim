import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type FaqItem = {
  id: string
  question: string
  answer: string
  is_published: boolean
  sort_order: number
}

export function Component() {
  const [list, setList] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ question: '', answer: '', is_published: true, sort_order: 0 })

  async function loadFaq() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('faq')
        .select('id, question, answer, is_published, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setList(data || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת שאלות נפוצות')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFaq()
  }, [])

  function startCreate() {
    setEditingId(null)
    setForm({ question: '', answer: '', is_published: true, sort_order: list.length + 1 })
    setIsModalOpen(true)
  }

  function startEdit(item: FaqItem) {
    setEditingId(item.id)
    setForm({ question: item.question, answer: item.answer, is_published: item.is_published, sort_order: item.sort_order })
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      setErr('יש למלא שאלה ותשובה.')
      return
    }
    try {
      setErr(null)
      const payload = { ...form, question: form.question.trim(), answer: form.answer.trim() }
      const { error } = editingId
        ? await supabase.from('faq').update(payload).eq('id', editingId)
        : await supabase.from('faq').insert(payload)

      if (error) throw error
      setMsg('הפריט נשמר בהצלחה')
      setIsModalOpen(false)
      await loadFaq()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בשמירת הפריט')
    }
  }

  async function remove(id: string) {
    if (!confirm('האם למחוק שאלה זו?')) return
    try {
      setErr(null)
      await supabase.from('faq').delete().eq('id', id)
      setMsg('השאלה נמחקה בהצלחה')
      await loadFaq()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת השאלה')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול שאלות נפוצות</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={startCreate}>+ שאלה חדשה</button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {loading && <div>טוען...</div>}

      {!loading && (
        <div className="divide-y rounded-2xl border bg-white">
          {list.map(item => (
            <div key={item.id} className="p-3 flex items-center justify-between">
              <div className="font-medium">{item.question}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg border text-sm" onClick={() => startEdit(item)}>עריכה</button>
                <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-sm" onClick={() => remove(item.id)}>מחיקה</button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="p-4 text-gray-500">אין שאלות להצגה.</div>}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת שאלה' : 'שאלה חדשה'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">שאלה *</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">תשובה *</label>
                <textarea className="w-full mt-1 border rounded-lg p-2 min-h-[150px]" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                <label htmlFor="is_published" className="text-sm">מפורסם?</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setIsModalOpen(false)}>ביטול</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={handleSave}>שמירה</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}