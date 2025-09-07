import { supabase } from '@/lib/supabase'

export type Memorial = {
  id: string
  honoree: string
  note: string | null
  event_date: string | null // YYYY-MM-DD
}

const MOCK = (import.meta as any).env?.VITE_MOCK_MEMORIALS === 'true' || !(import.meta as any).env?.VITE_SUPABASE_URL
const LS_KEY = 'memorials.mock.v1'

function lsRead(): Memorial[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
  } catch { return [] }
}
function lsWrite(arr: Memorial[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch {}
}
function genId() { return crypto?.randomUUID?.() || Math.random().toString(36).slice(2) }

export async function listMemorials(): Promise<{ data: Memorial[]; error: string | null }> {
  if (MOCK) {
    const data = lsRead().sort((a,b)=> (b.event_date||'').localeCompare(a.event_date||''))
    return { data, error: null }
  }
  const { data, error } = await supabase
    .from('memorials')
    .select('id,honoree,note,event_date')
    .order('event_date', { ascending: false })
  return { data: (data || []) as any, error: error?.message || null }
}

export async function createMemorial(input: { honoree: string; event_date: string; note?: string | null }): Promise<{ error: string | null }>{
  if (MOCK) {
    const arr = lsRead()
    arr.push({ id: genId(), honoree: input.honoree, note: input.note ?? null, event_date: input.event_date })
    lsWrite(arr)
    return { error: null }
  }
  const { error } = await supabase.from('memorials').insert({ honoree: input.honoree, event_date: input.event_date, note: input.note ?? null })
  return { error: error?.message || null }
}

export async function updateMemorial(id: string, patch: { honoree?: string; event_date?: string; note?: string | null }): Promise<{ error: string | null }>{
  if (MOCK) {
    const arr = lsRead()
    const idx = arr.findIndex(m => m.id === id)
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...patch }
      lsWrite(arr)
    }
    return { error: null }
  }
  const { error } = await supabase.from('memorials').update(patch).eq('id', id)
  return { error: error?.message || null }
}

export async function deleteMemorial(id: string): Promise<{ error: string | null }>{
  if (MOCK) {
    const arr = lsRead().filter(m => m.id !== id)
    lsWrite(arr)
    return { error: null }
  }
  const { error } = await supabase.from('memorials').delete().eq('id', id)
  return { error: error?.message || null }
}

