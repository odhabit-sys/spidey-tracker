import { fail, ok, serverError } from "@/lib/server/http";
import { findParticipant, notifyChanged, shareColumn } from "@/lib/server/sessions";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { bearerToken } from "@/lib/server/tokens";

/**
 * Either participant: STOP SHARING. Deletes only YOUR stored position. Under
 * strict reciprocity you also stop receiving the other person's location
 * until you start sharing again. The tracker itself keeps running (END ends it).
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("not_found");

  try {
    const found = await findParticipant(token);
    if (found.kind === "expired") return ok({ stopped: true }); // already deleted
    if (found.kind !== "ok") return fail(found.kind);
    const { row, role } = found;

    const db = supabaseAdmin();
    const { error: delErr } = await db.from("locations").delete().eq("session_id", row.id).eq("role", role);
    if (delErr) throw delErr;
    const column = shareColumn(role);
    if (row[column] === "sharing") {
      const { error } = await db.from("sessions").update({ [column]: "stopped" }).eq("id", row.id);
      if (error) throw error;
    }

    await notifyChanged(row.channel_key);
    return ok({ stopped: true });
  } catch (err) {
    return serverError("stop sharing", err);
  }
}
