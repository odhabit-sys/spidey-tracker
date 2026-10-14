import { fail, ok, serverError, UUID_RE } from "@/lib/server/http";
import { findParticipant, otherRole, purgeSession } from "@/lib/server/sessions";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { bearerToken } from "@/lib/server/tokens";
import type { PeerLocation, TrackerState } from "@/lib/shared/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Either participant: tracker state. The other person's location is included
 * ONLY while both of you are sharing (strict reciprocity). Your own location
 * is never returned.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const token = bearerToken(req);
  if (!UUID_RE.test(id) || !token) return fail("not_found");

  try {
    const found = await findParticipant(token, id);
    if (found.kind !== "ok") return fail(found.kind);
    const { row: s, role } = found;
    const peer = otherRole(role);
    const myShare = role === "creator" ? s.creator_share : s.joiner_share;
    const peerShare = peer === "creator" ? s.creator_share : s.joiner_share;

    let location: PeerLocation | null = null;
    if (s.status === "active" && myShare === "sharing" && peerShare === "sharing") {
      const { data, error } = await supabaseAdmin()
        .from("locations")
        .select("latitude, longitude, accuracy, captured_at, updated_at")
        .eq("session_id", s.id)
        .eq("role", peer)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        location = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          capturedAt: data.captured_at,
          updatedAt: data.updated_at,
        };
      }
    }

    return ok<TrackerState>({
      sessionId: s.id,
      role,
      status: s.status,
      expiresAt: s.expires_at,
      serverTime: new Date().toISOString(),
      me: { name: role === "creator" ? s.creator_name : (s.joiner_name ?? ""), share: myShare },
      peer: { name: peer === "creator" ? s.creator_name : s.joiner_name, share: peerShare, location },
    });
  } catch (err) {
    return serverError("read session", err);
  }
}

/** Either participant: END the tracker for both. Deletes it and both locations. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const token = bearerToken(req);
  if (!UUID_RE.test(id) || !token) return fail("not_found");

  try {
    const found = await findParticipant(token, id);
    if (found.kind === "expired") return ok({ ended: true }); // already gone
    if (found.kind !== "ok") return fail(found.kind);
    await purgeSession(found.row);
    return ok({ ended: true });
  } catch (err) {
    return serverError("end session", err);
  }
}
