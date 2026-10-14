// Timing rules shared by the sharer (sending) and the creator (display).

/** Never send more often than this. */
export const SEND_MIN_INTERVAL_MS = 5_000;
/** Movement that justifies an immediate update. */
export const MOVE_THRESHOLD_M = 10;
/**
 * While stationary, take a fresh fix this often so the creator stays LIVE.
 * Fresh fixes can take several seconds (and up to FRESH_FIX_TIMEOUT_MS), so
 * this leaves headroom inside the 30 s LIVE window.
 */
export const HEARTBEAT_MS = 10_000;
export const FRESH_FIX_TIMEOUT_MS = 10_000;
/**
 * Nothing delivered for this long while sharing: restart the location watch.
 * Desktop Safari can stop producing fixes for a stationary device; a new
 * watch with maximumAge 0 forces a fresh reading. Keeps gaps under LIVE_MS.
 */
export const WATCH_RESTART_MS = 20_000;
/** Fixes older than this are never sent (the server rejects > 2 min too). */
export const MAX_FIX_AGE_MS = 60_000;

/** Creator-side freshness of the friend's last update. */
export const LIVE_MS = 30_000;
export const STALE_MS = 2 * 60_000;

export type Freshness = "live" | "stale" | "offline";

export function freshness(ageMs: number): Freshness {
  if (ageMs <= LIVE_MS) return "live";
  if (ageMs <= STALE_MS) return "stale";
  return "offline";
}

export function formatAgo(ageMs: number): string {
  const s = Math.max(0, Math.round(ageMs / 1000));
  if (s < 60) return `${s} SEC AGO`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} MIN AGO` : "OVER 1 HR AGO";
}

/**
 * Presentation-only proximity alert, derived from the already-computed
 * straight-line distance (no tracking changes). Unknown distance = LOCATED.
 */
export type Proximity = "located" | "approaching" | "vicinity";
export const APPROACHING_M = 400;
export const VICINITY_M = 75;

export function proximity(distanceM: number | null): Proximity {
  if (distanceM === null) return "located";
  if (distanceM <= VICINITY_M) return "vicinity";
  if (distanceM <= APPROACHING_M) return "approaching";
  return "located";
}

export const PROXIMITY_LABEL: Record<Proximity, string> = {
  located: "SPIDEY LOCATED",
  approaching: "TARGET APPROACHING",
  vicinity: "SPIDEY IN YOUR VICINITY",
};
