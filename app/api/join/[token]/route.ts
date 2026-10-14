import { fail, ok, readJson, serverError } from "@/lib/server/http";
import { findByInvite, notifyChanged } from "@/lib/server/sessions";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { hashToken, looksLikeToken, newToken } from "@/lib/server/tokens";
import { cleanName, isValidName } from "@/lib/names";
import type { InviteInfo, JoinedSession } from "@/lib/shared/types";

type Ctx = { params: Promise<{ token: string }> };

/** Public invite lookup: only the creator's display name and expiry, nothing else. */
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  if (!looksLikeToken(token)) return fail("not_found");

  try {
    const found = await findByInvite(token);
    if (found.kind !== "ok") return fail(found.kind);
    if (found.row.joiner_token_hash || found.row.status !== "waiting") return fail("invite_used");
    return ok<InviteInfo>({
      creatorName: found.row.creator_name,
      expiresAt: found.row.expires_at,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return serverError("lookup invite", err);
  }
}

/**
 * Accept the invite after explicit consent (the client calls this only after
 * the joiner's first real GPS fix). Single use: the claim is one conditional
 * UPDATE, so two phones racing on the same link cannot both win. Returns the
 * joiner's capability exactly once.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  if (!looksLikeToken(token)) return fail("not_found");
  const body = await readJson(req);
  const joinerName = typeof body?.friendName === "string" ? cleanName(body.friendName).trim() : "";
  if (!isValidName(joinerName)) return fail("invalid");

  try {
    const found = await findByInvite(token);
    if (found.kind !== "ok") return fail(found.kind);

    const joinerToken = newToken();
    const { data, error } = await supabaseAdmin()
      .from("sessions")
      .update({ joiner_token_hash: hashToken(joinerToken), joiner_name: joinerName, status: "active" })
      .eq("id", found.row.id)
      .eq("status", "waiting")
      .is("joiner_token_hash", null)
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("invite_used");

    await notifyChanged(found.row.channel_key);
    return ok<JoinedSession>(
      {
        sessionId: found.row.id,
        role: "joiner",
        token: joinerToken,
        channelKey: found.row.channel_key,
        expiresAt: found.row.expires_at,
        creatorName: found.row.creator_name,
      },
      201,
    );
  } catch (err) {
    return serverError("join", err);
  }
}
