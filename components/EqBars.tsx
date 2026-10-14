const HEIGHTS = [2, 4, 5, 2, 4, 3, 5, 2, 3];

/** Decorative signal bars. `live` makes them pulse while searching. */
export default function EqBars({ live = false }: { live?: boolean }) {
  return (
    <div className={`eq${live ? " eq--live" : ""}`} aria-hidden>
      {HEIGHTS.map((h, i) => (
        <span key={i} style={{ height: h * 3, animationDelay: `${(i % 4) * 0.15}s` }} />
      ))}
    </div>
  );
}
