"use client";

// The live map view, identical for both participants. Rule: the OTHER person
// is always the red Spidey marker; YOU are always the small cyan marker.
// The map fills the display, with small pixel readouts around the edges.

import { useState } from "react";
import TrackerMap, { type FollowMode, type MapPoint } from "@/components/map/TrackerMap";
import SpiderInsignia from "@/components/SpiderInsignia";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import { formatAccuracy, formatDistance, haversineMeters } from "@/lib/distance";
import { formatAgo, type Freshness } from "@/lib/shared/tracking";
import type { PeerLocation } from "@/lib/shared/types";
import EndButton from "./EndButton";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

interface Props {
  peerName: string;
  peerLocation: PeerLocation;
  ageMs: number;
  freshness: Freshness;
  /** This device's own latest fix (cyan marker + distance). */
  me: MapPoint | null;
  expiresLabel: string;
  connectionLost: boolean;
  /** This device's own upload is stalled. */
  myUploadStalled: boolean;
  stopping: boolean;
  onStop: () => void;
  ending: boolean;
  onEnd: () => void;
}

const FRESH_LABEL: Record<Freshness, string> = { live: "LIVE", stale: "STALE", offline: "OFFLINE" };

export default function TrackingView({
  peerName,
  peerLocation,
  ageMs,
  freshness,
  me,
  expiresLabel,
  connectionLost,
  myUploadStalled,
  stopping,
  onStop,
  ending,
  onEnd,
}: Props) {
  const [follow, setFollow] = useState<FollowMode>("spidey");
  const [nonce, setNonce] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);

  const distance = me ? formatDistance(haversineMeters(me, peerLocation)) : null;
  const showMap = Boolean(MAPTILER_KEY) && !mapFailed;

  const status = connectionLost
    ? { text: "CONNECTION LOST", led: "err" as const }
    : {
        text: [peerName, distance, FRESH_LABEL[freshness]].filter(Boolean).join(" • "),
        led: freshness === "live" ? ("ok" as const) : freshness === "stale" ? ("warn" as const) : ("err" as const),
        blink: freshness === "live",
      };

  const recenter = (mode: FollowMode) => {
    setFollow(mode);
    setNonce((n) => n + 1);
  };

  return (
    <>
      <SetDeviceStatus {...status} />

      {showMap && (
        // MapTiler's free plan requires its logo to be visible.
        <a className="maptiler-logo" href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">
          <img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" width={67} height={20} />
        </a>
      )}

      {showMap ? (
        <TrackerMap
          apiKey={MAPTILER_KEY}
          friend={peerLocation}
          freshness={freshness}
          me={me}
          follow={follow}
          recenterNonce={nonce}
          onUserMove={() => setFollow("free")}
          onMapError={() => setMapFailed(true)}
        />
      ) : (
        <div className="map-offline screen-fill">
          <SpiderInsignia />
          <p className="console__headline">MAP OFFLINE</p>
          <p className="console__copy console__copy--dim">
            {MAPTILER_KEY ? "MAP TILES COULD NOT LOAD. CHECK THE MAPTILER KEY AND ITS ALLOWED ORIGINS." : "NO MAPTILER KEY CONFIGURED."}
          </p>
        </div>
      )}

      {/* Top row: the other person's freshness + countdown */}
      <div className="hud hud--top">
        <span className={`hud-chip hud-chip--${freshness}`}>
          <span className="hud-chip__dot" />
          {connectionLost ? "NO LINK" : FRESH_LABEL[freshness]}
        </span>
        <span className="hud-chip">EXP {expiresLabel}</span>
      </div>

      {/* Bottom-left: tracker readout. Bottom-right: keys. */}
      <div className="hud hud--bottom">
        <dl className="hud-readout">
          <dt className="hud-readout__title">SPIDEY LOCATED</dt>
          <dd className="hud-readout__name">{peerName}</dd>
          {distance && <dd className="hud-readout__big">{distance} AWAY</dd>}
          <dd>UPDATED {formatAgo(ageMs)}</dd>
          <dd>GPS {formatAccuracy(peerLocation.accuracy)}</dd>
          <dd className={myUploadStalled ? "hud-readout__warn" : "hud-readout__muted"}>
            {myUploadStalled ? "YOUR UPDATES STALLED" : "● YOU ARE SHARING"}
          </dd>
        </dl>

        <div className="hud-keys">
          <button type="button" className="hud-key" onClick={() => recenter("spidey")} aria-label={`Center on ${peerName}`}>
            <span className="px-icon px-icon--target" aria-hidden />
            SPIDEY
          </button>
          {me && (
            <button type="button" className="hud-key" onClick={() => recenter("both")} aria-label="Fit both positions">
              <span className="px-icon px-icon--fit" aria-hidden />
              BOTH
            </button>
          )}
          <button type="button" className="hud-key hud-key--stop" onClick={onStop} disabled={stopping}>
            {stopping ? "..." : "STOP"}
          </button>
          <EndButton onEnd={onEnd} ending={ending} variant="key" />
        </div>
      </div>
    </>
  );
}
