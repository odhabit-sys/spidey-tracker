// Original pixel-art sprites, stored as character grids so they stay tiny,
// diffable and reusable (UI, map marker and generated PWA icons).
// Each character maps to a palette colour; "." is transparent.

export type Palette = Record<string, string>;

export interface Sprite {
  rows: string[];
  palette: Palette;
}

export const SPRITE_PALETTE: Palette = {
  K: "#05060c", // outline
  R: "#e3262f", // suit red
  r: "#a3161f", // web lines on red
  W: "#f4f1e6", // eyes
  B: "#2457d6", // suit blue
  G: "#8a9099", // hardware glyph grey
  C: "#59d8ff", // creator marker cyan
  c: "#1f7fa8", // creator marker cyan shade
};

/** Head-on mask emblem used in the header and app icons (16x16). */
export const MASK: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    "................",
    "....KKKKKKKK....",
    "...KRRRrrRRRK...",
    "..KRRrRRRRrRRK..",
    ".KRRrRRRRRRrRRK.",
    ".KRKKKRRRRKKKRK.",
    "KRKWWWKRRKWWWKRK",
    "KKWWWWWKKWWWWWKK",
    "KKWWWWWKKWWWWWKK",
    "KRKWWWWKKWWWWKRK",
    "KRRKWWWKKWWWKRRK",
    ".KRRKKWKKWKKRRK.",
    "..KRrRKRRKRrRK..",
    "...KRRrrrrRRK...",
    "....KKRRRRKK....",
    "......KKKK......",
  ],
};

/** Chibi full-body Spidey for the map marker and the hanging mascot (13x19). */
export const SPIDEY: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    "...KKKKKKK...",
    "..KRRRRRRRK..",
    ".KRRrRRRrRRK.",
    "KRRRRrRrRRRRK",
    "KRKKKRrRKKKRK",
    "KKWWWKrKWWWKK",
    "KWWWWWKWWWWWK",
    "KKWWWWKWWWWKK",
    "KRKWWWKWWWKRK",
    "KRRKKWKWKKRRK",
    ".KRRRKrKRRRK.",
    "..KKRRRRRKK..",
    ".KRRKKKKKRRK.",
    "KRKBBRKRBBKRK",
    "KKKBBRRRBBKKK",
    "..KBBBBBBBK..",
    "..KBBKKKBBK..",
    "..KRRK.KRRK..",
    "..KKKK.KKKK..",
  ],
};

/**
 * Hero pose (15x18): hanging upside-down, limbs splayed, tiny body above a
 * big round head. Drawn in its final orientation. `anchorX` is the column
 * the web line attaches to.
 */
export const HANGING: Sprite & { anchorX: number } = {
  palette: SPRITE_PALETTE,
  anchorX: 7,
  rows: [
    ".KKKK.KKK.KKKK.",
    "KBBBBKKRKKBBBBK",
    "KBBKKRRRRRKKBBK",
    ".KKKRRBRBRRKKK.",
    "...KRRRKRRRK...",
    "...KKRRRRRKK...",
    "..KKRRRRRRRKK..",
    ".KRRRRRRRRRRRK.",
    "KRRKKKRRRKKKRRK",
    "KRKWWWKRKWWWKRK",
    "KKWWWWWKWWWWWKK",
    "KKWWWWWKWWWWWKK",
    "KRKWWWWKWWWWKRK",
    "KRRKKWWKWWKKRRK",
    "KRRRRKKRKKRRRRK",
    ".KRRRRRRRRRRRK.",
    "..KRRRRRRRRRK..",
    "...KKKKKKKKK...",
  ],
};

/** Black spider glyph for the off-white hardware keys (13x13). */
export const SPIDER_ICON: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    "K....K.K....K",
    ".K...K.K...K.",
    ".K...KKK...K.",
    "..K.KKKKK.K..",
    "KK.KKKKKKK.KK",
    "..KKKKKKKKK..",
    "....KKKKK....",
    "..KKKKKKKKK..",
    "KK.KKKKKKK.KK",
    "..K.KKKKK.K..",
    ".K...KKK...K.",
    ".K....K....K.",
    "K...........K",
  ],
};

/** White eyes for the black octagon mask key (14x7). */
export const EYES: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    ".WWWW....WWWW.",
    "WWWWWW..WWWWWW",
    "WWWWWW..WWWWWW",
    "WWWWWW..WWWWWW",
    "WWWWW....WWWWW",
    ".WWWW....WWWW.",
    "..WW......WW..",
  ],
};

/** Speaker glyph for the bottom-right key (9x7). */
export const SPEAKER: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    "...G..G..",
    "..GG...G.",
    "GGGG.G.G.",
    "GGGG.G.G.",
    "GGGG.G.G.",
    "..GG...G.",
    "...G..G..",
  ],
};

/** The creator's own position on the map: small cyan pixel locator (9x9). */
export const ME_MARKER: Sprite = {
  palette: SPRITE_PALETTE,
  rows: [
    "...KKK...",
    "..KCCCK..",
    ".KCCCCCK.",
    "KCCWWWCCK",
    "KCCWKWCCK",
    "KCCWWWCCK",
    ".KcCCCcK.",
    "..KcccK..",
    "...KKK...",
  ],
};

export interface PixelRun {
  x: number;
  y: number;
  w: number;
  color: string;
}

/** Collapse each row into horizontal runs of one colour (far fewer rects). */
export function spriteRuns(sprite: Sprite): PixelRun[] {
  const runs: PixelRun[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const color = sprite.palette[ch];
      if (color) runs.push({ x, y, w: end - x, color });
      x = end;
    }
  });
  return runs;
}

export function spriteSize(sprite: Sprite) {
  return { width: sprite.rows[0].length, height: sprite.rows.length };
}

/** Sprite as an SVG markup string, for DOM elements built outside React (map markers). */
export function spriteSvgMarkup(sprite: Sprite, scale: number): string {
  const { width, height } = spriteSize(sprite);
  const rects = spriteRuns(sprite)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.color}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}
