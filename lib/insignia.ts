// Original spider insignia for the display watermark. Thick shapes (body +
// curved legs) are rasterised onto a fine grid, then only their edge cells are
// kept, giving a hollow dot-matrix outline with double-line legs.

export const INSIGNIA_W = 90;
export const INSIGNIA_H = 124;

type Pt = [number, number];

// Left-side legs as quadratic curves: [start, control, end]. Mirrored for the right.
const LEGS: [Pt, Pt, Pt][] = [
  [[41, 36], [20, 30], [24, 3]], // front pair hooks up to the top
  [[40, 44], [12, 44], [6, 22]], // second pair sweeps out and up
  [[40, 62], [10, 62], [6, 100]], // third pair sweeps out and down
  [[42, 70], [24, 86], [24, 121]], // rear pair drops to the bottom
];
const LEG_RADIUS = 2.4;

function build(): Pt[] {
  const filled = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const disc = (cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) filled.add(key(x, y));
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) filled.add(key(x, y));
  };
  const curve = ([a, c, b]: [Pt, Pt, Pt], taper: boolean) => {
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0];
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1];
      disc(x, y, taper ? LEG_RADIUS * (1 - t * 0.45) : LEG_RADIUS);
    }
  };

  const cx = (INSIGNIA_W - 1) / 2;
  ellipse(cx, 37, 5, 6.5); // head
  ellipse(cx, 62, 6.5, 17); // body
  for (const leg of LEGS) {
    curve(leg, true);
    curve(leg.map(([x, y]) => [INSIGNIA_W - 1 - x, y]) as [Pt, Pt, Pt], true);
  }

  // Keep only the outline: filled cells with at least one empty 4-neighbour.
  const dots: Pt[] = [];
  for (const k of filled) {
    const [x, y] = k.split(",").map(Number);
    if (x < 0 || y < 0 || x >= INSIGNIA_W || y >= INSIGNIA_H) continue;
    const edge = [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)].some((n) => !filled.has(n));
    if (edge) dots.push([x, y]);
  }
  return dots;
}

export const INSIGNIA_DOTS = build();
