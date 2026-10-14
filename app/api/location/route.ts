import { fail, ok, readJson, serverError } from "@/lib/server/http";
import { findParticipant, notifyChanged, shareColumn } from "@/lib/server/sessions";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { bearerToken } from "@/lib/server/tokens";

/** Reject updates closer together than this (the client throttles harder). */
const MIN_INTERVAL_MS = 2000;
/** A fix older than this is not "latest" any more; never store stale positions as fresh. */
const MAX_FIX_AGE_MS = 2 * 60 * 1000;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Either participant: upsert YOUR OWN single latest position. The role comes
 * from the token, never from the request, so nobody can write the other
 * person's row. Posting marks you as sharing (explicit START SHARING happened
 * on your device).
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("not_found");

  // The phone sends the fix's age on its own clock, never an absolute time, so
  // a phone with a wrong clock can't get every update rejected.
  const body = await readJson(req);
  const { latitude, longitude, accuracy, ageMs } = body ?? {};
  const now = Date.now();
  if (
    !isNum(latitude) || latitude < -90 || latitude > 90 ||
    !isNum(longitude) || longitude < -180 || longitude > 180 ||
    !isNum(accuracy) || accuracy < 0 || accuracy > 100_000 ||
    !isNum(ageMs) || ageMs < -5_000 || ageMs > MAX_FIX_AGE_MS
  ) {
    return fail("invalid");
  }
  const captured = now - Math.max(0, ageMs);

  try {
    const found = await findParticipant(token);
    if (found.kind !== "ok") return fail(found.kind);
    const { row, role } = found;
    // Nothing is stored until both people are in the tracker.
    if (row.status !== "active") return fail("not_active");

    const db = supabaseAdmin();
    const { data: last, error: readErr } = await db
      .from("locations")
      .select("updated_at")
      .eq("session_id", row.id)
      .eq("role", role)
      .maybeSingle();
    if (readErr) throw readErr;
    if (last && now - Date.parse(last.updated_at) < MIN_INTERVAL_MS) return fail("rate_limited");

    const { error } = await db.from("locations").upsert({
      session_id: row.id,
      role,
      latitude,
      longitude,
      accuracy,
      captured_at: new Date(captured).toISOString(),
      updated_at: new Date(now).toISOString(),
    });
    if (error) throw error;

    const column = shareColumn(role);
    if (row[column] !== "sharing") {
      const { error: shareErr } = await db.from("sessions").update({ [column]: "sharing" }).eq("id", row.id);
      if (shareErr) throw shareErr;
    }

    await notifyChanged(row.channel_key);
    return ok({ stored: true, expiresAt: row.expires_at });
  } catch (err) {
    return serverError("post location", err);
  }
}
