"use client";

// Publishes THIS device's location to a tracker. Used by both participants.
//
// Consent guarantees:
//   1. Nothing touches navigator.geolocation until start() is called from a
//      START SHARING press.
//   2. A joiner's invite is accepted (acquireToken) only after the first REAL
//      fix arrives, so a denied permission or dead GPS never burns the invite.
//   3. Only genuine device fixes are sent. Stationary devices get a fresh
//      reading on a heartbeat; old readings are never re-sent as new.
//   4. Nothing is uploaded while the tracker is still waiting for the friend
//      to join (`canSend` false / server says not_active).

import { useCallback, useEffect, useRef, useState } from "react";
import { postLocation, stopSharing, stopSharingOnUnload } from "@/lib/client/api";
import { fixFromPosition, shouldSend, type Fix, type Sent } from "@/lib/client/sharing";
import { FRESH_FIX_TIMEOUT_MS, HEARTBEAT_MS, WATCH_RESTART_MS } from "@/lib/shared/tracking";

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 };
/** Heartbeat readings must be brand new, never a cached position. */
const FRESH_FIX_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: FRESH_FIX_TIMEOUT_MS };
/** A restarted watch must not be satisfied by a cached position. */
const RESTART_WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 };
/** Nothing delivered for this long while sharing = visibly stalled (the other person would see STALE). */
const STALL_MS = 30_000;

export type FailReason =
  | "denied" // user/browser refused location access
  | "unsupported" // no geolocation or not a secure (https) context
  | "expired"
  | "ended" // tracker no longer exists (someone pressed END)
  | "invite_used"
  | "spider_taken" // joiner picked the creator's Spider (server refused; nothing shared)
  | "network" // could not reach the server to accept the invite
  | "server";

export type PublisherPhase = "idle" | "locating" | "sharing" | "stopping";

export interface LiveInfo {
  gps: "searching" | "ok" | "lost";
  net: "ok" | "offline";
  accuracy: number | null;
  lastSentAt: number | null;
  /** Sharing, but nothing delivered for longer than STALL_MS. */
  stalled: boolean;
}

/** Counters for the dev-only diagnostics line. Never contains coordinates. */
export interface Diagnostics {
  fixes: number;
  sent: number;
  skipped: number;
  tooOld: number;
  rejected: number;
  restarts: number;
  lastSkewMs: number | null;
}

export type AcquireResult = { ok: true; token: string; persisted: boolean } | { ok: false; reason: FailReason };

interface Options {
  /** Known capability (creator, or a joiner resuming). Null until a joiner accepts the invite. */
  token: string | null;
  /** Joiner only: accept the invite once the first real fix exists. */
  acquireToken?: () => Promise<AcquireResult>;
  /** False while the tracker waits for the friend to join: watch, but don't upload. */
  canSend: boolean;
  /** False when this browser can't store the token: closing the page then stops sharing. */
  persisted: boolean;
}

const INITIAL_INFO: LiveInfo = { gps: "searching", net: "ok", accuracy: null, lastSentAt: null, stalled: false };
const INITIAL_DIAG: Diagnostics = { fixes: 0, sent: 0, skipped: 0, tooOld: 0, rejected: 0, restarts: 0, lastSkewMs: null };

