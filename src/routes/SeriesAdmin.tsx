import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HDate } from '@hebcal/core'

function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime())
}
function coerceDate(val: any): Date {
  const d = val ? new Date(val) : new Date()
  return isValidDate(d) ? d : new Date()
}
function toHebrewText(dIn: any): string {
  try {
    const d = coerceDate(dIn)
    const hd: any = new HDate(d)
    if (typeof hd.renderGematriya === 'function') return hd.renderGematriya()
    if (typeof hd.render === 'function') return hd.render('he')
    const day = (hd.getDate && hd.getDate()) || d.getDate()
    const monthName = (hd.getMonthName && hd.getMonthName('h')) || ''
    const year = (hd.getFullYear && hd.getFullYear()) || d.getFullYear()
    return `${day} ${monthName} ${year}`
  } catch {
    return ''
  }
}

type Series = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  created_at: string
  stories: Story[] // Add stories to the series type
}

type Story = {
  id: string
  title: string
  series_order: number | null
}

export function Component() {
  const [list, setList] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set())

  // Form state for creating/editing
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '' })

  async function loadSeries() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('series')
        .select('*, stories(id, title, series_order)')
        .order('title', { ascending: true })
      if (error) throw error
      setList(data || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת הסדרות')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSeries()
  }, [])

  const toggleSeries = (seriesId: string) => {
    setOpenSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId)
      } else {
        newSet.add(seriesId)
      }
      return newSet
    })
  }

  function startCreate() {
    setEditingId(null)
    setForm({ title: '', description: '' })
    setIsModalOpen(true)
  }

  function startEdit(series: Series) {
    setEditingId(series.id)
    setForm({ title: series.title, description: series.description || '' })
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setErr('שם הסדרה הוא שדה חובה')
      return
    }
    try {
      setErr(null)
      const payload = { title: form.title.trim(), description: form.description.trim() || null }
      const { error } = editingId
        ? await supabase.from('series').update(payload).eq('id', editingId)
        : await supabase.from('series').insert(payload)

      if (error) throw error
      setMsg('הסדרה נשמרה בהצלחה')
      setIsModalOpen(false)
      await loadSeries()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בשמירת הסדרה')
    }
  }

  async function remove(id: string) {
    if (!confirm('האם למחוק את הסדרה? פעולה זו לא ניתנת לשחזור.')) return
    try {
      setErr(null)
      const { error } = await supabase.from('series').delete().eq('id', id)
      if (error) throw error
      setMsg('הסדרה נמחקה בהצלחה')
      await loadSeries()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת הסדרה')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול סדרות</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={startCreate}>
          + סדרה חדשה
        </button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {loading && <div>טוען רשימת סדרות...</div>}

      {!loading && (
        <div className="space-y-2">
          {list.map(series => (
            <div key={series.id} className="rounded-xl border bg-white">
              <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleSeries(series.id)}>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{series.title}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {series.stories.length} פרקים
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Link to={`/admin/series/${series.id}`} onClick={e => e.stopPropagation()} className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50">
                    ערוך סדרה
                  </Link>
                  {openSeries.has(series.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              {openSeries.has(series.id) && (
                <div className="border-t px-3 pb-3">
                  {series.stories.length > 0 ? (
                    <ul className="divide-y">
                      {series.stories.sort((a, b) => (a.series_order || 999) - (b.series_order || 999)).map(story => (
                        <li key={story.id} className="py-2 text-sm">{story.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-3 text-sm text-gray-500">אין פרקים בסדרה זו.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת סדרה' : 'סדרה חדשה'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">שם הסדרה *</label>
                <input
                  className="w-full mt-1 border rounded-lg p-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">תיאור (אופציונלי)</label>
                <textarea
                  className="w-full mt-1 border rounded-lg p-2 min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setIsModalOpen(false)}>
                ביטול
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={handleSave}>
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}