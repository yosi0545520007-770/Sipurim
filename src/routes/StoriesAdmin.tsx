import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { HDate } from '@hebcal/core'
import { Loader2 } from 'lucide-react'
/* --- Types --- */
type Story = {
  id: string
  title: string
  excerpt: string | null
  image_url: string | null
  audio_url: string | null
  publish_at: string | null
  play_date: string | null
  updated_at: string | null
  series_id: string | null
  series_order: number | null
  category_id: string | null
}
type Series = { id: string; title: string }
type Category = { id: string; name: string }

/* --- Helpers & UI --- */
function YesNo({ ok }: { ok: boolean }) {
  return <span className={ok ? 'text-green-600' : 'text-red-500'}>{ok ? '✓' : '✗'}</span>
}

function isValidDate(d: any): d is Date { return d instanceof Date && !isNaN(d.getTime()) }
function coerceDate(val: any): Date { const d = val ? new Date(val) : new Date(); return isValidDate(d) ? d : new Date() }
function stripNiqqud(s: string) { return s.normalize('NFD').replace(/[\u0591-\u05C7]/g, '').normalize('NFC') }
function hebrewYearLetters(n: number) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תתק']
  const y = n % 1000
  const h = Math.floor(y / 100)
  let t = Math.floor((y % 100) / 10)
  let o = y % 10
  if (t === 1 && (o === 5 || o === 6)) { t = 0; o = o === 5 ? 15 : 16 }
  const onesFixed = o === 15 ? 'טו' : o === 16 ? 'טז' : ones[o]
  const base = (hundreds[h] || '') + (tens[t] || '') + onesFixed
  return base.length >= 2 ? base.slice(0, -1) + '״' + base.slice(-1) : base + '׳'
}
function toHebrewText(dIn: any): string {
  try {
    const d = coerceDate(dIn)
    const hd: any = new HDate(d)
    if (typeof hd.renderGematriya === 'function') return hd.renderGematriya()
    if (typeof hd.render === 'function') return hd.render('he')
    return ''
  } catch { return '' }
}
function hebrewCellParts(dIn: any) {
  try {
    const d = coerceDate(dIn)
    const hd: any = new HDate(d)
    const dayG = (typeof hd.renderGematriya === 'function') ? String(hd.renderGematriya()).split(' ')[0] : String(hd.getDate && hd.getDate()) || ''
    let rawMonth = (hd.getMonthName && hd.getMonthName('he')) || ''
    if (!rawMonth || /[A-Za-z]/.test(rawMonth)) {
      const parts = typeof hd.render === 'function' ? String(hd.render('he')).split(' ') : []
      rawMonth = parts[1] || ''
    }
    const monthHe = stripNiqqud(String(rawMonth))
    return { dayG, monthHe }
  } catch { return { dayG: '', monthHe: '' } }
}
function hebMonthYearFromDate(d: Date) {
  const hd: any = new HDate(d)
  let rawMonth = (hd.getMonthName && (hd as any).getMonthName('he')) || ''
  const month = stripNiqqud(String(rawMonth))
  const yearNum = (hd.getFullYear && hd.getFullYear()) || 5785
  return { month, year: hebrewYearLetters(yearNum) }
}

const BUCKET = 'media'
async function uploadToBucket(file: File, folder: string) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const targetFolder = (ext === 'mp3' || ext === 'm4a') ? 'mp3' : folder
  const path = `${targetFolder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || (
      ['jpg','jpeg','png','gif','webp','avif'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` :
      (ext === 'mp3' ? 'audio/mpeg' :
       ext === 'm4a' ? 'audio/mp4' :
       undefined)
    )
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function guessAudioMime(url: string): string {
  const u = (url || '').toLowerCase()
  if (u.includes('.m4a') || u.includes('.mp4')) return 'audio/mp4'
  if (u.includes('.mp3')) return 'audio/mpeg'
  return 'audio/mp4'
}

