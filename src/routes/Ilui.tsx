import { useEffect, useState } from 'react'
import { listMemorials, type Memorial } from '@/lib/memorials'
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

function sanitizeName(raw: any): string {
  let s = String(raw ?? '').trim()
  s = s.replace(/^\s*\[\s*"(.*)"\s*\]\s*$/s, '$1')
  s = s.replace(/^\{"?(.*?)"?\}$/, '$1') // Remove {value} or {"value"}
  s = s.replace(/^["'\[\]]+|["'\[\]]+$/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function Candle() {
  return (
    <div className="w-12 h-12" title="נר זיכרון">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className="flame-flicker">
          <path d="M50 30 C 55 40, 55 50, 50 60 C 45 50, 45 40, 50 30 Z" fill="url(#flameGradient)" />
        </g>
        <rect x="40" y="60" width="20" height="35" rx="3" fill="#F7F3E3" stroke="#E0DBCB" strokeWidth="1" />
        <defs>
          <radialGradient id="flameGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={{ stopColor: '#FEEB9C', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#F2994A', stopOpacity: 1 }} />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

export function Component() {
  const [mem, setMem] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setErr(null)
      setLoading(true)
      const { data, error } = await listMemorials()
      if (error) {
        setErr(error)
        setLoading(false)
        return
      }
      setMem(data)
      setLoading(false)
    })()
  }, [])

  return (
    <section className="container mx-auto px-4 py-10" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לעילוי נשמת</h1>
      </div>

      {loading && <div className="text-gray-500">טוען…</div>}
      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 mb-4">{err}</div>}

      {!loading && (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {mem.map((m) => {
            const parents: string[] = []
            if (m.father_name) parents.push(sanitizeName(m.father_name))
            if (m.mother_name) parents.push(sanitizeName(m.mother_name))

            let parentsText = ''
            if (parents.length > 0) {
              const relation = sanitizeName(m.gender) === 'female' ? 'בת' : 'בן'
              parentsText = `${relation} ${parents.join(' ו')}`
            }

            return (
              <li key={m.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-3 shadow-sm">
                <Candle />
                <div className="flex-1 space-y-0.5">
                  <div className="font-semibold text-lg">{sanitizeName(m.honoree)}</div>
                  {parentsText && <div className="text-sm text-gray-600">{parentsText}</div>}
                  {m.event_date && <div className="text-sm text-gray-500">תאריך פטירה: {toHebrewText(m.event_date)}</div>}
                </div>
              </li>
            )
          })}
          {!mem.length && <div className="text-gray-500 col-span-full">אין פריטים להצגה.</div>}
        </ul>
      )}
    </section>
  )
}
