import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { HDate } from '@hebcal/core'

/* ---------- Types ---------- */
type Story = {
  id: string
  title: string
  excerpt: string | null
  image_url: string | null
  audio_url: string | null
  publish_at: string | null
  updated_at: string | null
  play_date: string | null
  series_id: string | null
  series_order: number | null
  category_id: string | null
}
type Series = { id: string; name: string }
type Category = { id: string; name: string }
type Tag = { id: string; name: string }

/* ---------- Small UI bits ---------- */
function YesNo({ ok }: { ok: boolean }) {
  return <span className={ok ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{ok ? '✓' : '✗'}</span>
}

/* ---------- Helpers ---------- */
const BUCKET = 'media'

function isValidDate(d: any): d is Date { return d instanceof Date && !isNaN(d.getTime()) }
function coerceDate(val: any): Date { const d = val ? new Date(val) : new Date(); return isValidDate(d) ? d : new Date() }
function hasVal(v?: string | null) { return !!(v && String(v).trim()) }
function nowLabel() {
  const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0')
  return `שמירה ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
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
// remove niqqud/taamim; keep gershayim
function stripNiqqud(s: string) { return s.normalize('NFD').replace(/[\u0591-\u05C7]/g, '').normalize('NFC') }
// Year (5785) -> תשפ״ה
function hebrewYearLetters(n: number) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']
  const y = n % 1000
  const h = Math.floor(y / 100)
  let t = Math.floor((y % 100) / 10)
  let o = y % 10
  if (t === 1 && (o === 5 || o === 6)) { t = 0; o = o === 5 ? 15 : 16 } // ט״ו/ט״ז
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
    const day = (hd.getDate && hd.getDate()) || d.getDate()
    const monthName = (hd.getMonthName && hd.getMonthName('h')) || ''
    const year = (hd.getFullYear && hd.getFullYear()) || d.getFullYear()
    return `${day} ${monthName} ${year}`
  } catch { return '' }
}
function hebrewCellParts(dIn: any) {
  try {
    const d = coerceDate(dIn)
    const hd: any = new HDate(d)
    const dayG = (typeof hd.renderGematriya === 'function')
      ? String(hd.renderGematriya()).split(' ')[0]
      : String(hd.getDate && hd.getDate()) || ''
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
  if (!rawMonth || /[A-Za-z]/.test(rawMonth)) {
    const parts = typeof hd.render === 'function' ? String(hd.render('he')).split(' ') : []
    rawMonth = parts[1] || ''
  }
  const month = stripNiqqud(String(rawMonth))
  const yearNum = (hd.getFullYear && hd.getFullYear()) || 5785
  return { month, year: hebrewYearLetters(yearNum) }
}
function guessAudioMime(url: string): string {
  const u = (url || '').toLowerCase()
  if (u.includes('.m4a') || u.includes('.mp4')) return 'audio/mp4'
  if (u.includes('.mp3')) return 'audio/mpeg'
  if (u.includes('.wav')) return 'audio/wav'
  if (u.includes('.ogg') || u.includes('.oga')) return 'audio/ogg'
  return 'audio/mp4'
}

/* ---------- Component ---------- */
export default function StoriesAdmin() {
  // lists
  const [list, setList] = useState<Story[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])

  // ui
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // site logo default
  const [siteLogoUrl, setSiteLogoUrl] = useState<string>('')

  // form
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    image_url: '',
    audio_url: '',
    publish_at: new Date().toISOString(), // נשמר אוטומטית
    play_date: '',
    in_series: false,
    series_id: '' as string | '',
    series_order: '' as number | '',
    category_id: '' as string | '',
    tag_ids: [] as string[]
  })

  // inline create: Category
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // inline create: Series
  const [addingSeries, setAddingSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // Hebrew date picker
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDate, setPickerDate] = useState<Date | null>(new Date())
  const [pickerPreview, setPickerPreview] = useState<string>('')

  // filters (admin)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQ, setFilterQ] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeries, setFilterSeries] = useState('')

  /* ---------- Loaders ---------- */
  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('value').eq('key', 'site_logo_url').maybeSingle()
      setSiteLogoUrl(data?.value || '')
    } catch {}
  }
  async function loadSeries() {
    try {
      const { data } = await supabase.from('series').select('id,name').order('name')
      setSeriesList((data || []) as Series[])
    } catch {}
  }
  async function loadCategories() {
    try {
      const { data } = await supabase.from('categories').select('id,name').order('name')
      setCategories((data || []) as Category[])
    } catch {}
  }
  async function loadTags() {
    try {
      const { data } = await supabase.from('tags').select('id,name').order('name')
      setTags((data || []) as any)
    } catch {}
  }
  async function loadStories() {
    const { data, error } = await supabase
      .from('stories')
      .select('id,title,excerpt,image_url,audio_url,publish_at,updated_at,play_date,series_id,series_order,category_id')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    setList((data || []) as Story[])
  }
  async function loadAll() {
    try {
      setErr(null)
      await Promise.all([loadSettings(), loadSeries(), loadCategories(), loadTags(), loadStories()])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינה')
    }
  }
  useEffect(() => { loadAll() }, [])

  // Close any open dialogs on ESC (helps avoid accidental focus lock)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalOpen(false)
        setPickerOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const seriesMap = useMemo(() => Object.fromEntries(seriesList.map(s => [s.id, s.name])), [seriesList])
  const visibleList = useMemo(() => {
    let arr = list
    const q = filterQ.trim().toLowerCase()
    if (q) arr = arr.filter(s => s.title.toLowerCase().includes(q) || (s.excerpt || '').toLowerCase().includes(q))
    if (filterCategory) arr = arr.filter(s => s.category_id === filterCategory)
    if (filterSeries) arr = arr.filter(s => s.series_id === filterSeries)
    return arr
  }, [list, filterQ, filterCategory, filterSeries])

  /* ---------- Inline create handlers ---------- */
  async function addCategory() {
    const name = newCatName.trim()
    if (!name) { setErr('יש להזין שם קטגוריה'); return }
    try {
      setBusy(true); setErr(null)
      const { data, error } = await supabase.from('categories').insert({ name }).select('id,name').single()
      if (error) throw error
      setCategories(prev => [...(prev || []), data!].sort((a, b) => a.name.localeCompare(b.name, 'he')))
      setForm(f => ({ ...f, category_id: data!.id }))
      setNewCatName(''); setAddingCat(false)
      setMsg('קטגוריה נוספה ✓')
    } catch (e: any) {
      setErr(e.message || 'שגיאה ביצירת קטגוריה')
    } finally { setBusy(false) }
  }

  async function addSeries() {
    const name = newSeriesName.trim()
    if (!name) { setErr('יש להזין שם סדרה'); return }
    try {
      setBusy(true); setErr(null)
      const { data, error } = await supabase.from('series').insert({ name }).select('id,name').single()
      if (error) throw error
      setSeriesList(prev => [...(prev || []), data!].sort((a, b) => a.name.localeCompare(b.name, 'he')))
      setForm(f => ({ ...f, in_series: true, series_id: data!.id }))
      setNewSeriesName(''); setAddingSeries(false)
      setMsg('סדרה נוספה ✓')
    } catch (e: any) {
      setErr(e.message || 'שגיאה ביצירת סדרה')
    } finally { setBusy(false) }
  }

  async function addTag() {
    const name = newTagName.trim()
    if (!name) { setErr('יש להזין שם תגית'); return }
    try {
      setBusy(true); setErr(null)
      const { data, error } = await supabase.from('tags').insert({ name }).select('id,name').single()
      if (error) throw error
      setTags((prev: any[]) => [...(prev || []), data!].sort((a, b) => a.name.localeCompare(b.name, 'he')))
      setForm(f => ({ ...f, tag_ids: [...new Set([...(f.tag_ids||[]), data!.id])] }))
      setNewTagName(''); setAddingTag(false)
      setMsg('תגית נוספה ✓')
    } catch (e: any) {
      setErr(e.message || 'שגיאה ביצירת תגית')
    } finally { setBusy(false) }
  }

  /* ---------- Actions ---------- */
  function openPicker() {
    const baseDate = coerceDate(form.publish_at)
    setPickerDate(baseDate)
    setPickerPreview(toHebrewText(baseDate))
    setPickerOpen(true)
  }
  function confirmPicker() { setForm(f => ({ ...f, play_date: pickerPreview })); setPickerOpen(false) }

  function startCreate() {
    setCreating(true); setEditingId(null); setMsg(null); setErr(null)
    setForm({
      title:'',excerpt:'',image_url:'',audio_url:'',
      publish_at:new Date().toISOString(),play_date:'',
      in_series:false,series_id:'',series_order:'',category_id:'',
      tag_ids: []
    })
    setModalOpen(true)
  }
  async function startEdit(s: Story) {
    setCreating(true); setEditingId(s.id); setMsg(null); setErr(null)
    setForm({
      title: s.title || '', excerpt: s.excerpt || '', image_url: s.image_url || '', audio_url: s.audio_url || '',
      publish_at: s.publish_at || new Date().toISOString(), play_date: s.play_date || '',
      in_series: !!s.series_id, series_id: s.series_id || '', series_order: (s.series_order ?? '') as any,
      category_id: s.category_id || '',
      tag_ids: [] // will be loaded below
    })
    setModalOpen(true)
    try {
      const { data } = await supabase.from('story_tags').select('tag_id').eq('story_id', s.id)
      const ids = (data || []).map((r:any) => r.tag_id)
      setForm(f => ({ ...f, tag_ids: ids }))
    } catch {}
  }
  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    try { setBusy(true); setErr(null); const url = await uploadToBucket(f,'images'); setForm(v=>({...v,image_url:url})); setMsg('התמונה הועלתה ✓') }
    catch(ex:any){ setErr(ex?.message || 'שגיאת העלאת תמונה') }
    finally { setBusy(false); e.target.value='' }
  }
  async function onPickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    try { setBusy(true); setErr(null); const url = await uploadToBucket(f,'mp3'); setForm(v=>({...v,audio_url:url})); setMsg('קובץ האודיו הועלה ✓') }
    catch(ex:any){ setErr(ex?.message || 'שגיאת העלאת אודיו') }
    finally { setBusy(false); e.target.value='' }
  }
  async function save() {
    try {
      setBusy(true); setMsg(null); setErr(null)
      const finalImageUrl = (form.image_url && form.image_url.trim()) || siteLogoUrl || null
      const payload = {
        title: (form.title || '').trim(),
        excerpt: (form.excerpt || '').trim() || null,
        image_url: finalImageUrl,
        audio_url: (form.audio_url || '').trim() || null,
        publish_at: form.publish_at || null,
        play_date: (form.play_date || '').trim() || null,
        series_id: form.in_series && form.series_id ? form.series_id : null,
        series_order: form.in_series && String(form.series_order).trim() !== '' ? Number(form.series_order) : null,
        category_id: form.category_id ? form.category_id : null,
        ...(editingId ? { updated_at: new Date().toISOString() } : {}),
      }
      if (!payload.title) throw new Error('כותרת חובה')
      if (form.in_series && payload.series_order !== null && Number.isNaN(payload.series_order)) {
        throw new Error('מיקום בסדרה חייב להיות מספר')
      }

      let storyId = editingId as string | null
      if (editingId) {
        const { error } = await supabase.from('stories').update(payload).eq('id', editingId)
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await supabase.from('stories').insert(payload).select('id').single()
        if (error) throw new Error(error.message)
        storyId = (data as any)?.id || null
      }

      if (storyId) {
        await supabase.from('story_tags').delete().eq('story_id', storyId)
        const ids = Array.from(new Set(form.tag_ids || []))
        if (ids.length) {
          await supabase.from('story_tags').insert(ids.map(id => ({ story_id: storyId!, tag_id: id })))
        }
      }

      setMsg(editingId ? 'עודכן בהצלחה ✓' : 'נשמר בהצלחה ✓')
      setCreating(false); setEditingId(null); setModalOpen(false)
      await loadAll()
    } catch (e:any) {
      setErr(e.message || 'שגיאה בשמירה')
    } finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (!confirm('למחוק את הסיפור?')) return
    const { error } = await supabase.from('stories').delete().eq('id', id)
    if (error) setErr(error.message); else { setMsg('נמחק ✓'); await loadAll() }
  }

  /* ---------- Previews ---------- */
  const previewImageUrl = hasVal(form.image_url) ? form.image_url : (siteLogoUrl || '')
  const previewAudioUrl = hasVal(form.audio_url) ? form.audio_url : ''

  /* ---------- JSX ---------- */
  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול סיפורים</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl" onClick={startCreate}>+ סיפור חדש</button>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {/* Modal */}
      {creating && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'עריכת סיפור' : 'סיפור חדש'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-500">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* כותרת */}
              <div className="grid gap-1">
                <label className="text-sm text-gray-600">כותרת *</label>
                <input className="border rounded-lg p-3" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              {/* תאור קצר + מונה מילים */}
              <div className="grid gap-1">
                <label className="text-sm text-gray-600">תאור קצר של הסיפור. (יש לכתוב לפחות מספר משפטים)</label>
                <textarea
                  className="border rounded-lg p-3 min-h-[120px] resize-y"
                  value={form.excerpt}
                  onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="כתוב/י כאן תאור קצר של הסיפור..."
                />
                <div className={`text-xs mt-1 ${((form.excerpt || '').trim().split(/\s+/).filter(Boolean).length < 100) ? 'text-orange-600' : 'text-green-700'}`}>
                  {((form.excerpt || '').trim().split(/\s+/).filter(Boolean).length)} / 100 מילים
                </div>
              </div>

              {/* תמונת שער */}
              <div className="grid gap-1">
                <label className="text-sm text-gray-600">תמונת שער:</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border bg-gray-50 grid place-items-center">
                    {(hasVal(form.image_url) || siteLogoUrl) ? (
                      <img src={previewImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : <span className="text-[10px] text-gray-400 px-1 text-center">אין תמונה</span>}
                  </div>
                  <div className="flex-1">
                    <input
                      className="border rounded-lg p-3 w-full"
                      placeholder="https:// כתובת ישירה לתמונה"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                    />
                    <div className="text-xs text-gray-500 mt-1">או העלאה:</div>
                    <input type="file" accept="image/*" onChange={onPickImage} disabled={busy} />
                  </div>
                </div>
              </div>

              {/* קובץ שמע */}
              <div className="grid gap-1">
                <label className="text-sm text-gray-600">קובץ שמע (URL):</label>
                <input
                  className="border rounded-lg p-3"
                  placeholder="https:// כתובת ישירה לקובץ אודיו (mp3/m4a)"
                  value={form.audio_url}
                  onChange={e => setForm({ ...form, audio_url: e.target.value })}
                />
                {form.audio_url && (
                  <div className="pt-2">
                    <audio controls preload="none" className="w-full" controlsList="nodownload noplaybackrate" onContextMenu={(e)=>e.preventDefault()}>
                      <source src={previewAudioUrl} type={guessAudioMime(form.audio_url)} />
                      הדפדפן שלך לא תומך בנגן אודיו.
                    </audio>
                  </div>
                )}
                <div className="text-xs text-gray-500">או העלאה:</div>
                <input type="file" accept="audio/*" onChange={onPickAudio} disabled={busy} />
              </div>

              {/* השמעה בתאריך (עברי חופשי) */}
              <div className="grid gap-1 md:col-span-2">
                <label className="text-sm text-gray-600">השמעה בתאריך:</label>
                <div className="flex gap-2">
                  <input className="border rounded-lg p-3 flex-1" placeholder='י״ד אלול תשפ״ה' value={form.play_date} onChange={e => setForm({ ...form, play_date: e.target.value })} />
                  <button type="button" className="px-3 py-2 rounded-lg border" onClick={openPicker}>בחירה</button>
                </div>
              </div>

              {/* סיפור בהמשכים + יצירה מהירה */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">סיפור בהמשכים?</label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.in_series}
                    onChange={e => setForm(f => ({ ...f, in_series: e.target.checked, ...(e.target.checked ? {} : { series_id: '', series_order: '' }) }))} />
                  <span>כן</span>
                </label>

                {form.in_series && (
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-lg p-3 bg-white flex-1"
                        value={form.series_id}
                        onChange={e => setForm({ ...form, series_id: e.target.value })}
                      >
                        <option value="">— בחר/י —</option>
                        {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border whitespace-nowrap"
                        onClick={() => setAddingSeries(v => !v)}
                      >
                        {addingSeries ? 'ביטול' : 'סדרה חדשה +'}
                      </button>
                    </div>

                    {addingSeries && (
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded-lg p-3 flex-1"
                          placeholder="שם סדרה חדש"
                          value={newSeriesName}
                          onChange={e => setNewSeriesName(e.target.value)}
                        />
                        <button
                          type="button"
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                          onClick={addSeries}
                          disabled={busy}
                        >
                          הוסף
                        </button>
                      </div>
                    )}

                    <div>
                      <div className="text-sm text-gray-600 mb-1">מיקום בסדרה (מספר)</div>
                      <input
                        className="border rounded-lg p-3 w-full"
                        type="number" min={1} placeholder="1"
                        value={form.series_order}
                        onChange={e => setForm({ ...form, series_order: e.target.value === '' ? '' as any : Number(e.target.value) as any })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* קטגוריה + יצירה מהירה */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">קטגוריה</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded-lg p-3 bg-white flex-1"
                      value={form.category_id || ''}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value || '' })}
                    >
                      <option value="">— ללא —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border whitespace-nowrap"
                      onClick={() => setAddingCat(v => !v)}
                    >
                      {addingCat ? 'ביטול' : 'קטגוריה חדשה +'}
                    </button>
                  </div>

                  {addingCat && (
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded-lg p-3 flex-1"
                        placeholder="שם קטגוריה חדש (למשל: ילדים, פרשת שבוע...)"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                        onClick={addCategory}
                        disabled={busy}
                      >
                        הוסף
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* תגיות (רבות) + יצירה מהירה */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">תגיות</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded-lg p-3 bg-white flex-1"
                      value=""
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        setForm(f => ({ ...f, tag_ids: [...new Set([...(f.tag_ids||[]), id])] }))
                      }}
                    >
                      <option value="">— הוסף תגית —</option>
                      {tags.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border whitespace-nowrap"
                      onClick={() => setAddingTag(v => !v)}
                    >
                      {addingTag ? 'ביטול' : 'תגית חדשה +'}
                    </button>
                  </div>

                  {addingTag && (
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded-lg p-3 flex-1"
                        placeholder="שם תגית חדשה (למשל: ילדים, פרשה, סיפורי צדיקים)"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                        onClick={addTag}
                        disabled={busy}
                      >
                        הוסף
                      </button>
                    </div>
                  )}

                  {/* chips */}
                  <div className="flex flex-wrap gap-2">
                    {(form.tag_ids || []).map(id => {
                      const name = tags.find(t => t.id === id)?.name || id
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-sm border rounded-full px-3 py-1 bg-gray-50">
                          {name}
                          <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => setForm(f => ({ ...f, tag_ids: (f.tag_ids||[]).filter(x => x !== id) }))}>×</button>
                        </span>
                      )
                    })}
                    {(form.tag_ids || []).length === 0 && (
                      <span className="text-sm text-gray-500">אין תגיות</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50" disabled={busy} onClick={save}>
                {editingId ? 'עדכון' : 'שמור'}
              </button>
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => { setCreating(false); setEditingId(null); setModalOpen(false) }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hebrew Date Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50" onClick={()=>setPickerOpen(false)}>
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
                  const start = new Date(year, month, 1)
                  const end   = new Date(year, month + 1, 0)
                  const gregLabel = g.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                  const startHe = hebMonthYearFromDate(start)
                  const endHe   = hebMonthYearFromDate(end)
                  const hebLabel = (startHe.month === endHe.month && startHe.year === endHe.year)
                    ? `${startHe.month} ${startHe.year}`
                    : `${startHe.month} ${startHe.year} – ${endHe.month} ${endHe.year}`

                  const months = Array.from({ length: 12 }, (_, i) => ({ idx: i, label: new Date(2020, i, 1).toLocaleDateString('he-IL', { month: 'long' }) }))
                  const years: number[] = []; for (let y = year - 120; y <= year + 20; y++) years.push(y)

                  return (
                    <div className="px-2 py-1" dir="rtl">
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={decreaseMonth} className="px-2 text-lg">‹</button>
                        <div className="font-semibold">{gregLabel}</div>
                        <button type="button" onClick={increaseMonth} className="px-2 text-lg">›</button>
                      </div>
                      <div className="text-sm text-gray-600 text-center mt-1">{hebLabel}</div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <select className="border rounded px-2 py-1 bg-white" value={month} onChange={(e)=> changeMonth(Number(e.target.value))}>
                          {months.map(m => <option key={m.idx} value={m.idx}>{m.label}</option>)}
                        </select>
                        <select className="border rounded px-2 py-1 bg-white" value={year} onChange={(e)=> changeYear(Number(e.target.value))}>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  )
                }}
                renderDayContents={(dayOfMonth, date) => {
                  const { dayG, monthHe } = hebrewCellParts(date as Date)
                  return (
                    <div className="flex flex-col items-center leading-tight py-0.5">
                      <span className="text-[13px]">{dayOfMonth}</span>
                      <span className="text-[11px] opacity-80">{dayG}</span>
                      <span className="text-[10px] opacity-60">{monthHe}</span>
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

      {/* Mobile Filters trigger */}
      <div className="md:hidden flex items-center justify-between p-4">
        <div className="font-medium">סיפורים</div>
        <button className="px-3 py-2 rounded-lg border" onClick={()=>setFilterOpen(true)}>סינון</button>
      </div>

      {/* Mobile filter sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50" onClick={()=>setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">מסננים</div>
              <button className="text-gray-600" onClick={()=>setFilterOpen(false)}>✕</button>
            </div>
            <div className="grid gap-3">
              <input className="border rounded-lg p-2" placeholder="חיפוש לפי כותרת/תקציר" value={filterQ} onChange={e=>setFilterQ(e.target.value)} />
              <select className="border rounded-lg p-2 bg-white" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                <option value="">כל הקטגוריות</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="border rounded-lg p-2 bg-white" value={filterSeries} onChange={e=>setFilterSeries(e.target.value)}>
                <option value="">כל הסדרות</option>
                {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-2 rounded-lg border" onClick={()=>{setFilterQ('');setFilterCategory('');setFilterSeries('')}}>איפוס</button>
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={()=>setFilterOpen(false)}>סגור</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="space-y-3">
          {visibleList.map((s) => (
            <article key={s.id} className="rounded-xl border bg-white p-3">
              <div className="flex items-start gap-3">
                {s.image_url ? (
                  <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border">
                    <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="flex-1">
                  <div className="font-medium">{s.title}</div>
                  {s.excerpt && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-3">{s.excerpt}</div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                    <div>תמונה: <YesNo ok={!!s.image_url} /></div>
                    <div>קול: <YesNo ok={!!s.audio_url} /></div>
                    <div>סדרה: {s.series_id ? (seriesMap[s.series_id] || '—') : '—'}</div>
                    <div>קטגוריה: {s.category_id ? (categories.find(c => c.id === s.category_id)?.name || '—') : '—'}</div>
                    <div>מיקום: {s.series_order ?? '—'}</div>
                    <div>השמעה: {s.play_date || '—'}</div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 mt-3">
                {s.updated_at ? new Date(s.updated_at).toLocaleString('he-IL') : ''}
              </div>
              <div className="border-t p-2 flex flex-wrap gap-2 justify-end bg-white">
                <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(s)}>עריכה</button>
                <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(s.id)}>מחיקה</button>
              </div>
            </article>
          ))}
          {visibleList.length === 0 && (
            <div className="p-3 text-gray-500">אין נתונים עדיין.</div>
          )}
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-2xl border overflow-x-auto bg-white">
        <div className="p-4 flex items-center gap-2 flex-wrap">
          <div className="font-medium">סיפורים</div>
          <input className="border rounded-lg p-2 text-sm" placeholder="חיפוש..." value={filterQ} onChange={e=>setFilterQ(e.target.value)} />
          <select className="border rounded-lg p-2 bg-white text-sm" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            <option value="">כל הקטגוריות</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded-lg p-2 bg-white text-sm" value={filterSeries} onChange={e=>setFilterSeries(e.target.value)}>
            <option value="">כל הסדרות</option>
            {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {(filterQ || filterCategory || filterSeries) && (
            <button className="px-3 py-2 rounded-lg border text-sm" onClick={()=>{setFilterQ('');setFilterCategory('');setFilterSeries('')}}>נקה</button>
          )}
          <div className="ml-auto text-sm text-gray-600">מוצגים {visibleList.length} מתוך {list.length}</div>
        </div>
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">כותרת</th>
              <th className="p-3 text-right hidden sm:table-cell">תמונה</th>
              <th className="p-3 text-right hidden sm:table-cell">קול</th>
              <th className="p-3 text-right hidden md:table-cell">סדרה</th>
              <th className="p-3 text-right hidden md:table-cell">קטגוריה</th>
              <th className="p-3 text-right hidden md:table-cell">מקום</th>
              <th className="p-3 text-right">השמעה בתאריך</th>
              <th className="p-3 text-right hidden lg:table-cell">פורסם</th>
              <th className="p-3 text-right hidden lg:table-cell">עודכן</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {visibleList.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3 align-top">
                  <div className="font-medium">{s.title}</div>
                  {s.excerpt && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{s.excerpt}</div>}
                </td>
                <td className="p-3 hidden sm:table-cell"><YesNo ok={!!s.image_url} /></td>
                <td className="p-3 hidden sm:table-cell"><YesNo ok={!!s.audio_url} /></td>
                <td className="p-3 hidden md:table-cell">{s.series_id ? (seriesMap[s.series_id] || '—') : '—'}</td>
                <td className="p-3 hidden md:table-cell">{s.category_id ? (categories.find(c => c.id === s.category_id)?.name || '—') : '—'}</td>
                <td className="p-3 hidden md:table-cell">{s.series_order ?? '—'}</td>
                <td className="p-3">{s.play_date || '—'}</td>
                <td className="p-3 hidden lg:table-cell">{s.publish_at ? new Date(s.publish_at).toLocaleString('he-IL') : '—'}</td>
                <td className="p-3 hidden lg:table-cell">{s.updated_at ? new Date(s.updated_at).toLocaleString('he-IL') : '—'}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(s)}>עריכה</button>
                    <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(s.id)}>מחיקה</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={10}>אין נתונים עדיין.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
