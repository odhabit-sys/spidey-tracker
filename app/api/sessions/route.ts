import { fail, ok, readJson, serverError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { hashToken, newToken } from "@/lib/server/tokens";
import { cleanName, isValidName } from "@/lib/names";
import type { CreatedSession } from "@/lib/shared/types";

/**
 * Create a tracker. Returns the creator's capabilities exactly once.
 * Creating a tracker never shares the creator's location: that requires an
 * explicit START SHARING later.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  const name = typeof body?.creatorName === "string" ? cleanName(body.creatorName).trim() : "";
  if (!isValidName(name)) return fail("invalid");

  const creatorToken = newToken();
  const inviteToken = newToken();
  const channelKey = newToken();

  try {
    const { data, error } = await supabaseAdmin()
      .from("sessions")
      .insert({
        creator_name: name,
        creator_token_hash: hashToken(creatorToken),
        invite_token_hash: hashToken(inviteToken),
        channel_key: channelKey,
      })
      .select("id, expires_at")
      .single<{ id: string; expires_at: string }>();
    if (error) throw error;

    return ok<CreatedSession>(
      { sessionId: data.id, role: "creator", token: creatorToken, inviteToken, channelKey, expiresAt: data.expires_at },
      201,
    );
  } catch (err) {
    return serverError("create session", err);
  }
}
