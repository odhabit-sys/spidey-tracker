"use client";

// The bottom hardware display is part of the persistent device frame.
// Pages set its text with <SetDeviceStatus />.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LedState = "off" | "ok" | "warn" | "err";

export interface DeviceStatusValue {
  text: string;
  led: LedState;
  blink?: boolean;
}

const DEFAULT_STATUS: DeviceStatusValue = { text: "SPIDEY • READY", led: "ok" };

const Ctx = createContext<{ status: DeviceStatusValue; setStatus: (s: DeviceStatusValue) => void } | null>(null);

export function DeviceStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  return <Ctx.Provider value={{ status, setStatus }}>{children}</Ctx.Provider>;
}

export function SetDeviceStatus({ text, led = "ok", blink }: { text: string; led?: LedState; blink?: boolean }) {
  const setStatus = useContext(Ctx)?.setStatus;
  useEffect(() => {
    setStatus?.({ text, led, blink });
  }, [setStatus, text, led, blink]);
  return null;
}

export function StatusDisplay() {
  const status = useContext(Ctx)?.status ?? DEFAULT_STATUS;
  return (
    <div className={`status-display${status.text.length > 17 ? " status-display--long" : ""}`} role="status" aria-live="polite">
      <span className={`status-display__led led-${status.led}${status.blink ? " is-blinking" : ""}`} />
      <span className="status-display__text">{status.text}</span>
    </div>
  );
}
