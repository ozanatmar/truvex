import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy clients — not created at import time so Next.js build doesn't
// fail when env vars aren't present during page-data collection.

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function lazyProxy(getter: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const client = getter();
      const value = client[prop as keyof SupabaseClient];
      return typeof value === 'function' ? (value as Function).bind(client) : value;
    },
  });
}

export const supabase: SupabaseClient = lazyProxy(() => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
});

export const supabaseAdmin: SupabaseClient = lazyProxy(() => {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
});
