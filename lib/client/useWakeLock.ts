"use client";

import { useEffect } from "react";

/**
 * Ask the browser to keep the screen on while `active` (Screen Wake Lock API,
 * iOS Safari 16.4+). Best-effort: silently does nothing where unsupported.
 * The lock is dropped whenever the page is hidden, so re-acquire on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release();
        else lock = next;
      } catch {
        // Denied (e.g. low battery mode): nothing to do.
      }
    };
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}
