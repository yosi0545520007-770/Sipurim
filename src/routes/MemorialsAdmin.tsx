import { useEffect, useMemo, useRef, useState } from 'react'
import { listMemorials, createMemorial, updateMemorial, deleteMemorial, type Memorial } from '@/lib/memorials'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css' // Keep for base styling
import { HDate } from '@hebcal/core'
import { supabase } from '@/lib/supabase'

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

function stripNiqqud(s: string) {
  try { return (s || '').normalize('NFD').replace(/[\u0591-\u05C7]/g, '').normalize('NFC') } catch { return s || '' }
}
function normalizeHebrewDateText(s: string) {
  return stripNiqqud(String(s || ''))
    .replace(/["'״׳]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
function fromHebrewTextToDate(s: string): Date | null {
  const key = normalizeHebrewDateText(s)
  if (!key) return null
  const now = new Date()
  const startYear = now.getFullYear() - 5
  const endYear = now.getFullYear() + 2
  for (let y = startYear; y <= endYear; y++) {
    const d = new Date(y, 0, 1)
    while (d.getFullYear() === y) {
      const heb = normalizeHebrewDateText(toHebrewText(d))
      if (heb && heb === key) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      d.setDate(d.getDate() + 1)
    }
  }
  return null
}

function sanitizeName(raw: any): string {
  let s = String(raw ?? '').trim()
  s = s.replace(/^\s*\[\s*"(.*)"\s*\]\s*$/s, '$1')
  s = s.replace(/^["'\[\]]+|["'\[\]]+$/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function getHebrewCalendar(date: Date) {
  const hdate = new HDate(date)
  const monthName = hdate.getMonthName('he')
  const year = hdate.getFullYear()
  const hebrewYear = new Intl.NumberFormat('he-IL-u-nu-hebr', { useGrouping: false }).format(year)
  return { monthName, hebrewYear }
}

function renderHebrewDay(day: number, date: Date) {
  const hdate = new HDate(date)
  const hebrewDay = new Intl.NumberFormat('he-IL-u-nu-hebr', { useGrouping: false }).format(hdate.getDate())
  return <div className="flex flex-col items-center leading-tight py-0.5">
    <span className="text-[13px]">{day}</span>
    <span className="text-[11px] opacity-80">{hebrewDay}</span>
  </div>
}

export function Component() {
  const [list, setList] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formHonoree, setFormHonoree] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formFatherName, setFormFatherName] = useState('')
  const [formGender, setFormGender] = useState<'male' | 'female' | ''>('')
  const [formDate, setFormDate] = useState<Date | null>(null)
  const [storyDates, setStoryDates] = useState<Date[]>([])
  const storyDateStyle = `
    .react-datepicker__day.has-story { background-color: #dcfce7; color: #166534; border-radius: 50%; font-weight: bold; }
  `

  function handleCsvExport() {
    try {
      const header = ['honoree','last_name','father_name','gender','event_date']
      const rows = list.map((m) => {
        const honoree = sanitizeName(m.honoree)
        const last_name = sanitizeName((m as any).last_name || '')
        const father = sanitizeName(m.father_name || '')
        const gender = m.gender || ''
        const event_date = m.event_date || ''
        const safe = [honoree, last_name, father, gender, event_date].map((v) => {
          const s = String(v ?? '')
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        })
        return safe.join(',')
      })
      const bom = '\ufeff'
      const csv = [header.join(','), ...rows].join('\n')
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      const y = d.getFullYear(), m2 = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0')
      a.href = url
      a.download = `memorials-${y}-${m2}-${da}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('שגיאה ביצוא CSV')
    }
  }

  async function loadMemorials() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await listMemorials()
      if (error) {
        // Log the error but don't block the UI if some data was returned.
        console.error("Error fetching memorials, possibly due to malformed data:", error)
      }
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

  // Load story dates for highlighting in the calendar
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('stories')
          .select('play_date')
          .not('play_date', 'is', null)
        const uniqStr = new Set<string>()
        ;(data || []).forEach((r: any) => { if (r.play_date) uniqStr.add(String(r.play_date)) })
        const out: Date[] = []
        for (const s of Array.from(uniqStr)) {
          const d = new Date(s)
          if (!isNaN(d.getTime())) {
            out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
            continue
          }
          const maybe = fromHebrewTextToDate(s)
          if (maybe) out.push(maybe)
        }
        const uniq = new Map<string, Date>()
        out.forEach(d => uniq.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, d))
        setStoryDates(Array.from(uniq.values()))
      } catch {}
    })()
  }, [])

  function startCreate() {
    setEditingId(null)
    setFormHonoree('')
    setFormLastName('')
    setFormFatherName('')
    setFormGender('')
    setFormDate(null)
    setIsModalOpen(true)
  }

  function startEdit(item: Memorial) {
    setEditingId(item.id)
    // Coerce potential array values to strings for safe editing
    const honoree = sanitizeName(Array.isArray((item as any).honoree) ? String(((item as any).honoree[0] ?? '')) : String(item.honoree ?? ''))
    const lastName = sanitizeName(Array.isArray((item as any).last_name) ? (((item as any).last_name[0] ?? '') as string) : ((item as any).last_name || ''))
    const father = sanitizeName(Array.isArray((item as any).father_name) ? (((item as any).father_name[0] ?? '') as string) : (item.father_name || ''))
    const gender = Array.isArray((item as any).gender)
      ? (((item as any).gender[0] ?? null) as 'male' | 'female' | null)
      : (item.gender ?? null)
    setFormFatherName(father)
    setFormHonoree(honoree)
    setFormLastName(lastName)
    setFormGender((gender as any) || '')
    setFormDate(item.event_date ? new Date(item.event_date) : null)
    setIsModalOpen(true)
  }

  async function handleSave() {
    const honoree = sanitizeName(formHonoree)
    if (!honoree) {
      setErr('יש למלא שם נזכר/ת')
      return
    }
    try {
      setErr(null)
      const payload = {
        honoree,
        last_name: sanitizeName(formLastName) || null,
        father_name: sanitizeName(formFatherName) || null,
        gender: formGender || null,
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

  async function removeAll() {
    if (list.length === 0) { alert('אין רשומות למחיקה'); return }
    if (!confirm(`האם למחוק את כל ${list.length} הנפטרים? פעולה זו בלתי הפיכה.`)) return
    try {
      setErr(null)
      const ids = list.map(m => m.id)
      const { error } = await supabase.from('memorials').delete().in('id', ids)
      if (error) throw error
      setMsg(`נמחקו ${ids.length} רשומות בהצלחה`)
      await loadMemorials()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקה הגלובאלית')
    }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לעילוי נשמת (ניהול)</h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={() => csvInputRef.current?.click()}>ייבוא CSV</button>
          <button className="px-4 py-2 rounded-lg border border-red-300 text-red-600" onClick={removeAll}>מחיקה גלובאלית</button>
          <button className="px-4 py-2 rounded-lg border" onClick={handleCsvExport}>ייצוא CSV</button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={startCreate}>הוספת רשומה</button>
        </div>
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
                <th className="p-3 text-right">שם האב</th>
                <th className="p-3 text-right">מין</th>
                <th className="p-3 text-right">תאריך פטירה (עברי)</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{sanitizeName(item.honoree)}</td>
                  <td className="p-3">{sanitizeName((item as any).last_name || '') || '—'}</td>
                  <td className="p-3">{sanitizeName(item.father_name || '') || '—'}</td>
                  <td className="p-3">{item.gender === 'male' ? 'גבר' : item.gender === 'female' ? 'אישה' : '—'}</td>
                  <td className="p-3">{item.event_date ? toHebrewText(item.event_date) : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(item)}>עריכה</button>
                      <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(item.id)}>מחיקה</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={5}>אין נתונים להצגה.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'עריכת רשומה' : 'רשומה חדשה'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">שם נזכר/ת *</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formHonoree} onChange={(e) => setFormHonoree(e.target.value)} onBlur={(e)=> setFormHonoree(sanitizeName(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">שם האב</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formFatherName} onChange={(e) => setFormFatherName(e.target.value)} onBlur={(e)=> setFormFatherName(sanitizeName(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">מין</label>
                <select className="w-full mt-1 border rounded-lg p-2 bg-white" value={formGender} onChange={(e) => setFormGender(e.target.value as 'male' | 'female' | '')}>
                  <option value="">לא צוין</option>
                  <option value="male">גבר</option>
                  <option value="female">אישה</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">תאריך פטירה</label>
                <style>{storyDateStyle}</style>
                <style>{storyDateStyle}</style>
                <ReactDatePicker
                  selected={formDate}
                  onChange={(d: Date | null) => setFormDate(d)}
                  inline
                  showPopperArrow={false}
                  className="w-full mt-1 border rounded-lg p-2 text-right" // This class is not used with inline, but kept for consistency
                  calendarStartDay={0}
                  highlightDates={[{ 'has-story': storyDates }]}
                  highlightDates={[{ 'has-story': storyDates }]}
                  renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => {
                    const { monthName, hebrewYear } = getHebrewCalendar(date)
                    return (
                      <div className="flex items-center justify-between px-2 py-1">
                        <button type="button" onClick={decreaseMonth} className="px-2 text-lg">‹</button>
                        <div className="font-semibold">{monthName} {hebrewYear}</div>
                        <button type="button" onClick={increaseMonth} className="px-2 text-lg">›</button>
                      </div>
                    )
                  }}
                  renderDayContents={renderHebrewDay}
                />
                <button type="button" className="text-sm text-blue-600 hover:underline mt-1" onClick={() => setFormDate(null)}>
                  נקה תאריך
                </button>
                {formDate && (
                  <div className="mt-1 text-sm text-gray-600">עברי: {toHebrewText(formDate)}</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-600">שם משפחה</label>
              <input className="w-full mt-1 border rounded-lg p-2" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} onBlur={(e)=> setFormLastName(sanitizeName(e.target.value))} />
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

// CSV input ref and handler (module scope wrappers)
const csvInputRef: { current: HTMLInputElement | null } = { current: null }
async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length === 0) return
    const parseLine = (line: string) => {
      const out: string[] = []
      let cur = ''
      let q = false
      for (let i=0;i<line.length;i++) {
        const ch = line[i]
        if (ch === '"') { q = !q; continue }
        if (ch === ',' && !q) { out.push(cur); cur = ''; continue }
        cur += ch
      }
      out.push(cur)
      return out.map(s => s.trim())
    }
    const headerFields = ['honoree','father_name','gender','event_date']
    const first = parseLine(lines[0]).map(s=>s.toLowerCase())
    const hasHeader = headerFields.some(h => first.includes(h))
    const rows = (hasHeader ? lines.slice(1) : lines).map(parseLine)
    const payloads = rows.map(cols => {
      const [c0,c1,c2,c3] = cols
      const honoree = sanitizeName(c0)
      const father_name = sanitizeName(c1)
      const g = (c2 || '').toLowerCase()
      const gender = g === 'male' || g === 'זכר' ? 'male' : g === 'female' || g === 'נקבה' ? 'female' : null
      let event_date: string | null = null
      if (c3) {
        const d = new Date(c3)
        if (!isNaN(d.getTime())) event_date = d.toISOString().slice(0,10)
        else {
          const maybe = fromHebrewTextToDate(c3)
          if (maybe) event_date = maybe.toISOString().slice(0,10)
        }
      }
      return { honoree, father_name: father_name || null, gender, event_date }
    }).filter(p => p.honoree)
    for (const p of payloads) {
      const { error } = await createMemorial(p as any)
      if (error) throw new Error(error)
    }
    alert(`יובאו ${payloads.length} נפטרים בהצלחה`)
    e.target.value = ''
  } catch (ex: any) {
    alert(ex.message || 'שגיאה בייבוא CSV')
  }
}
