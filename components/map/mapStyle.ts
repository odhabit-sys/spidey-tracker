// Recolours a MapTiler vector style into the Spidey Tracker palette at runtime:
// deep navy water, steel-blue land, muted cyan roads, dim labels, no POI clutter.
// Matching is by layer type + id keywords, so it survives style updates.

import type { Map as MapLibreMap } from "maplibre-gl";

export const MAP_STYLE_ID = "dataviz-dark";

export function mapStyleUrl(key: string) {
  return `https://api.maptiler.com/maps/${MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
}

const PALETTE = {
  land: "#24476d",
  landAlt: "#284f78",
  water: "#121d38",
  building: "#2d5682",
  roadMajor: "#5a8fbf",
  roadMinor: "#3a6893",
  boundary: "#6c95bf",
  label: "#b9d3ea",
  labelMuted: "#7fa0c0",
  halo: "#0d1830",
};

const has = (id: string, words: string[]) => words.some((w) => id.includes(w));

type PaintProp = Parameters<MapLibreMap["setPaintProperty"]>[1];

function set(map: MapLibreMap, layer: string, prop: PaintProp, value: string | number) {
  try {
    map.setPaintProperty(layer, prop, value);
  } catch {
    // Property not supported by this layer: ignore.
  }
}

export function applySpideyPalette(map: MapLibreMap) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id.toLowerCase();

    // Clutter we never want on a tracker display.
    if (layer.type === "fill-extrusion" || has(id, ["poi", "housenumber", "aeroway", "transit", "oneway", "shield"])) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }

    switch (layer.type) {
      case "background":
        set(map, layer.id, "background-color", PALETTE.land);
        break;
      case "fill":
        if (has(id, ["water", "ocean", "sea", "lake", "river", "bay"])) set(map, layer.id, "fill-color", PALETTE.water);
        else if (has(id, ["building"])) set(map, layer.id, "fill-color", PALETTE.building);
        else set(map, layer.id, "fill-color", PALETTE.landAlt);
        set(map, layer.id, "fill-outline-color", "rgba(0,0,0,0)");
        break;
      case "line":
        if (has(id, ["water", "river", "stream", "canal", "ditch"])) set(map, layer.id, "line-color", PALETTE.water);
        else if (has(id, ["boundary", "admin", "border"])) {
          set(map, layer.id, "line-color", PALETTE.boundary);
          set(map, layer.id, "line-opacity", 0.45);
        } else if (has(id, ["motorway", "trunk", "primary", "highway", "major"])) set(map, layer.id, "line-color", PALETTE.roadMajor);
        else set(map, layer.id, "line-color", PALETTE.roadMinor);
        break;
      case "symbol":
        set(map, layer.id, "text-color", has(id, ["country", "city", "place", "state", "continent"]) ? PALETTE.label : PALETTE.labelMuted);
        set(map, layer.id, "text-halo-color", PALETTE.halo);
        set(map, layer.id, "text-halo-width", 1.2);
        set(map, layer.id, "text-halo-blur", 0);
        set(map, layer.id, "icon-opacity", 0);
        break;
    }
  }
}
