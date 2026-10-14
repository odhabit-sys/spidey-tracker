// A participant's capability lives only on their own device.
// Trackers are stored by session id; joiners are also indexed by invite token
// so reopening the invite link on the same device resumes the same tracker.

import type { ParticipantCredentials } from "@/lib/shared/types";

const sessionKey = (sessionId: string) => `spidey:session:${sessionId}`;
const inviteKey = (inviteToken: string) => `spidey:invite:${inviteToken}`;

/** Returns false when the browser blocks storage (e.g. Safari "Block All Cookies"). */
export function saveCredentials(creds: ParticipantCredentials, joinedViaInvite?: string): boolean {
  try {
    localStorage.setItem(sessionKey(creds.sessionId), JSON.stringify(creds));
    if (joinedViaInvite) localStorage.setItem(inviteKey(joinedViaInvite), creds.sessionId);
    return localStorage.getItem(sessionKey(creds.sessionId)) !== null;
  } catch {
    return false;
  }
}

export function loadCredentials(sessionId: string): ParticipantCredentials | null {
  try {
    const raw = localStorage.getItem(sessionKey(sessionId));
    return raw ? (JSON.parse(raw) as ParticipantCredentials) : null;
  } catch {
    return null;
  }
}

export function loadCredentialsForInvite(inviteToken: string): ParticipantCredentials | null {
  try {
    const sessionId = localStorage.getItem(inviteKey(inviteToken));
    return sessionId ? loadCredentials(sessionId) : null;
  } catch {
    return null;
  }
}

export function forgetCredentials(sessionId: string) {
  try {
    localStorage.removeItem(sessionKey(sessionId));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("spidey:invite:") && localStorage.getItem(k) === sessionId) localStorage.removeItem(k);
    }
  } catch {}
}
