import { createClient } from '@supabase/supabase-js'

// Graceful fallback when env vars are missing to avoid white screen in preview/dev
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function createStubClient() {
  const MSG = 'Supabase environment not configured (.env)'
  // Minimal thenable query builder that mimics supabase-js chaining
  const makeQuery = () => {
    const result: any = {
      select: () => result,
      eq: () => result,
      order: () => result,
      limit: () => result,
      maybeSingle: async () => ({ data: null, error: new Error(MSG) }),
      // allow `await query` without calling a terminal method
      then: (onFulfilled: any, onRejected: any) => {
        return Promise.resolve({ data: [], error: new Error(MSG) }).then(onFulfilled, onRejected)
      },
    }
    return result
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error(MSG) }),
      getUser: async () => ({ data: { user: null }, error: new Error(MSG) }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe() {} } }, error: null }),
    },
    from: (_table: string) => makeQuery(),
  } as any
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createStubClient()
