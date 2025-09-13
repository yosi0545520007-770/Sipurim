import { useEffect, useState } from 'react'
import { listMemorials, createMemorial, updateMemorial, deleteMemorial, type Memorial } from '@/lib/memorials'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { HDate } from '@hebcal/core'

function toHebrewText(dIn: string | Date | null | undefined): string {
  try {
    if (!dIn) return ''
    const d = typeof dIn === 'string' ? new Date(dIn) : dIn
    if (isNaN(d.getTime())) return ''
    return new HDate(d).renderGematriya()
  } catch {
    return ''
  }
}

export function Component() {
  const [list, setList] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formHonoree, setFormHonoree] = useState('')
  const [formDate, setFormDate] = useState<Date | null>(null)

  async function loadMemorials() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await listMemorials()
      if (error) throw new Error(error)
      setList(data || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMemorials()
  }, [])

  function startCreate() {
    setEditingId(null)
    setFormHonoree('')
    setFormDate(null)
    setIsModalOpen(true)
  }

  function startEdit(item: Memorial) {
    setEditingId(item.id)
    setFormHonoree(item.honoree)
    setFormDate(item.event_date ? new Date(item.event_date) : null)
    setIsModalOpen(true)
  }

  async function handleSave() {
    const honoree = formHonoree.trim()
    if (!honoree) {
      setErr('יש למלא שם נזכר/ת')
      return
    }
    try {
      setErr(null)
      const payload = {
        honoree,
        event_date: formDate ? formDate.toISOString().slice(0, 10) : null,
      }
      const { error } = editingId
        ? await updateMemorial(editingId, payload)
        : await createMemorial(payload)

      if (error) throw new Error(error)
      setMsg(`נשמר בהצלחה: ${honoree}`)
      setIsModalOpen(false)
      await loadMemorials()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בשמירה')
    }
  }

  async function remove(id: string) {
    if (!confirm('למחוק את הרשומה?')) return
    try {
      setErr(null)
      const { error } = await deleteMemorial(id)
      if (error) throw new Error(error)
      setMsg('נמחק בהצלחה')
      await loadMemorials()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקה')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לעילוי נשמת (ניהול)</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={startCreate}>הוספת רשומה</button>
      </div>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded">{msg}</div>}

      {loading ? (
        <div className="text-gray-500">טוען…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-2xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">שם</th>
                <th className="p-3 text-right">תאריך פטירה (עברי)</th>
                <th className="p-3 text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.honoree}</td>
                  <td className="p-3">{item.event_date ? toHebrewText(item.event_date) : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(item)}>עריכה</button>
                      <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(item.id)}>מחיקה</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={3}>אין נתונים להצגה.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת רשומה' : 'רשומה חדשה'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">שם נזכר/ת *</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formHonoree} onChange={(e) => setFormHonoree(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">תאריך פטירה</label>
                <ReactDatePicker
                  selected={formDate}
                  onChange={(d: Date | null) => setFormDate(d)}
                  placeholderText="בחירת תאריך..."
                  className="w-full mt-1 border rounded-lg p-2 text-right"
                  calendarStartDay={0}
                  isClearable
                />
                {formDate && (
                  <div className="mt-1 text-sm text-gray-600">עברי: {toHebrewText(formDate)}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setIsModalOpen(false)}>ביטול</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={handleSave}>שמור</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

