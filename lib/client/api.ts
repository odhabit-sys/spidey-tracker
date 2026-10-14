// Browser-side calls to our own API routes. Never throws: every failure is
// mapped to a short, user-facing pixel message.

import type { ApiErrorCode, CreatedSession, InviteInfo, JoinedSession, TrackerState } from "@/lib/shared/types";
import type { SpiderId } from "@/lib/shared/spiders";

export type ErrorCode = ApiErrorCode | "network";
export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string };

const MESSAGES: Record<ErrorCode, string> = {
  network: "CONNECTION LOST",
  not_found: "TRACKER NOT FOUND",
  expired: "TRACKER EXPIRED",
  invite_used: "INVITE ALREADY USED",
  spider_taken: "THAT SPIDER IS TAKEN",
  not_active: "WAITING FOR FRIEND",
  invalid: "CHECK YOUR INPUT",
  rate_limited: "TOO FAST, WAIT A MOMENT",
  server: "TRACKER NETWORK DOWN",
};

export async function apiFetch<T>(path: string, init?: RequestInit & { token?: string }): Promise<ApiResult<T>> {
  const { token, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "network", message: MESSAGES.network };
  }
  const body = await res.json().catch(() => null);
  if (res.ok && body) return { ok: true, data: body as T };
  const code: ErrorCode = body?.error in MESSAGES ? body.error : res.status >= 500 ? "server" : "invalid";
  return { ok: false, code, message: MESSAGES[code] };
}

export const createSession = (creatorName: string, spider: SpiderId) =>
  apiFetch<CreatedSession>("/api/sessions", { method: "POST", body: JSON.stringify({ creatorName, spider }) });

export const getTrackerState = (sessionId: string, token: string) =>
  apiFetch<TrackerState>(`/api/sessions/${sessionId}`, { token });

/** END: terminates the tracker for both participants. */
export const endTracker = (sessionId: string, token: string) =>
  apiFetch<{ ended: true }>(`/api/sessions/${sessionId}`, { method: "DELETE", token });

export const getInvite = (inviteToken: string) => apiFetch<InviteInfo>(`/api/join/${encodeURIComponent(inviteToken)}`);

export const joinInvite = (inviteToken: string, friendName: string, spider: SpiderId) =>
  apiFetch<JoinedSession>(`/api/join/${encodeURIComponent(inviteToken)}`, {
    method: "POST",
    body: JSON.stringify({ friendName, spider }),
  });

/** `ageMs` = how old the fix is on the phone's own clock; the server derives the capture time. */
export const postLocation = (token: string, fix: { latitude: number; longitude: number; accuracy: number; ageMs: number }) =>
  apiFetch<{ stored: true; expiresAt: string }>("/api/location", { method: "POST", token, body: JSON.stringify(fix) });

/** STOP SHARING: deletes only your own position. */
export const stopSharing = (token: string) => apiFetch<{ stopped: true }>("/api/location/stop", { method: "POST", token });

/** Fire-and-forget stop that survives the page closing (fetch keepalive). */
export function stopSharingOnUnload(token: string) {
  fetch("/api/location/stop", {
    method: "POST",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}
