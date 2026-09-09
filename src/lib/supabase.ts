import { createClient, type SupportedStorage } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

import { readPublicEnv } from './env';

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

let singleton: SupabaseClient | undefined;

export function createSupabaseClient(
  storage?: SupportedStorage,
): SupabaseClient {
  const env = readPublicEnv();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error('Supabase publishable key is missing.');
  }

  return createClient<Database>(env.VITE_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      ...(storage ? { storage } : {}),
    },
  });
}

export function getSupabase(): SupabaseClient {
  singleton ??= createSupabaseClient();
  return singleton;
}

/** Postgres RPCs that `returns jsonb` come back as a bare object; those that
 * `returns table (...)` come back wrapped in a single-element array. */
export function unwrapRpcResult(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}
