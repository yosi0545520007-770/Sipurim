import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = {
  id: string
  name: string
  created_at: string
}

export function Component() {
  const [list, setList] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')

  async function loadCategories() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, created_at')
        .order('name', { ascending: true })
      if (error) throw error
      setList(data || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת הקטגוריות')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  function startCreate() {
    setEditingId(null)
    setFormName('')
    setIsModalOpen(true)
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setFormName(category.name)
    setIsModalOpen(true)
  }

  async function handleSave() {
    const name = formName.trim()
    if (!name) {
      setErr('שם הקטגוריה הוא שדה חובה')
      return
    }
    try {
      setErr(null)
      const payload = { name: name }
      const { error } = editingId ? await supabase.from('categories').update(payload).eq('id', editingId) : await supabase.from('categories').insert(payload)

      if (error) throw error
      setMsg('הקטגוריה נשמרה בהצלחה')
      setIsModalOpen(false)
      await loadCategories()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בשמירת הקטגוריה')
    }
  }

  async function remove(id: string) {
    if (!confirm('האם למחוק את הקטגוריה?')) return
    try {
      setErr(null)
      await supabase.from('categories').delete().eq('id', id)
      setMsg('הקטגוריה נמחקה בהצלחה')
      await loadCategories()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת הקטגוריה')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול קטגוריות</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={startCreate}>+ קטגוריה חדשה</button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {loading ? (
        <div>טוען רשימת קטגוריות...</div>
      ) : (
        <div className="max-w-md rounded-2xl border bg-white">
          {list.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
              <span className="font-medium">{cat.name}</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg border text-sm" onClick={() => startEdit(cat)}>עריכה</button>
                <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-sm" onClick={() => remove(cat.id)}>מחיקה</button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="p-3 text-gray-500">לא נמצאו קטגוריות.</div>}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</h2>
            <div>
              <label className="text-sm text-gray-600">שם הקטגוריה *</label>
              <input
                className="w-full mt-1 border rounded-lg p-2"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
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