/* --- Component --- */
export function Component() {
  const [list, setList] = useState<Story[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    image_url: '',
    audio_url: '',
    play_date: '',
    category_id: '',
  })

  async function loadDependencies() {
    try {
      // Note: In a larger app, you might want to fetch these into a shared context/store
      // to avoid re-fetching on every component that needs them.
      const [{ data: seriesData }, { data: catData }] = await Promise.all([
        supabase.from('series').select('id, title').order('title'),
        supabase.from('categories').select('id, name').order('name'),
      ])
      setSeriesList(seriesData || [])
      setCategories(catData || [])
    } catch (e: any) {
      setErr('שגיאה בטעינת סדרות וקטגוריות')
    }
  }

  async function loadStories() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('stories')
        .select('id,title,excerpt,image_url,audio_url,publish_at,play_date,updated_at,series_id,series_order,category_id')
        .is('series_id', null) // <-- סינון להצגת סיפורים בודדים בלבד
        .order('updated_at', { ascending: false })
      if (error) throw error
      setList(data || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת הסיפורים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDependencies()
    loadStories()
  }, [])

  function startCreate() {
    setEditingId(null)
    setForm({ title: '', excerpt: '', image_url: '', audio_url: '', play_date: '', category_id: '' })
    setIsModalOpen(true)
  }

  function startEdit(story: Story) {
    setEditingId(story.id)
    setForm({
      title: story.title || '',
      excerpt: story.excerpt || '',
      image_url: story.image_url || '',
      audio_url: story.audio_url || '',
      play_date: story.play_date || '',
      category_id: story.category_id || '',
    })
    setIsModalOpen(true)
  }

  // --- Hebrew Date Picker State & Handlers ---
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDate, setPickerDate] = useState<Date | null>(new Date())
  const [pickerPreview, setPickerPreview] = useState<string>('')

  // State for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function openPicker() {
    // Try to parse the existing Hebrew date string to a Gregorian date for the picker
    // This is a simple heuristic and might not be perfect for all formats.
    // For now, we'll just use the current date as a starting point.
    const baseDate = new Date()
    setPickerDate(baseDate)
    setPickerPreview(toHebrewText(baseDate))
    setPickerOpen(true)
  }

  function confirmPicker() {
    setForm(f => ({ ...f, play_date: pickerPreview }))
    setPickerOpen(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      const url = await uploadToBucket(file, 'images')
      setForm({ ...form, image_url: url })
      setMsg('התמונה הועלתה. יש ללחוץ על "שמירה" כדי לעדכן.')
    } catch (ex: any) {
      setErr(ex.message || 'שגיאת העלאת תמונה')
    } finally {
      setIsBusy(false)
      e.target.value = '' // Reset file input
    }
  }

  async function handleSave() {
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      if (!form.title.trim()) {
        throw new Error('כותרת היא שדה חובה.')
      }

      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        image_url: form.image_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        play_date: form.play_date,
        category_id: form.category_id ? form.category_id : null,
      }

      if (editingId) {
        // Update existing story
        const { error } = await supabase.from('stories').update(payload).eq('id', editingId)
        if (error) throw error
        setMsg('הסיפור עודכן בהצלחה!')
      } else {
        // Create new story
        const { error } = await supabase.from('stories').insert(payload)
        if (error) throw error
        setMsg('הסיפור נוצר בהצלחה!')
      }

      setIsModalOpen(false)
      await loadStories()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בשמירת הסיפור')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(list.map(s => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const isAllSelected = list.length > 0 && selectedIds.size === list.length

  async function remove(id: string) {
    if (!confirm('האם למחוק את הסיפור?')) return
    try {
      setErr(null)
      const { error } = await supabase.from('stories').delete().eq('id', id)
      if (error) throw error
      setMsg('הסיפור נמחק בהצלחה')
      await loadStories()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת הסיפור')
    }
  }

  async function bulkRemove() {
    if (selectedIds.size === 0) return
    if (!confirm(`האם למחוק ${selectedIds.size} סיפורים נבחרים?`)) return
    try {
      setErr(null)
      const { error } = await supabase.from('stories').delete().in('id', Array.from(selectedIds))
      if (error) throw error
      setMsg(`${selectedIds.size} סיפורים נמחקו בהצלחה`)
      setSelectedIds(new Set())
      await loadStories()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקה גורפת')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול סיפורים</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={startCreate}>
          + סיפור חדש
        </button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {loading && <div>טוען רשימת סיפורים...</div>}

      {!loading && (
        <div className="rounded-2xl border overflow-x-auto bg-white">
          {selectedIds.size > 0 && (
            <div className="p-2 bg-blue-50 border-b flex items-center gap-4">
              <span className="text-sm text-blue-800">{selectedIds.size} פריטים נבחרו</span>
              <button onClick={bulkRemove} className="px-3 py-1 rounded-lg border border-red-300 bg-red-50 text-red-600 text-sm">
                מחק נבחרים
              </button>
            </div>
          )}
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded" />
                </th>
                <th className="p-3 text-right">כותרת</th>
                <th className="p-3 text-center">תמונה</th>
                <th className="p-3 text-center">שמע</th>
                <th className="p-3 text-right">תאריך השמעה</th>
                <th className="p-3 text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => handleSelect(s.id)} className="rounded" />
                  </td>
                  <td className="p-3 align-top">
                    <div className="font-medium">{s.title}</div>
                    {s.excerpt && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{s.excerpt}</div>}
                  </td>
                  <td className="p-3 text-center"><YesNo ok={!!s.image_url} /></td>
                  <td className="p-3 text-center"><YesNo ok={!!s.audio_url} /></td>
                  <td className="p-3">{s.play_date || '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(s)}>
                        עריכה
                      </button>
                      <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(s.id)}>
                        מחיקה
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>לא נמצאו סיפורים.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת סיפור' : 'סיפור חדש'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">כותרת *</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">תקציר</label>
                <textarea className="w-full mt-1 border rounded-lg p-2 min-h-[100px]" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">כתובת תמונה</label>
                <div className="flex items-center gap-4 mt-1">
                  {form.image_url && <img src={form.image_url} alt="תצוגה מקדימה" className="w-16 h-16 rounded-lg object-cover border" />}
                  <div className="flex-1">
                    <input
                      className="w-full border rounded-lg p-2"
                      placeholder="הדבק URL או העלה קובץ"
                      value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                    <div className="text-xs text-gray-500 mt-1">או העלאה:</div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isBusy} className="text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">כתובת קובץ שמע</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
                {form.audio_url && <audio controls src={form.audio_url} className="w-full mt-2" />}
              </div>
              <div>
                <label className="text-sm text-gray-600">תאריך השמעה (עברי)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input className="w-full mt-1 border rounded-lg p-2" placeholder="לדוגמא: י״ד אלול תשפ״ה" value={form.play_date || ''} onChange={(e) => setForm({ ...form, play_date: e.target.value })} />
                  <button type="button" className="px-3 py-2 rounded-lg border" onClick={openPicker}>בחירה</button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">קטגוריה</label>
                <select className="w-full mt-1 border rounded-lg p-2 bg-white" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— ללא —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setIsModalOpen(false)} disabled={isBusy}>
                ביטול
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50" onClick={handleSave} disabled={isBusy}>
                {isBusy ? <Loader2 className="animate-spin" /> : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hebrew Date Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-[60]" onClick={()=>setPickerOpen(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-md" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">בחר תאריך השמעה</h3>
              <button onClick={()=>setPickerOpen(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-3">
              <ReactDatePicker
                selected={pickerDate}
                onChange={(d: Date | null) => { setPickerDate(d); setPickerPreview(toHebrewText(d || new Date())) }}
                inline
                calendarStartDay={0}
                isClearable={false}
                showPopperArrow={false}
                renderCustomHeader={({ date, decreaseMonth, increaseMonth, changeYear, changeMonth }) => {
                  const g = date as Date
                  const year = g.getFullYear()
                  const month = g.getMonth()
                  const gregLabel = g.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                  const hebrewLabel = hebMonthYearFromDate(g)

                  const months = Array.from({ length: 12 }, (_, i) => ({ idx: i, label: new Date(2020, i, 1).toLocaleDateString('he-IL', { month: 'long' }) }))
                  const years: number[] = []; for (let y = year - 120; y <= year + 20; y++) years.push(y)

                  return (
                    <div className="px-2 py-1" dir="rtl">
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={decreaseMonth} className="px-2 text-lg">‹</button>
                        <div className="font-semibold">{gregLabel}</div>
                        <button type="button" onClick={increaseMonth} className="px-2 text-lg">›</button>
                      </div>
                      <div className="text-sm text-gray-600 text-center mt-1">{hebrewLabel.month} {hebrewLabel.year}</div>
                    </div>
                  )
                }}
                renderDayContents={(dayOfMonth, date) => {
                  const { dayG, monthHe } = hebrewCellParts(date as Date)
                  return (
                    <div className="flex flex-col items-center leading-tight py-0.5">
                      <span className="text-[13px]">{dayOfMonth}</span>
                      <span className="text-[11px] opacity-80">{dayG}</span>
                    </div>
                  )
                }}
              />
              <div className="rounded-lg border p-3 bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">תאריך נבחר (עברי):</div>
                <div className="font-medium">{pickerPreview || '—'}</div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 rounded-lg border" onClick={()=>setPickerOpen(false)}>ביטול</button>
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={confirmPicker}>בחר</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
