import type { ReactNode } from "react";
import EqBars from "@/components/EqBars";
import HangingSpidey from "@/components/HangingSpidey";
import SpiderInsignia from "@/components/SpiderInsignia";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";

/**
 * The standard (non-map) tracker display: faint insignia, hanging Spidey and a
 * compact console. `compact` shortens the web line for denser readouts.
 */
export default function Display({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <>
      <SpiderInsignia />
      <div className={`home${compact ? " home--compact" : ""}`}>
        <HangingSpidey />
        <div className="console">{children}</div>
      </div>
    </>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <>
      <SetDeviceStatus text={`${text}...`} led="warn" blink />
      <p className="console__headline">
        {text}
        <span className="cursor">_</span>
      </p>
      <EqBars live />
    </>
  );
}
