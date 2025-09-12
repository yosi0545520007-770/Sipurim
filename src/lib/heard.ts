import { supabase } from '@/lib/supabase'

const KEY = 'heardStories'

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function write(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch {}
}

function notify() {
  try { window.dispatchEvent(new Event('heard-updated')) } catch {}
}

export function isHeard(id: string): boolean {
  return read().has(id)
}

export async function markHeard(id: string) {
  const set = read()
  if (!set.has(id)) {
    set.add(id)
    write(set)
    notify()
  }
  // best-effort remote persist if logged in
  try {
    const { data: u } = await supabase.auth.getUser()
    const user = (u as any)?.user
    if (!user?.id) return
    // upsert unique by (user_id, story_id)
    await supabase.from('story_listens').insert({ user_id: user.id, story_id: id }).select().maybeSingle()
  } catch {}
}

export async function unmarkHeard(id: string) {
  const set = read()
  if (set.has(id)) {
    set.delete(id)
    write(set)
    notify()
  }
  // best-effort remote delete if logged in
  try {
    const { data: u } = await supabase.auth.getUser()
    const user = (u as any)?.user
    if (!user?.id) return
    await supabase.from('story_listens').delete().eq('user_id', user.id).eq('story_id', id)
  } catch {}
}

export async function toggleHeard(id: string) {
  if (isHeard(id)) return unmarkHeard(id)
  return markHeard(id)
}

export async function loadHeardFromRemote() {
  try {
    const { data: u } = await supabase.auth.getUser()
    const user = (u as any)?.user
    if (!user?.id) return
    const { data } = await supabase
      .from('story_listens')
      .select('story_id')
      .eq('user_id', user.id)
    const local = read()
    for (const row of (data || []) as any[]) local.add(row.story_id)
    write(local)
    notify()
  } catch {}
}

export function useHeard(ids?: string[]) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const on = () => setTick((t) => t + 1)
    window.addEventListener('heard-updated', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('heard-updated', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  const set = read()
  const map: Record<string, boolean> = {}
  if (ids) ids.forEach((id) => (map[id] = set.has(id)))
  return { heardSet: set, isHeard: (id: string) => set.has(id), map, _tick: tick }
}

import { useEffect, useState } from 'react'
