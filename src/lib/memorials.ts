import { supabase } from './supabase'

export type Memorial = {
  id: string
  honoree: string
  father_name?: string | null
  mother_name?: string | null
  last_name?: string | null
  gender?: 'male' | 'female' | null
  event_date: string | null
  created_at: string
}

export async function listMemorials() {
  function sanitizeNameVal(raw: any): string | null {
    if (raw == null) return null
    try {
      let s = String(raw).trim()
      // unwrap ["..."] or ['...']
      const m = s.match(/^\s*\[\s*(["'])(.*)\1\s*\]\s*$/s)
      if (m) s = m[2]
      // remove leading/trailing quotes/brackets
      s = s.replace(/^["'\[\]]+|["'\[\]]+$/g, '')
      // collapse spaces
      s = s.replace(/\s+/g, ' ').trim()
      return s
    } catch { return String(raw || '') }
  }
  // Try selecting with last_name; if DB doesn't have the column, fallback without it
  let data: any[] | null = null
  let errorMsg: string | null = null
  let q = await supabase
    .from('memorials')
    .select('id, honoree, father_name, mother_name, last_name, gender, event_date, created_at')
    .order('created_at', { ascending: false })
  if (q.error) {
    errorMsg = q.error.message || null
    const q2 = await supabase
      .from('memorials')
      .select('id, honoree, father_name, mother_name, gender, event_date, created_at')
      .order('created_at', { ascending: false })
    data = q2.data || []
    if (q2.error && !errorMsg) errorMsg = q2.error.message || null
  } else {
    data = q.data || []
  }
  // Normalize potential array-typed fields (if DB columns are text[])
  const normalized = (data || []).map((r: any) => ({
    ...r,
    honoree: sanitizeNameVal(Array.isArray(r?.honoree) ? (r.honoree[0] ?? '') : (r?.honoree ?? '')) || '',
    father_name: sanitizeNameVal(Array.isArray(r?.father_name)
      ? (r.father_name[0] ?? null)
      : (r?.father_name ?? null)),
    mother_name: sanitizeNameVal(Array.isArray(r?.mother_name)
      ? (r.mother_name[0] ?? null)
      : (r?.mother_name ?? null)),
    last_name: sanitizeNameVal(Array.isArray(r?.last_name)
      ? (r.last_name[0] ?? null)
      : (r?.last_name ?? r?.lastName ?? null)),
    gender: Array.isArray(r?.gender)
      ? ((r.gender[0] ?? null) as any)
      : (r?.gender ?? null),
  })) as unknown as Memorial[]
  return { data: normalized, error: errorMsg }
}

type MemorialPayload = Omit<Memorial, 'id' | 'created_at'>
export async function createMemorial(payload: MemorialPayload) {
  // First try as-is (but drop last_name if it's empty/falsy to avoid errors on missing column)
  const base: any = { ...payload }
  if (base.last_name == null || base.last_name === '') delete base.last_name
  if (base.mother_name == null || base.mother_name === '') delete base.mother_name
  let { error } = await supabase.from('memorials').insert(base)
  if (error) {
    const msg = (error.message || '')
    // If column last_name doesn't exist in DB, try again without it
    if ((/does not exist/i.test(msg) && /last[_ ]?name/i.test(msg)) || /relation\s+\"?(?:public\.)?memorials\"?/i.test(msg)) {
      const { last_name, ...rest }: any = base as any
      const r0 = await supabase.from('memorials').insert(rest)
      return { error: r0.error?.message || null }
    }
    // If DB expects arrays (text[]), retry with honoree/father_name wrapped as arrays
    if (/malformed array literal|text\[\]|array literal|array expected/i.test(msg)) {
      const alt: any = {
        ...payload,
        honoree: Array.isArray((payload as any).honoree) ? (payload as any).honoree : [(payload as any).honoree],
        father_name:
          (payload as any).father_name == null || (payload as any).father_name === ''
            ? null
            : Array.isArray((payload as any).father_name)
            ? (payload as any).father_name
            : [(payload as any).father_name],
        mother_name:
          (payload as any).mother_name == null || (payload as any).mother_name === ''
            ? null
            : Array.isArray((payload as any).mother_name)
            ? (payload as any).mother_name
            : [(payload as any).mother_name],
        last_name:
          (payload as any).last_name == null || (payload as any).last_name === ''
            ? null
            : Array.isArray((payload as any).last_name)
            ? (payload as any).last_name
            : [(payload as any).last_name],
        gender:
          (payload as any).gender == null || (payload as any).gender === ''
            ? null
            : Array.isArray((payload as any).gender)
            ? (payload as any).gender
            : [(payload as any).gender],
      }
      const r2 = await supabase.from('memorials').insert(alt)
      return { error: r2.error?.message || null }
    }
    // If DB expects plain text but got arrays
    if (/is of type text but expression is of type text\[\]/i.test(msg)) {
      const alt2: any = {
        ...base,
        honoree: Array.isArray((payload as any).honoree)
          ? String((payload as any).honoree[0] ?? '')
          : (payload as any).honoree,
        father_name: Array.isArray((payload as any).father_name)
          ? ((payload as any).father_name[0] ?? null)
          : (payload as any).father_name ?? null,
        mother_name: Array.isArray((payload as any).mother_name)
          ? ((payload as any).mother_name[0] ?? null)
          : (payload as any).mother_name ?? null,
        last_name: Array.isArray((payload as any).last_name)
          ? ((payload as any).last_name[0] ?? null)
          : (payload as any).last_name ?? null,
        gender: Array.isArray((payload as any).gender)
          ? ((payload as any).gender[0] ?? null)
          : (payload as any).gender ?? null,
      }
      const r3 = await supabase.from('memorials').insert(alt2)
      return { error: r3.error?.message || null }
    }
  }
  return { error: error?.message || null }
}

type MemorialUpdatePayload = Partial<Omit<Memorial, 'id' | 'created_at'>>
export async function updateMemorial(id: string, payload: MemorialUpdatePayload) {
  // First try as-is (but drop last_name if it's empty/falsy to avoid errors on missing column)
  const base: any = { ...payload }
  if (base.last_name === '') base.last_name = null
  if (base.last_name == null) delete base.last_name
  if (base.mother_name === '') base.mother_name = null
  if (base.mother_name == null) delete base.mother_name
  let { error } = await supabase.from('memorials').update(base).eq('id', id)
  if (error) {
    const msg = (error.message || '')
    // If column last_name doesn't exist in DB, try again without it
    if ((/does not exist/i.test(msg) && /last[_ ]?name/i.test(msg)) || /relation\s+\"?(?:public\.)?memorials\"?/i.test(msg)) {
      const { last_name, ...rest }: any = base as any
      const r0 = await supabase.from('memorials').update(rest).eq('id', id)
      return { error: r0.error?.message || null }
    }
    // If DB expects arrays (text[]), retry with honoree/father_name wrapped as arrays
    if (/malformed array literal|text\[\]|array literal|array expected/i.test(msg)) {
      const alt: any = {
        ...base,
        honoree:
          (payload as any).honoree === undefined
            ? undefined
            : Array.isArray((payload as any).honoree)
            ? (payload as any).honoree
            : [(payload as any).honoree],
        father_name:
          (payload as any).father_name === undefined
            ? undefined
            : (payload as any).father_name == null || (payload as any).father_name === ''
            ? null
            : Array.isArray((payload as any).father_name)
            ? (payload as any).father_name
            : [(payload as any).father_name],
        mother_name:
          (payload as any).mother_name === undefined
            ? undefined
            : (payload as any).mother_name == null || (payload as any).mother_name === ''
            ? null
            : Array.isArray((payload as any).mother_name)
            ? (payload as any).mother_name
            : [(payload as any).mother_name],
        last_name:
          (payload as any).last_name === undefined
            ? undefined
            : (payload as any).last_name == null || (payload as any).last_name === ''
            ? null
            : Array.isArray((payload as any).last_name)
            ? (payload as any).last_name
            : [(payload as any).last_name],
        gender:
          (payload as any).gender === undefined
            ? undefined
            : (payload as any).gender == null || (payload as any).gender === ''
            ? null
            : Array.isArray((payload as any).gender)
            ? (payload as any).gender
            : [(payload as any).gender],
      }
      const r2 = await supabase.from('memorials').update(alt).eq('id', id)
      return { error: r2.error?.message || null }
    }
    // If DB expects plain text but got arrays
    if (/is of type text but expression is of type text\[\]/i.test(msg)) {
      const alt2: any = {
        ...base,
        honoree:
          (payload as any).honoree === undefined
            ? undefined
            : Array.isArray((payload as any).honoree)
            ? String((payload as any).honoree[0] ?? '')
            : (payload as any).honoree,
        father_name:
          (payload as any).father_name === undefined
            ? undefined
            : Array.isArray((payload as any).father_name)
            ? ((payload as any).father_name[0] ?? null)
            : (payload as any).father_name ?? null,
        mother_name:
          (payload as any).mother_name === undefined
            ? undefined
            : Array.isArray((payload as any).mother_name)
            ? ((payload as any).mother_name[0] ?? null)
            : (payload as any).mother_name ?? null,
        last_name:
          (payload as any).last_name === undefined
            ? undefined
            : Array.isArray((payload as any).last_name)
            ? ((payload as any).last_name[0] ?? null)
            : (payload as any).last_name ?? null,
        gender:
          (payload as any).gender === undefined
            ? undefined
            : Array.isArray((payload as any).gender)
            ? ((payload as any).gender[0] ?? null)
            : (payload as any).gender ?? null,
      }
      const r3 = await supabase.from('memorials').update(alt2).eq('id', id)
      return { error: r3.error?.message || null }
    }
  }
  return { error: error?.message || null }
}

export async function deleteMemorial(id: string) {
  const { error } = await supabase.from('memorials').delete().eq('id', id)
  return { error: error?.message || null }
}
