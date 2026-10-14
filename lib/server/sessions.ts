import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import { hashToken } from "./tokens";
import { CHANGED_EVENT, trackerTopic, type Role, type ShareState, type TrackerStatus } from "@/lib/shared/types";

export interface SessionRow {
  id: string;
  creator_name: string;
  joiner_name: string | null;
  status: TrackerStatus;
  creator_share: ShareState;
  joiner_share: ShareState;
  channel_key: string;
  expires_at: string;
  creator_token_hash: string;
  joiner_token_hash: string | null;
}

const SESSION_COLUMNS =
  "id, creator_name, joiner_name, status, creator_share, joiner_share, channel_key, expires_at, creator_token_hash, joiner_token_hash";

export type Lookup<T> = { kind: "ok" } & T | { kind: "not_found" } | { kind: "expired" };

/**
 * Every lookup goes through here so expiry is enforced on every request.
 * An expired tracker is deleted on sight (locations cascade), so cleanup
 * never depends on the cron job alone.
 */
async function checkExpiry(row: SessionRow | null): Promise<Lookup<{ row: SessionRow }>> {
  if (!row) return { kind: "not_found" };
  if (Date.parse(row.expires_at) <= Date.now()) {
    await purgeSession(row);
    return { kind: "expired" };
  }
  return { kind: "ok", row };
}

/**
 * Resolve a participant token (creator or joiner) to its tracker and role.
 * A token only ever resolves to the one tracker it was issued for.
 */
export async function findParticipant(token: string, sessionId?: string): Promise<Lookup<{ row: SessionRow; role: Role }>> {
  const hash = hashToken(token); // hex digest: safe inside the filter string
  let query = supabaseAdmin()
    .from("sessions")
    .select(SESSION_COLUMNS)
    .or(`creator_token_hash.eq.${hash},joiner_token_hash.eq.${hash}`);
  if (sessionId) query = query.eq("id", sessionId);
  const { data, error } = await query.maybeSingle<SessionRow>();
  if (error) throw error;
  const found = await checkExpiry(data);
  if (found.kind !== "ok") return found;
  const role: Role = found.row.creator_token_hash === hash ? "creator" : "joiner";
  return { kind: "ok", row: found.row, role };
}

export async function findByInvite(inviteToken: string): Promise<Lookup<{ row: SessionRow }>> {
  const { data, error } = await supabaseAdmin()
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("invite_token_hash", hashToken(inviteToken))
    .maybeSingle<SessionRow>();
  if (error) throw error;
  return checkExpiry(data);
}

export const shareColumn = (role: Role) => (role === "creator" ? "creator_share" : "joiner_share");
export const otherRole = (role: Role): Role => (role === "creator" ? "joiner" : "creator");

/** Delete a tracker and (via cascade) both locations, then tell any listener. */
export async function purgeSession(row: Pick<SessionRow, "id" | "channel_key">) {
  const { error } = await supabaseAdmin().from("sessions").delete().eq("id", row.id);
  if (error) throw error;
  await notifyChanged(row.channel_key);
}

/**
 * Ping the tracker's secret Realtime topic. The payload deliberately carries
 * no session data or coordinates: participants re-fetch state through the
 * authenticated API. Best-effort: clients also poll as a fallback.
 */
export async function notifyChanged(channelKey: string) {
  const channel = supabaseAdmin().channel(trackerTopic(channelKey));
  try {
    const result = await channel.httpSend(CHANGED_EVENT, { at: Date.now() }, { timeout: 3000 });
    if (!result.success) console.warn(`[spidey] broadcast failed: ${result.status}`);
  } catch (err) {
    console.warn("[spidey] broadcast failed:", err instanceof Error ? err.message : err);
  } finally {
    void supabaseAdmin().removeChannel(channel);
  }
}
