import { INSIGNIA_DOTS, INSIGNIA_H, INSIGNIA_W } from "@/lib/insignia";

/** Huge, barely-visible dot-matrix spider outline behind the display content. */
export default function SpiderInsignia() {
  return (
    <svg className="insignia" viewBox={`0 0 ${INSIGNIA_W} ${INSIGNIA_H}`} aria-hidden>
      {INSIGNIA_DOTS.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x + 0.2} y={y + 0.2} width={0.6} height={0.6} />
      ))}
    </svg>
  );
}
