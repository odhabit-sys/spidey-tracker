// Small pixel web-radar. Purely presentational: the dot sits at the real
// bearing from you to the other person (from coordinates already on this
// device), at a log-scaled radius. North is up; no compass is used.

const SIZE = 41; // grid cells (odd, so there is a true centre pixel)
const C = 20;
const RINGS = [6, 12, 18];

function octagon(r: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return `${Math.round(C + r * Math.sin(a))},${Math.round(C - r * Math.cos(a))}`;
  }).join(" ");
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function WebRadar({ bearing, distanceM }: { bearing: number | null; distanceM: number | null }) {
  let dot: { x: number; y: number } | null = null;
  if (bearing !== null && distanceM !== null) {
    // 10 m -> centre-ish, 100 m, 1 km, 10 km -> rim.
    const t = Math.min(1, Math.max(0, Math.log10(Math.max(distanceM, 10) / 10) / 3));
    const r = 3 + 15 * t;
    const a = (bearing * Math.PI) / 180;
    dot = { x: Math.round(C + r * Math.sin(a)), y: Math.round(C - r * Math.cos(a)) };
  }
  const heading = bearing === null ? null : COMPASS[Math.round(bearing / 45) % 8];

  return (
    <div className="radar" aria-label={heading ? `Spidey is ${heading} of you` : "Radar: your position unknown"} role="img">
      <span className="radar__n" aria-hidden>
        N
      </span>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE * 2} height={SIZE * 2} shapeRendering="crispEdges" aria-hidden>
        <polygon points={octagon(19)} className="radar__face" />
        {RINGS.map((r) => (
          <polygon key={r} points={octagon(r)} className="radar__ring" />
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <line key={i} x1={C} y1={C} x2={Math.round(C + 19 * Math.sin(a))} y2={Math.round(C - 19 * Math.cos(a))} className="radar__spoke" />;
        })}
        <g className="radar__sweep">
          <line x1={C} y1={C} x2={C} y2={2} />
        </g>
        <rect x={C - 1} y={C - 1} width={3} height={3} className="radar__me" />
        {dot && <rect x={dot.x - 1} y={dot.y - 1} width={3} height={3} className="radar__dot" />}
      </svg>
      <span className="radar__read" aria-hidden>
        {heading ? `BRG ${String(Math.round(bearing!)).padStart(3, "0")}° ${heading}` : "BRG ---"}
      </span>
    </div>
  );
}
