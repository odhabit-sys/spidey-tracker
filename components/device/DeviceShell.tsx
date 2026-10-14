import type { ReactNode } from "react";
import PixelSprite from "@/components/PixelSprite";
import { EYES, MASK, SPEAKER, SPIDER_ICON } from "@/lib/sprites";
import { DeviceStatusProvider, SideKeys, StatusDisplay, StatusPortrait, TelemetryModules } from "./DeviceStatus";

/**
 * The fictional handheld tracker. Rendered once in the root layout so the
 * frame, badge and hardware persist while the display content changes.
 * Pages render into `.screen`; full-bleed content (the map) uses `.screen-fill`.
 * The corner keys are decorative; the left side keys become participant focus
 * buttons on the live map. Small telemetry modules reflect real state.
 */
export default function DeviceShell({ children }: { children: ReactNode }) {
  return (
    <DeviceStatusProvider>
      <div className="device">
        <div className="device__body">
          <main className="screen">{children}</main>

          <span className="hw-key hw-key--mask" aria-hidden>
            <PixelSprite sprite={EYES} scale={2} />
          </span>
          <span className="hw-key hw-key--spider" aria-hidden>
            <PixelSprite sprite={SPIDER_ICON} scale={2} />
          </span>

          <div className="badge">
            <span className="badge__word">SPIDEY</span>
            <PixelSprite sprite={MASK} scale={1.75} className="badge__mask" title="Spidey mask" />
            <span className="badge__word">TRACKER</span>
          </div>

          <SideKeys />
          <TelemetryModules />

          <div className="device__bottom">
            <StatusPortrait />
            <StatusDisplay />
            <span className="hw-key hw-key--speaker" aria-hidden>
              <PixelSprite sprite={SPEAKER} scale={2} />
            </span>
          </div>
        </div>
      </div>
    </DeviceStatusProvider>
  );
}
