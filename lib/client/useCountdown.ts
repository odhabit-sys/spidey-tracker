"use client";

import { useEffect, useState } from "react";

/**
 * Current time on the server's clock, ticking every second. Corrects device
 * clock skew using the server time from the last API response.
 */
export function useServerNow(serverTime: string | null) {
  const [now, setNow] = useState(() => Date.now());
  const [skew, setSkew] = useState(0);

  useEffect(() => {
    if (serverTime) setSkew(Date.parse(serverTime) - Date.now());
  }, [serverTime]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return now + skew;
}

/** Seconds left until `expiresAt`, on the server's clock. */
export function useCountdown(expiresAt: string | null, serverTime: string | null) {
  const now = useServerNow(serverTime);
  if (!expiresAt) return { secondsLeft: null, label: "--:--", expired: false };
  const secondsLeft = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return { secondsLeft, label: `${mm}:${ss}`, expired: secondsLeft === 0 };
}
