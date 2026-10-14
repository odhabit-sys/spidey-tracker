"use client";

import { useEffect, useState } from "react";

/**
 * END ends the tracker for BOTH people, so it takes two taps:
 * the first arms it ("SURE?"), the second within 3 s confirms.
 */
export default function EndButton({ onEnd, ending, variant }: { onEnd: () => void; ending: boolean; variant: "text" | "key" }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const label = ending ? "ENDING..." : armed ? (variant === "key" ? "SURE?" : "TAP AGAIN TO END FOR BOTH") : variant === "key" ? "END" : "END TRACKER";
  const onClick = () => (armed ? onEnd() : setArmed(true));

  return variant === "key" ? (
    <button type="button" className={`hud-key hud-key--end${armed ? " is-armed" : ""}`} onClick={onClick} disabled={ending}>
      {label}
    </button>
  ) : (
    <button type="button" className={`text-btn${armed ? " text-btn--armed" : ""}`} onClick={onClick} disabled={ending}>
      {label}
    </button>
  );
}
