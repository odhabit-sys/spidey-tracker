import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so it must never reach the browser:
// `server-only` makes any client-side import a build error.

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment is not configured");
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
