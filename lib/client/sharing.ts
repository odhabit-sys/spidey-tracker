// Pure send-decision logic for the sharer, kept separate so it is easy to test.

import { haversineMeters } from "@/lib/distance";
import { HEARTBEAT_MS, MAX_FIX_AGE_MS, MOVE_THRESHOLD_M, SEND_MIN_INTERVAL_MS } from "@/lib/shared/tracking";

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number;
  /** When the device took the fix (ms since epoch). */
  timestamp: number;
}

export interface Sent {
  fix: Fix;
  sentAt: number;
}

export type SendDecision = "send" | "skip" | "too_old";

export function shouldSend(last: Sent | null, fix: Fix, now: number): SendDecision {
  if (now - fix.timestamp > MAX_FIX_AGE_MS) return "too_old";
  if (!last) return "send";
  if (fix.timestamp <= last.fix.timestamp) return "skip"; // same or older reading
  const elapsed = now - last.sentAt;
  if (elapsed < SEND_MIN_INTERVAL_MS) return "skip";
  if (haversineMeters(last.fix, fix) >= MOVE_THRESHOLD_M) return "send";
  if (fix.accuracy < last.fix.accuracy * 0.5) return "send";
  if (elapsed >= HEARTBEAT_MS) return "send";
  return "skip";
}

/** A reported fix time further than this from the device clock is not trusted. */
const MAX_TIMESTAMP_SKEW_MS = 5 * 60_000;

/**
 * Some browsers report `position.timestamp` on a different clock or epoch.
 * We request fresh fixes (maximumAge <= 5 s), so an implausible timestamp
 * means "bad clock", not "old fix": fall back to the time we received it.
 */
export function fixFromPosition(p: GeolocationPosition, receivedAt = Date.now()): Fix {
  const plausible = Number.isFinite(p.timestamp) && Math.abs(receivedAt - p.timestamp) <= MAX_TIMESTAMP_SKEW_MS;
  return {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracy: p.coords.accuracy,
    timestamp: plausible ? Math.min(p.timestamp, receivedAt) : receivedAt,
  };
}
