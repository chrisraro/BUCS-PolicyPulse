import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS entirely. Never import this
 * from client code (the `server-only` import above throws a build error if
 * you try). `SUPABASE_SECRET_KEY` is read lazily so that modules importing
 * this file don't crash in environments where the key hasn't been
 * provisioned yet (e.g. local dev before ingestion/chat is configured) —
 * the error only surfaces when `createAdminClient()` is actually called.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set — add it to .env.local (Supabase Dashboard -> Project Settings -> API Keys -> create secret key)',
    )
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
