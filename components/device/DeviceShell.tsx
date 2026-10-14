import type { ReactNode } from "react";
import PixelSprite from "@/components/PixelSprite";
import { EYES, MASK, SPEAKER, SPIDER_ICON, SPIDEY } from "@/lib/sprites";
import { DeviceStatusProvider, StatusDisplay } from "./DeviceStatus";

/**
 * The fictional handheld tracker. Rendered once in the root layout so the
 * frame, badge and hardware persist while the display content changes.
 * Pages render into `.screen`; full-bleed content (the map) uses `.screen-fill`.
 * Hardware keys are decorative in V1.
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

          <span className="side-tag side-tag--1" aria-hidden>
            <PixelSprite sprite={SPIDER_ICON} scale={1} />
          </span>
          <span className="side-tag side-tag--2" aria-hidden>
            <PixelSprite sprite={SPIDER_ICON} scale={1} />
          </span>

          <div className="device__bottom">
            <span className="device__mini" aria-hidden>
              <PixelSprite sprite={SPIDEY} scale={3} />
            </span>
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
