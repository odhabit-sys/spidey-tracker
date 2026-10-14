import PixelSprite from "./PixelSprite";
import { HANGING } from "@/lib/sprites";

const SCALE = 3;

/**
 * Upside-down mascot on a thin web line that drops from the badge's mask.
 * The line stretches so Spidey hangs just above the console text.
 */
export default function HangingSpidey() {
  // Shift the sprite so the web line meets the attachment column.
  const offset = (HANGING.rows[0].length / 2 - (HANGING.anchorX + 0.5)) * SCALE;
  return (
    <div className="hanging" aria-hidden>
      <div className="hanging__line" />
      <div className="hanging__body" style={{ transform: `translateX(${offset}px)` }}>
        <PixelSprite sprite={HANGING} scale={SCALE} />
      </div>
    </div>
  );
}
