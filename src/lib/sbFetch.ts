import { supabase } from '@/lib/supabase'

export async function sbFetch<T>(
  query: ReturnType<typeof supabase.from<any>>,
  timeoutMs = 10000
): Promise<{ data: T | null; error: Error | null }> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    // @ts-ignore supabase-js v2 תומך ב-signal
    const { data, error } = await query.abortSignal(ctl.signal)
    return { data: (data as T) ?? null, error: error ? new Error(error.message) : null }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { data: null, error: new Error('Timeout אחרי 10 שניות') }
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) }
  } finally {
    clearTimeout(t)
  }
}
