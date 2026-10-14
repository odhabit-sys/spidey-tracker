// Original pixel-art Spider identities (13x19 chibi, same grid and outline
// weight as the rest of the UI). Each has its own silhouette feature, not just
// a recolour: hoods, visor, head rays, tendrils, chest emblems.
// "." is transparent; every sprite carries its own palette.

import type { Sprite } from "./sprites";
import type { SpiderId } from "./shared/spiders";

const K = "#05060c"; // outline (shared by every sprite)
const W = "#f4f1e6"; // eye white

export const SPIDER_SPRITES: Record<SpiderId, Sprite> = {
  // Red/blue original: big eyes, web lines.
  classic: {
    palette: { K, W, R: "#e3262f", r: "#a3161f", B: "#2457d6" },
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
  },
  // Black suit, red web lines, narrow angled eyes, red chest spider + red kicks.
  miles: {
    palette: { K, W, D: "#1c1e26", r: "#e3262f" },
    rows: [
      "...KKKKKKK...",
      "..KDDDDDDDK..",
      ".KDDrDDDrDDK.",
      "KDDDDrDrDDDDK",
      "KDKKKDrDKKKDK",
      "KKWWWKrKWWWKK",
      "KWWWWKDKWWWWK",
      "KKWWWKDKWWWKK",
      "KDKKWKDKWKKDK",
      "KDDDKKDKKDDDK",
      ".KDDDDrDDDDK.",
      "..KKDDDDDKK..",
      ".KDDKKKKKDDK.",
      "KDKDrDKDrDKDK",
      "KKKDDrrrDDKKK",
      "..KDDDrDDDK..",
      "..KDDKKKDDK..",
      "..KrrK.KrrK..",
      "..KKKK.KKKK..",
    ],
  },
  // Pointed white hood framing a pale mask, pink accents, black legs, teal shoes.
  gwen: {
    palette: { K, H: "#f2f3f7", h: "#c3c8d4", P: "#ff5fa8", D: "#1c1e26", T: "#34d1c9", W: "#ffffff" },
    rows: [
      "....KKKKK....",
      "..KKHHHHHKK..",
      ".KHHHHHHHHHK.",
      "KHHKKKKKKKHHK",
      "KHKhPhhhPhKHK",
      "KHKKKhPhKKKHK",
      "KHKWWKhKWWKHK",
      "KHKWWWKWWWKHK",
      "KHKhWWKWWhKHK",
      "KHKhKKPKKhKHK",
      ".KHKhhhhhKHK.",
      "..KKKKKKKKK..",
      ".KHHKPPPKHHK.",
      "KHKHHPDPHHKHK",
      "KKKDDDDDDDKKK",
      "..KDDDDDDDK..",
      "..KDDKKKDDK..",
      "..KTTK.KTTK..",
      "..KKKK.KKKK..",
    ],
  },
  // Deep blue with a red face mark around the eyes and a wide red chest emblem.
  "2099": {
    palette: { K, W, N: "#22337f", R: "#e3262f" },
    rows: [
      "...KKKKKKK...",
      "..KNNNNNNNK..",
      ".KNNNNNNNNNK.",
      "KNNRRNNNRRNNK",
      "KNRRRRNRRRRNK",
      "KRRWWRKRWWRRK",
      "KRWWWWKWWWWRK",
      "KRRWWWKWWWRRK",
      "KNRRWRKRWRRNK",
      "KNNRRRKRRRNNK",
      ".KNNNRRRNNNK.",
      "..KKNNNNNKK..",
      ".KNRKRRRKRNK.",
      "KRNRRKRKRRNRK",
      "KRKNRRRRRNKRK",
      ".KKNNRRRNNKK.",
      "..KNNKKKNNK..",
      "..KRRK.KRRK..",
      "..KKKK.KKKK..",
    ],
  },
  // Black with tendrils on the head, jagged white eyes and a big white emblem.
  symbiote: {
    palette: { K, W: "#f7f7f7", D: "#16171d" },
    rows: [
      ".K.KKKKK.K...",
      "..KDDDDDDDK.K",
      ".KDDDDDDDDDK.",
      "KDDDDDDDDDDDK",
      "KDKKKDDDKKKDK",
      "KKWWWKDKWWWKK",
      "KWWWWWKWWWWWK",
      "KWWWWKDKWWWWK",
      "KDWWKDDDKWWDK",
      "KDWKDDDDDKWDK",
      ".KDDDDDDDDDK.",
      "..KKDDDDDKK..",
      ".KDDKWKWKDDK.",
      "KDKWDWWWDWKDK",
      "KKKDWWWWWDKKK",
      "..KWDWWWDWK..",
      "..KDDKKKDDK..",
      "..KDDK.KDDK..",
      "..KKKK.KKKK..",
    ],
  },
  // Red suit under a rounded blue sleeveless hoodie; bare red arms.
  scarlet: {
    palette: { K, W, R: "#e3262f", r: "#a3161f", B: "#2f6be0", b: "#1b3f94" },
    rows: [
      "...KKKKKKK...",
      "..KBBBBBBBK..",
      ".KBBBBBBBBBK.",
      "KBBKKKKKKKBBK",
      "KBKRRrRrRRKBK",
      "KBKWWKrKWWKBK",
      "KBKWWWKWWWKBK",
      "KBKWWWKWWWKBK",
      "KbKRWWKWWRKbK",
      "KbKRRKrKRRKbK",
      ".KbKRRRRRKbK.",
      "..KKKKKKKKK..",
      ".KRRKBRBKRRK.",
      "KRKKBBKBBKKRK",
      "KKKBBBRBBBKKK",
      "..KBBBBBBBK..",
      "..KRRKKKRRK..",
      "..KRRK.KRRK..",
      "..KKKK.KKKK..",
    ],
  },
  // ORIGINAL: graphite stealth suit, teal visor band and antenna.
  stealth: {
    palette: { K, G: "#4a5363", g: "#2c313b", T: "#34d1c9" },
    rows: [
      "...KKKKKKK.K.",
      "..KGGGGGGGKTK",
      ".KGGgGGGgGGK.",
      "KGGGGgGgGGGGK",
      "KGGGGGgGGGGGK",
      "KKKKKKKKKKKKK",
      "KTTTTTKTTTTTK",
      "KTTTTTKTTTTTK",
      "KKKKKKKKKKKKK",
      "KGGGGGgGGGGGK",
      ".KGGGgGgGGGK.",
      "..KKGGGGGKK..",
      ".KGGKKKKKGGK.",
      "KGKggTKTggKGK",
      "KKKggTTTggKKK",
      "..KgggTgggK..",
      "..KggKKKggK..",
      "..KTTK.KTTK..",
      "..KKKK.KKKK..",
    ],
  },
  // ORIGINAL: orange/gold suit with sun rays around the head.
  solar: {
    palette: { K, W, O: "#ff8a1f", y: "#c4560c", Y: "#ffd23d" },
    rows: [
      "Y..YKKKKKY..Y",
      ".YKOOOOOOOKY.",
      ".KOOyOOOyOOK.",
      "KOOOOyOyOOOOK",
      "KOKKKOyOKKKOK",
      "KKWWWKyKWWWKK",
      "KWWWWWKWWWWWK",
      "KKWWWWKWWWWKK",
      "KOKWWWKWWWKOK",
      "KOOKKWKWKKOOK",
      ".KOOOKyKOOOK.",
      "..KKOOOOOKK..",
      ".KOOKKKKKOOK.",
      "KOKYYOKOYYKOK",
      "KKKYYOOOYYKKK",
      "..KYYYYYYYK..",
      "..KYYKKKYYK..",
      "..KOOK.KOOK..",
      "..KKKK.KKKK..",
    ],
  },
};

/** Head-and-shoulders crop (rows 0-11) for small portraits like the side keys. */
export function spiderHead(id: SpiderId): Sprite {
  const s = SPIDER_SPRITES[id];
  return { palette: s.palette, rows: s.rows.slice(0, 12) };
}
