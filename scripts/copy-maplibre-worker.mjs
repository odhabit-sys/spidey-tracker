// MapLibre 6 runs its renderer in a module Web Worker loaded from a separate
// file. Bundlers don't emit that file, so we serve it from /public instead.
// Runs automatically before `dev` and `build` (see package.json), keeping the
// served worker in lockstep with the installed maplibre-gl version.

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), join(outDir, "maplibre-gl-worker.mjs"));
console.log("[maplibre] worker copied to public/maplibre/");
