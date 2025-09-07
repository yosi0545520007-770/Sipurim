/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_DEV_NO_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

