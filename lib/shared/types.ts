// Types shared by API routes and the browser.

export type ApiErrorCode =
  | "invalid"
  | "not_found"
  | "invite_used"
  | "not_active" // tracker still waiting for the invite to be accepted
  | "expired"
  | "rate_limited"
  | "server";

export type Role = "creator" | "joiner";
export type TrackerStatus = "waiting" | "active";
/** Per-participant sharing: never started, sharing now, or stopped. */
export type ShareState = "idle" | "sharing" | "stopped";

export interface PeerLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  updatedAt: string;
}

/** What a participant's device stores to act in a tracker. */
export interface ParticipantCredentials {
  sessionId: string;
  role: Role;
  token: string;
  channelKey: string;
  expiresAt: string;
  /** Creator only: the invite token, so the invite link can be shown again. */
  inviteToken?: string;
}

/** POST /api/sessions */
export interface CreatedSession extends ParticipantCredentials {
  role: "creator";
  inviteToken: string;
}

/**
 * GET /api/sessions/[id] (either participant).
 * `peer.location` is present only while BOTH participants are sharing
 * (strict reciprocity, enforced server-side). Your own location is never
 * returned: your device already has it.
 */
export interface TrackerState {
  sessionId: string;
  role: Role;
  status: TrackerStatus;
  expiresAt: string;
  serverTime: string;
  me: { name: string; share: ShareState };
  peer: { name: string | null; share: ShareState; location: PeerLocation | null };
}

/** GET /api/join/[token] */
export interface InviteInfo {
  creatorName: string;
  expiresAt: string;
  serverTime: string;
}

/** POST /api/join/[token] */
export interface JoinedSession extends ParticipantCredentials {
  role: "joiner";
  creatorName: string;
}

/** Realtime topic for a tracker. Broadcasts carry no data, only "re-fetch". */
export const trackerTopic = (channelKey: string) => `tracker:${channelKey}`;
export const CHANGED_EVENT = "changed";

export const SESSION_TTL_MS = 60 * 60 * 1000;
