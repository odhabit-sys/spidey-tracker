// Realtime is only a "something changed" doorbell. The anon client never
// reads tables (RLS denies everything); the creator re-fetches state through
// the authenticated API whenever the doorbell rings.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CHANGED_EVENT, trackerTopic } from "@/lib/shared/types";

let client: SupabaseClient | null = null;

function browserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function subscribeToTracker(
  channelKey: string,
  onChange: () => void,
  onConnection: (connected: boolean) => void,
): () => void {
  const sb = browserClient();
  if (!sb) {
    onConnection(false);
    return () => {};
  }
  const channel = sb
    .channel(trackerTopic(channelKey))
    .on("broadcast", { event: CHANGED_EVENT }, onChange)
    .subscribe((status) => onConnection(status === "SUBSCRIBED"));
  return () => {
    sb.removeChannel(channel);
  };
}
