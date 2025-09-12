import { useEffect, useMemo, useState } from 'react'
// import { supabase } from '@/lib/supabase'
import { listMemorials, createMemorial, updateMemorial, deleteMemorial, type Memorial } from '@/lib/memorials'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { HDate } from '@hebcal/core'
import '@/candle.css'
import { useEditMode } from '@/components/EditMode'

// type is imported from lib/memorials

function isValidDate(d: any): d is Date { return d instanceof Date && !isNaN(d.getTime()) }
function coerceDate(val: any): Date { const d = val ? new Date(val) : new Date(); return isValidDate(d) ? d : new Date() }
function stripNiqqud(s: string) { return s.normalize('NFD').replace(/[\u0591-\u05C7]/g, '').normalize('NFC') }
function hebrewYearLetters(n: number) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']
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

function Candle() {
  return (
    <div className="w-12 h-12" title="נר זיכרון">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Flame */}
        <g className="flame-flicker">
          <path d="M50 30 C 55 40, 55 50, 50 60 C 45 50, 45 40, 50 30 Z" fill="url(#flameGradient)" />
        </g>
        {/* Candle Body */}
        <rect x="40" y="60" width="20" height="35" rx="3" fill="#F7F3E3" stroke="#E0DBCB" strokeWidth="1" />
        <defs><radialGradient id="flameGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" style={{stopColor: '#FEEB9C', stopOpacity: 1}} /><stop offset="100%" style={{stopColor: '#F2994A', stopOpacity: 1}} /></radialGradient></defs>
      </svg>
    </div>
  )
}

export default function Ilui() {
  const { editMode, toggle } = useEditMode()
  const [mem, setMem] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // CRUD form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState<Date | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPreview, setPickerPreview] = useState('')
  const pickerLabel = useMemo(() => formDate ? toHebrewText(formDate) : '—', [formDate])

  async function loadMemorialsList() {
    setErr(null)
    const { data, error } = await listMemorials()
    if (error) { setErr(error); setMem([]); setLoading(false); return }
    setMem(data)
    setLoading(false)
  }

  useEffect(()=>{ loadMemorialsList() },[])

  function resetForm() {
    setEditingId(null); setFormName(''); setFormDate(null)
  }

  function openPicker() {
    const d = formDate || new Date()
    setPickerPreview(toHebrewText(d))
    setPickerOpen(true)
  }
  function confirmPicker() { setPickerOpen(false) }

  async function onSave() {
    const name = formName.trim()
    if (!name) { setErr('יש להזין שם נפטר/ת'); return }
    if (!formDate) { setErr('יש לבחור תאריך פטירה'); return }
    setErr(null)
    const event_date = new Date(formDate).toISOString().slice(0,10)
    if (editingId) {
      const { error } = await updateMemorial(editingId, { honoree: name, event_date })
      if (error) { setErr(error); return }
    } else {
      const { error } = await createMemorial({ honoree: name, event_date })
      if (error) { setErr(error); return }
    }
    await loadMemorialsList()
    resetForm()
  }

  function startEdit(m: Memorial) {
    setEditingId(m.id)
    setFormName(m.honoree || '')
    setFormDate(m.event_date ? new Date(m.event_date) : null)
  }

  async function onDelete(id: string) {
    if (!confirm('למחוק רשומה זו?')) return
    const { error } = await deleteMemorial(id)
    if (error) { setErr(error); return }
    await loadMemorialsList()
    if (editingId === id) resetForm()
  }

  return (
    <section className="container mx-auto px-4 py-10" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">לעילוי נשמת</h1>
      </div>

      {/* List */}
      {loading && <div className="text-gray-500">טוען…</div>}
      {err && <div className="text-red-600 mb-3">{err}</div>}
      {!loading && (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {mem.map(m=> (
        <li key={m.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-3 shadow-sm">
          <Candle />
              <div className="flex-1">
                <div className="font-semibold text-lg">{m.honoree}</div>
                <div className="text-sm text-gray-500">
                  {m.event_date ? `נפטר/ה בתאריך: ${toHebrewText(m.event_date)}` : ''}
                </div>
              </div>
            </li>
          ))}
          {!mem.length && <div className="text-gray-500">אין רשומות עדיין.</div>}
        </ul>
      )}

      {/* CRUD editor (simple) */}
      {editMode && (
      <div className="rounded-2xl border bg-white p-4 max-w-2xl">
        <h2 className="text-xl font-semibold mb-3">ניהול שמות</h2>
        <div className="grid gap-4">
          <div>
            <label className="text-sm text-gray-600">שם הנפטר/ת</label>
            <input
              className="w-full mt-1 rounded-lg border p-2"
              placeholder="הכנס/י שם"
              value={formName}
              onChange={e=>setFormName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">תאריך פטירה (עברי)</label>
            <div className="flex items-center gap-2 mt-1">
              <button type="button" className="px-3 py-2 rounded-lg border" onClick={openPicker}>בחר/י תאריך</button>
              <div className="text-sm text-gray-700">{pickerLabel}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={onSave}>
              {editingId ? 'עדכון' : 'הוספה'}
            </button>
            {editingId && (
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={resetForm}>ביטול</button>
            )}
          </div>
        </div>

        {/* Existing rows for quick edit/delete */}
        <div className="mt-6">
          <h3 className="font-medium mb-2">רשומות קיימות</h3>
          <div className="divide-y">
            {mem.map(m => (
              <div key={m.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.honoree}</div>
                  <div className="text-xs text-gray-500">{m.event_date ? new Date(m.event_date).toLocaleDateString('he-IL') : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded border" onClick={()=>startEdit(m)}>עריכה</button>
                  <button className="px-3 py-1 rounded border text-red-600" onClick={()=>onDelete(m.id)}>מחיקה</button>
                </div>
              </div>
            ))}
            {!mem.length && <div className="py-3 text-sm text-gray-500">אין רשומות</div>}
          </div>
        </div>
      </div>
      )}

      {/* Hebrew Date Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50" onClick={()=>setPickerOpen(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-md" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">בחר/י תאריך פטירה</h3>
              <button onClick={()=>setPickerOpen(false)} className="text-gray-500">סגור</button>
            </div>
            <div className="space-y-3">
              <ReactDatePicker
                selected={formDate}
                onChange={(d: Date | null) => { setFormDate(d); setPickerPreview(toHebrewText(d || new Date())) }}
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
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => changeYear(year - 1)} className="px-2 text-lg">«</button>
                          <button type="button" onClick={decreaseMonth} className="px-2 text-lg">‹</button>
                        </div>
                        <div className="font-semibold">{gregLabel}</div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={increaseMonth} className="px-2 text-lg">›</button>
                          <button type="button" onClick={() => changeYear(year + 1)} className="px-2 text-lg">»</button>
                        </div>
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
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={confirmPicker}>אישור</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
