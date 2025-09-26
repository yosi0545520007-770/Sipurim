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
  s = s.replace(/^\{"?(.*?)"?\}$/, '$1') // Remove {value} or {"value"}
  s = s.replace(/^["'\[\]]+|["'\[\]]+$/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function guessGenderFromName(name: string): 'male' | 'female' | '' {
  const cleanName = (name || '').trim()
  if (!cleanName) return ''

  // 1. Male exceptions ending in 'ה'
  const maleExceptions = ['משה', 'שלמה', 'יהודה', 'אליה', 'אריה', 'ירמיה', 'נחמיה']
  if (maleExceptions.includes(cleanName)) {
    return 'male'
  }

  // 2. Common female names (including those not ending in ה/ת)
  const femaleNames = ['מרים', 'יעל', 'אסתר', 'מיכל', 'רות', 'חן', 'שירן', 'לירן', 'סיון', 'כרמל', 'שקד', 'הדס', 'אביגיל']
  if (femaleNames.includes(cleanName)) {
    return 'female'
  }

  // 3. Common female endings
  if (cleanName.endsWith('ה') || cleanName.endsWith('ת')) {
    return 'female'
  }

  // 4. If no specific female pattern, default to male (user can override)
  return 'male'
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
  const [formMotherName, setFormMotherName] = useState('')
  const [formGender, setFormGender] = useState<'male' | 'female' | ''>('')
  const [formDate, setFormDate] = useState<Date | null>(null)
  const [storyDates, setStoryDates] = useState<Date[]>([])
  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [inlineFormData, setInlineFormData] = useState<{ honoree: string, father_name: string, mother_name: string }>({ honoree: '', father_name: '', mother_name: '' })

  const storyDateStyle = `
    .react-datepicker__day.has-story { background-color: #dcfce7; color: #166534; border-radius: 50%; font-weight: bold; }
  `

  function handleCsvExport() {
    try {
      const header = ['honoree','last_name','father_name','mother_name','gender','event_date']
      const rows = list.map((m) => {
        const honoree = sanitizeName(m.honoree)
        const last_name = sanitizeName((m as any).last_name || '')
        const father = sanitizeName(m.father_name || '')
        const mother = sanitizeName(m.mother_name || '')
        const gender = m.gender || ''
        const event_date = m.event_date || ''
        const safe = [honoree, last_name, father, mother, gender, event_date].map((v) => {
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
    setFormMotherName('')
    setFormGender('')
    setFormDate(null)
    setIsModalOpen(true)
  }

  function startEdit(item: Memorial) {
    setEditingId(item.id)
    // Coerce potential array values to strings for safe editing
    const honoree = sanitizeName(Array.isArray(item.honoree) ? item.honoree[0] : item.honoree)
    const lastName = sanitizeName(Array.isArray((item as any).last_name) ? (item as any).last_name[0] : (item as any).last_name)
    const father = sanitizeName(Array.isArray(item.father_name) ? item.father_name[0] : item.father_name)
    const mother = sanitizeName(Array.isArray(item.mother_name) ? item.mother_name[0] : item.mother_name)
    const gender = item.gender || ''
    setFormFatherName(father)
    setFormHonoree(honoree)
    setFormMotherName(mother)
    setFormLastName(lastName)
    setFormGender(gender as 'male' | 'female' | '')
    setFormDate(item.event_date ? new Date(item.event_date) : null)
    setIsModalOpen(true)
  }

  function startInlineEdit(item: Memorial) {
    setInlineEditingId(item.id)
    setInlineFormData({
      honoree: sanitizeName(Array.isArray(item.honoree) ? item.honoree[0] : item.honoree),
      father_name: sanitizeName(Array.isArray(item.father_name) ? item.father_name[0] : item.father_name),
      mother_name: sanitizeName(Array.isArray(item.mother_name) ? item.mother_name[0] : item.mother_name),
    })
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
        father_name: [sanitizeName(formFatherName) || 'אברהם'],
        mother_name: [sanitizeName(formMotherName) || 'שרה'],
        gender: formGender ? [formGender] : null,
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

  async function handleInlineSave() {
    if (!inlineEditingId) return
    const honoree = sanitizeName(inlineFormData.honoree)
    if (!honoree) {
      setErr('שם הנזכר/ת לא יכול להיות ריק')
      return
    }
    try {
      setErr(null)
      const payload = {
        honoree,
        father_name: [sanitizeName(inlineFormData.father_name) || 'אברהם'],
        mother_name: [sanitizeName(inlineFormData.mother_name) || 'שרה'],
      }
      const { error } = await updateMemorial(inlineEditingId, payload)
      if (error) throw new Error(error)
      setMsg(`עודכן בהצלחה: ${honoree}`)
      setInlineEditingId(null)
      await loadMemorials()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בעדכון')
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

  async function handleUpdateAllGenders() {
    if (!confirm(`האם לעדכן אוטומטית את המין עבור כל הרשומות שבהן הוא חסר? הפעולה תתבצע רק על רשומות ללא מין מוגדר.`)) return

    try {
      setLoading(true)
      setErr(null)

      const { data: allMemorials, error: fetchError } = await listMemorials()
      if (fetchError) throw fetchError

      if (!allMemorials || allMemorials.length === 0) {
        alert('אין רשומות לעדכון.')
        return
      }

      const updates: Memorial[] = []
      for (const memorial of allMemorials) {
        if (!memorial.gender) {
          const honoreeName = sanitizeName(memorial.honoree || '').split(' ')[0]
          const guessedGender = guessGenderFromName(honoreeName)
          if (guessedGender) {
            updates.push({
              ...memorial,
              father_name: memorial.father_name || ['אברהם'],
              mother_name: memorial.mother_name || ['שרה'],
              gender: [guessedGender],
            } as Memorial)
          }
        }
      }

      if (updates.length === 0) { setMsg('לא נמצאו רשומות לעדכון. נראה שהכל כבר מעודכן.'); return }

      const { error: updateError } = await supabase.from('memorials').upsert(updates)
      if (updateError) throw updateError

      setMsg(`עודכנו ${updates.length} רשומות בהצלחה.`); await loadMemorials()
    } catch (e: any) { setErr(e.message || 'שגיאה בעדכון המין ההמוני') } finally { setLoading(false) }
  }

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לעילוי נשמת (ניהול)</h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={() => csvInputRef.current?.click()}>ייבוא CSV</button>
          <button className="px-4 py-2 rounded-lg border border-red-300 text-red-600" onClick={removeAll}>מחיקה גלובאלית</button>
          <button className="px-4 py-2 rounded-lg border" onClick={handleUpdateAllGenders}>עדכון מין (אוטומטי)</button>
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
                <th className="p-3 text-right">שם האם</th>
                <th className="p-3 text-right">מין</th>
                <th className="p-3 text-right">תאריך פטירה</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                inlineEditingId === item.id ? (
                  // ----- Inline Edit Row -----
                  <tr key={`${item.id}-edit`} className="border-t bg-blue-50">
                    <td className="p-2"><input type="text" className="w-full p-1 border rounded" value={inlineFormData.honoree} onChange={(e) => setInlineFormData(f => ({ ...f, honoree: e.target.value }))} /></td>
                    <td className="p-2"><input type="text" className="w-full p-1 border rounded" value={inlineFormData.father_name} onChange={(e) => setInlineFormData(f => ({ ...f, father_name: e.target.value }))} /></td>
                    <td className="p-2"><input type="text" className="w-full p-1 border rounded" value={inlineFormData.mother_name} onChange={(e) => setInlineFormData(f => ({ ...f, mother_name: e.target.value }))} /></td>
                    <td className="p-3 text-gray-500 text-xs" colSpan={2}>עריכה מהירה...</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button className="px-3 py-1 rounded-lg bg-blue-600 text-white" onClick={handleInlineSave}>שמור</button>
                        <button className="px-3 py-1 rounded-lg border" onClick={() => setInlineEditingId(null)}>ביטול</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ----- Display Row -----
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{sanitizeName(item.honoree)}</td>
                    <td className="p-3">{sanitizeName(item.father_name || '') || '—'}</td>
                    <td className="p-3">{sanitizeName(item.mother_name || '') || '—'}</td>
                    <td className="p-3">{item.gender === 'male' ? 'גבר' : item.gender === 'female' ? 'אישה' : '—'}</td>
                    <td className="p-3">{item.event_date ? toHebrewText(item.event_date) : '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button className="px-3 py-1 rounded-lg border" onClick={() => startInlineEdit(item)}>עריכה מהירה</button>
                        <button className="px-3 py-1 rounded-lg border" onClick={() => startEdit(item)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-horizontal"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                        <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => remove(item.id)}>מחיקה</button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {list.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={6}>אין נתונים להצגה.</td></tr>}
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
                <input
                  className="w-full mt-1 border rounded-lg p-2"
                  value={formHonoree}
                  onChange={(e) => setFormHonoree(e.target.value)}
                  onBlur={(e) => {
                    const finalName = sanitizeName(e.target.value)
                    setFormHonoree(finalName)
                    const guessedGender = guessGenderFromName(finalName.split(' ')[0]) // Guess from first name
                    if (guessedGender) {
                      setFormGender(guessedGender)
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">שם משפחה</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} onBlur={(e)=> setFormLastName(sanitizeName(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">שם האב</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formFatherName} onChange={(e) => setFormFatherName(e.target.value)} onBlur={(e)=> setFormFatherName(sanitizeName(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">שם האם</label>
                <input className="w-full mt-1 border rounded-lg p-2" value={formMotherName} onChange={(e) => setFormMotherName(e.target.value)} onBlur={(e)=> setFormMotherName(sanitizeName(e.target.value))} />
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
    const headerFields = ['honoree','father_name','mother_name','gender','event_date']
    const first = parseLine(lines[0]).map(s=>s.toLowerCase())
    const hasHeader = headerFields.some(h => first.includes(h))
    const rows = (hasHeader ? lines.slice(1) : lines).map(parseLine)
    const payloads = rows.map(cols => {
      const [c0,c1,c2,c3,c4] = cols
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
      return { honoree, father_name: father_name ? [father_name] : null, gender: gender ? [gender] : null, event_date }
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