export function useLocationPublisher({ token, acquireToken, canSend, persisted }: Options) {
  const [phase, setPhase] = useState<PublisherPhase>("idle");
  const [failure, setFailure] = useState<FailReason | null>(null);
  const [info, setInfo] = useState<LiveInfo>(INITIAL_INFO);
  const [diag, setDiag] = useState<Diagnostics>(INITIAL_DIAG);
  /** Latest real fix on this device: drawn as YOUR cyan marker, used for distance. Never shown to others except via upload. */
  const [myFix, setMyFix] = useState<Fix | null>(null);
  /** Last STOP couldn't reach the server (position may still be stored until expiry). */
  const [stopUnconfirmed, setStopUnconfirmed] = useState(false);

  const tokenRef = useRef(token);
  tokenRef.current = token ?? tokenRef.current;
  const acquireRef = useRef(acquireToken);
  acquireRef.current = acquireToken;
  const canSendRef = useRef(canSend);
  canSendRef.current = canSend;
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;

  const watchId = useRef<number | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSent = useRef<Sent | null>(null);
  const pending = useRef<Fix | null>(null);
  const latestFix = useRef<Fix | null>(null);
  const inFlight = useRef(false);
  const acquiring = useRef(false);
  const active = useRef(false); // true while watching
  const freshFixPending = useRef(false);
  const sharingSince = useRef<number | null>(null);
  const lastWatchRestart = useRef(0);

  const bump = useCallback((k: keyof Omit<Diagnostics, "lastSkewMs">) => setDiag((d) => ({ ...d, [k]: d[k] + 1 })), []);

  const teardown = useCallback(() => {
    active.current = false;
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
    pending.current = null;
    freshFixPending.current = false;
  }, []);

  const fail = useCallback(
    (reason: FailReason) => {
      teardown();
      setFailure(reason);
      setPhase("idle");
    },
    [teardown],
  );

  const send = useCallback(
    async (fix: Fix) => {
      const t = tokenRef.current;
      if (!t || !active.current || !canSendRef.current) return;
      if (inFlight.current) {
        pending.current = fix;
        return;
      }
      const decision = shouldSend(lastSent.current, fix, Date.now());
      if (decision !== "send") {
        bump(decision === "too_old" ? "tooOld" : "skipped");
        return;
      }

      inFlight.current = true;
      const result = await postLocation(t, {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        ageMs: Math.max(0, Date.now() - fix.timestamp),
      });
      inFlight.current = false;

      if (result.ok) {
        bump("sent");
        lastSent.current = { fix, sentAt: Date.now() };
        setInfo((i) => ({ ...i, net: "ok", lastSentAt: Date.now(), stalled: false }));
      } else if (result.code === "network" || result.code === "server") {
        setInfo((i) => ({ ...i, net: "offline" })); // heartbeat retries with a fresh fix
      } else if (result.code === "expired") {
        return fail("expired");
      } else if (result.code === "not_found") {
        return fail("ended");
      } else if (result.code === "invalid") {
        bump("rejected");
      }
      // not_active (friend hasn't joined yet) / rate_limited: drop it; the next fix follows.

      const next = pending.current;
      pending.current = null;
      if (next) void send(next);
    },
    [bump, fail],
  );

  const acquire = useCallback(
    async (fix: Fix) => {
      const doAcquire = acquireRef.current;
      if (!doAcquire) return;
      acquiring.current = true;
      const result = await doAcquire();
      acquiring.current = false;
      if (!result.ok) return fail(result.reason);
      tokenRef.current = result.token;
      persistedRef.current = result.persisted;
      sharingSince.current = Date.now();
      setPhase("sharing");
      void send(fix);
    },
    [fail, send],
  );

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      if (!active.current) return;
      const receivedAt = Date.now();
      const fix = fixFromPosition(position, receivedAt);
      latestFix.current = fix;
      setMyFix(fix);
      setDiag((d) => ({ ...d, fixes: d.fixes + 1, lastSkewMs: receivedAt - position.timestamp }));
      setInfo((i) => ({ ...i, gps: "ok", accuracy: fix.accuracy }));
      if (tokenRef.current) {
        setPhase((p) => (p === "locating" ? "sharing" : p));
        void send(fix);
      } else if (!acquiring.current) {
        void acquire(fix);
      }
    },
    [acquire, send],
  );

  const onError = useCallback(
    (err: GeolocationPositionError) => {
      if (!active.current) return;
      if (err.code === err.PERMISSION_DENIED) {
        const t = tokenRef.current;
        fail("denied");
        // Access was revoked mid-share: also delete the stored position.
        if (t) void stopSharing(t);
        return;
      }
      // POSITION_UNAVAILABLE / TIMEOUT: keep watching, it usually recovers.
      setInfo((i) => ({ ...i, gps: "lost" }));
    },
    [fail],
  );

  /**
   * One brand-new reading, at most one request outstanding. A heartbeat that
   * times out just means "no new fix yet": the watcher keeps running and is
   * the source of truth for GPS-lost, so only a permission error matters here.
   */
  const requestFreshFix = useCallback(() => {
    if (freshFixPending.current) return;
    freshFixPending.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        freshFixPending.current = false;
        onPosition(position);
      },
      (err) => {
        freshFixPending.current = false;
        if (err.code === err.PERMISSION_DENIED) onError(err);
      },
      FRESH_FIX_OPTIONS,
    );
  }, [onError, onPosition]);

  /** START SHARING (explicit consent press). Also used to resume after a reload. */
  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) {
      setFailure("unsupported");
      return;
    }
    teardown();
    active.current = true;
    lastSent.current = null;
    lastWatchRestart.current = 0;
    sharingSince.current = tokenRef.current ? Date.now() : null;
    setFailure(null);
    setStopUnconfirmed(false);
    setInfo(INITIAL_INFO);
    setPhase("locating");
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTIONS);

    heartbeat.current = setInterval(() => {
      if (!active.current || !tokenRef.current || !canSendRef.current) return;
      const now = Date.now();
      const lastDelivery = lastSent.current?.sentAt ?? sharingSince.current ?? now;
      const stalled = now - lastDelivery > STALL_MS;
      setInfo((i) => (i.stalled === stalled ? i : { ...i, stalled }));

      // Quiet for too long: replace the watch to force a fresh reading
      // (desktop Safari can stop producing fixes for a stationary device).
      if (now - lastDelivery > WATCH_RESTART_MS && now - lastWatchRestart.current > WATCH_RESTART_MS) {
        lastWatchRestart.current = now;
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = navigator.geolocation.watchPosition(onPosition, onError, RESTART_WATCH_OPTIONS);
        bump("restarts");
      }
      if (inFlight.current) return;
      const since = now - (lastSent.current?.sentAt ?? 0);
      if (since >= HEARTBEAT_MS) requestFreshFix();
    }, 2_000);
  }, [bump, onError, onPosition, requestFreshFix, teardown]);

  /** STOP SHARING: GPS off immediately, then delete this device's stored position. */
  const stop = useCallback(async () => {
    teardown();
    setMyFix(null);
    const t = tokenRef.current;
    if (!t) {
      setPhase("idle");
      return;
    }
    setPhase("stopping");
    const result = await stopSharing(t);
    const confirmed = result.ok || result.code === "not_found" || result.code === "expired";
    setStopUnconfirmed(!confirmed);
    setPhase("idle");
  }, [teardown]);

  /** Tracker ended/expired elsewhere: stop the GPS, nothing to delete. */
  const halt = useCallback(() => {
    teardown();
    setMyFix(null);
    setPhase("idle");
  }, [teardown]);

  // Friend just joined: send a fresh reading right away instead of waiting.
  useEffect(() => {
    if (canSend && active.current && tokenRef.current) {
      const fix = latestFix.current;
      if (fix) void send(fix);
      requestFreshFix();
    }
  }, [canSend, requestFreshFix, send]);

  // Retry immediately when the connection comes back.
  useEffect(() => {
    const onOnline = () => {
      if (active.current && tokenRef.current) requestFreshFix();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [requestFreshFix]);

  // If this browser couldn't store the token, a reload or closed tab could
  // never resume or stop sharing. In that case closing the page stops it.
  useEffect(() => {
    const onPageHide = () => {
      const t = tokenRef.current;
      if (t && active.current && !persistedRef.current) stopSharingOnUnload(t);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  // Leaving the page stops the GPS (the other person will see STALE, then OFFLINE).
  useEffect(() => teardown, [teardown]);

  return { phase, failure, info, diag, myFix, stopUnconfirmed, start, stop, halt, clearFailure: () => setFailure(null) };
}

export type Publisher = ReturnType<typeof useLocationPublisher>;
