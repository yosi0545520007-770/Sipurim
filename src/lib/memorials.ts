import { supabase } from './supabase'

export type Memorial = {
  id: string
  honoree: string
  event_date: string | null
  created_at: string
}

export async function listMemorials() {
  const { data, error } = await supabase
    .from('memorials')
    .select('id, honoree, event_date, created_at')
    .order('created_at', { ascending: false })
  return { data: (data || []) as Memorial[], error: error?.message || null }
}

export async function createMemorial(payload: { honoree: string; event_date: string | null }) {
  const { error } = await supabase.from('memorials').insert(payload)
  return { error: error?.message || null }
}

export async function updateMemorial(id: string, payload: { honoree: string; event_date: string | null }) {
  const { error } = await supabase.from('memorials').update(payload).eq('id', id)
  return { error: error?.message || null }
}

export async function deleteMemorial(id: string) {
  const { error } = await supabase.from('memorials').delete().eq('id', id)
  return { error: error?.message || null }
}