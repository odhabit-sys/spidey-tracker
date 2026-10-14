// Renders the app icons from the badge's pixel mask (lib/sprites.ts) as crisp,
// dependency-free PNGs. Run after changing the mask:
//   node --experimental-strip-types scripts/generate-icons.mjs   (Node >= 22.6)
// Outputs are committed, so this is never needed to build or deploy.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import { MASK } from "../lib/sprites.ts";

const BG = "#1b2a58"; // badge navy
const FRAME = "#2f8fce"; // device frame blue

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** size: output px; cell: px per sprite pixel; border: frame ring in px (0 for maskable). */
function render(size, cell, border) {
  const px = new Uint8Array(size * size * 3);
  const set = (x, y, rgb) => px.set(rgb, (y * size + x) * 3);
  const bg = hex(BG), frame = hex(FRAME);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      set(x, y, x < border || y < border || x >= size - border || y >= size - border ? frame : bg);

  const w = MASK.rows[0].length * cell, h = MASK.rows.length * cell;
  const ox = Math.floor((size - w) / 2), oy = Math.floor((size - h) / 2);
  MASK.rows.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      const color = MASK.palette[ch];
      if (!color) return; // "." is transparent
      const rgb = hex(color);
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) set(ox + rx * cell + dx, oy + ry * cell + dy, rgb);
    }),
  );
  return png(size, px);
}

function png(size, rgb) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, opaque (iOS needs no alpha)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
const out = {
  "public/icons/icon-192.png": render(192, 8, 8), // mask 128px
  "public/icons/icon-512.png": render(512, 20, 20), // mask 320px
  "public/icons/icon-maskable-512.png": render(512, 16, 0), // mask 256px, inside the 80% safe zone
  "app/apple-icon.png": render(180, 8, 0), // iOS rounds the corners itself
  "app/icon.png": render(32, 2, 0), // favicon
};
for (const [file, data] of Object.entries(out)) {
  writeFileSync(file, data);
  console.log(`${file} (${data.length} bytes)`);
}
