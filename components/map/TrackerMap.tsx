"use client";

// The real MapLibre map that fills the tracker display.
//
// Honesty rules:
//  * The Spidey marker only ever sits on coordinates the friend's phone sent.
//    New fixes SNAP the marker (no interpolated "fake" path) and play a ping.
//  * The red circle is the friend's reported GPS accuracy radius.
//  * The creator's own position is drawn from their device only; it never leaves it.

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { circlePolygon } from "@/lib/geo";
import { ME_MARKER, SPIDEY, spriteSvgMarkup } from "@/lib/sprites";
import type { Freshness } from "@/lib/shared/tracking";
import { applySpideyPalette, mapStyleUrl } from "./mapStyle";

export interface MapPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type FollowMode = "spidey" | "both" | "free";

interface Props {
  apiKey: string;
  friend: MapPoint & { updatedAt: string };
  freshness: Freshness;
  me: MapPoint | null;
  follow: FollowMode;
  /** Bump to force a recenter even if `follow` didn't change. */
  recenterNonce: number;
  onUserMove: () => void;
  onMapError: () => void;
}

const ACCURACY_SOURCE = "spidey-accuracy";
const SPIDEY_ZOOM = 16;

export default function TrackerMap({ apiKey, friend, freshness, me, follow, recenterNonce, onUserMove, onMapError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const friendMarker = useRef<Marker | null>(null);
  const meMarker = useRef<Marker | null>(null);
  const ready = useRef(false);
  const latest = useRef({ friend, me, follow });
  latest.current = { friend, me, follow };
  const callbacks = useRef({ onUserMove, onMapError });
  callbacks.current = { onUserMove, onMapError };

  // ---- Create the map once ----
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current) return;
      // The bundler can't resolve MapLibre's worker file; serve it from /public
      // (copied by scripts/copy-maplibre-worker.mjs). Version busts stale caches.
      maplibre.setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${maplibre.getVersion()}`);
      const start = latest.current.friend;
      map = new maplibre.Map({
        container: container.current,
        style: mapStyleUrl(apiKey),
        center: [start.longitude, start.latitude],
        zoom: SPIDEY_ZOOM,
        pixelRatio: 1, // render at 1x and upscale with nearest-neighbour: the pixel-gadget look
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.AttributionControl({ compact: false }), "bottom-left");
      mapRef.current = map;

      // Markers are plain DOM built from our pixel sprites.
      const spideyEl = document.createElement("div");
      spideyEl.className = "spidey-marker";
      spideyEl.innerHTML = `<span class="spidey-marker__ping"></span>${spriteSvgMarkup(SPIDEY, 3)}`;
      spideyEl.setAttribute("aria-label", "Friend's location");
      friendMarker.current = new maplibre.Marker({ element: spideyEl, anchor: "center" })
        .setLngLat([start.longitude, start.latitude])
        .addTo(map);

      const meEl = document.createElement("div");
      meEl.className = "me-marker";
      meEl.innerHTML = spriteSvgMarkup(ME_MARKER, 2);
      meEl.setAttribute("aria-label", "Your location");
      meMarker.current = new maplibre.Marker({ element: meEl, anchor: "center" });

      let styled = false;
      map.on("style.load", () => {
        if (!map) return;
        styled = true;
        applySpideyPalette(map);
        map.addSource(ACCURACY_SOURCE, { type: "geojson", data: accuracyData(latest.current.friend) });
        map.addLayer({ id: "spidey-accuracy-fill", type: "fill", source: ACCURACY_SOURCE, paint: { "fill-color": "#e3262f", "fill-opacity": 0.14 } });
        map.addLayer({
          id: "spidey-accuracy-line",
          type: "line",
          source: ACCURACY_SOURCE,
          paint: { "line-color": "#ff4d55", "line-opacity": 0.7, "line-width": 1.5, "line-dasharray": [2, 2] },
        });
        ready.current = true;
      });
      // Bad/missing key or blocked network: the style never loads.
      map.on("error", () => {
        if (!styled) callbacks.current.onMapError();
      });
      // Only real user gestures (originalEvent) switch off auto-follow.
      map.on("dragstart", (e) => {
        if (e.originalEvent) callbacks.current.onUserMove();
      });
      map.on("zoomstart", (e) => {
        if (e.originalEvent) callbacks.current.onUserMove();
      });
    });

    return () => {
      cancelled = true;
      ready.current = false;
      friendMarker.current = null;
      meMarker.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [apiKey]);

  // ---- A new real fix arrived: snap the marker, update accuracy, ping ----
  useEffect(() => {
    const map = mapRef.current;
    const marker = friendMarker.current;
    if (!map || !marker) return;
    marker.setLngLat([friend.longitude, friend.latitude]);
    (map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined)?.setData(accuracyData(friend));

    const el = marker.getElement();
    el.classList.remove("is-ping");
    void el.offsetWidth; // restart the CSS animation
    el.classList.add("is-ping");

    if (latest.current.follow !== "free") recenter(map, latest.current.follow, friend, latest.current.me);
  }, [friend.latitude, friend.longitude, friend.accuracy, friend.updatedAt]);

  // ---- Freshness styling (dims when stale, greys when offline) ----
  useEffect(() => {
    const el = friendMarker.current?.getElement();
    if (!el) return;
    el.classList.toggle("is-stale", freshness === "stale");
    el.classList.toggle("is-offline", freshness === "offline");
  }, [freshness]);

  // ---- The creator's own marker ----
  useEffect(() => {
    const map = mapRef.current;
    const marker = meMarker.current;
    if (!map || !marker) return;
    if (me) marker.setLngLat([me.longitude, me.latitude]).addTo(map);
    else marker.remove();
  }, [me?.latitude, me?.longitude]);

  // ---- Explicit recenter (CENTER ON SPIDEY / FIT BOTH) ----
  useEffect(() => {
    const map = mapRef.current;
    if (map && follow !== "free") recenter(map, follow, latest.current.friend, latest.current.me);
  }, [follow, recenterNonce]);

  // MapLibre adds `.maplibregl-map { position: relative }` to its container,
  // which would collapse a full-bleed layer to 0px. So the full-bleed layer is
  // a wrapper and MapLibre owns an inner 100% x 100% box.
  return (
    <div className="screen-fill">
      <div ref={container} className="tracker-map" />
    </div>
  );
}

function accuracyData(p: MapPoint) {
  return circlePolygon(p.latitude, p.longitude, Math.max(p.accuracy, 3));
}

function recenter(map: MapLibreMap, mode: FollowMode, friend: MapPoint, me: MapPoint | null) {
  if (mode === "both" && me) {
    map.fitBounds(
      [
        [Math.min(friend.longitude, me.longitude), Math.min(friend.latitude, me.latitude)],
        [Math.max(friend.longitude, me.longitude), Math.max(friend.latitude, me.latitude)],
      ],
      { padding: { top: 110, bottom: 170, left: 60, right: 60 }, maxZoom: 17, duration: 700 },
    );
  } else {
    map.easeTo({ center: [friend.longitude, friend.latitude], zoom: Math.max(map.getZoom(), SPIDEY_ZOOM - 1), duration: 600 });
  }
}
