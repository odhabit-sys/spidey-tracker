"use client";

// The live map view, identical for both participants. Each person is drawn as
// their own chosen Spider: the OTHER person full size, YOU smaller on a cyan
// "YOU" ring. The map fills the display; small pixel modules sit at the edges.

import { useEffect, useRef, useState } from "react";
import TrackerMap, { type FollowMode, type MapPoint } from "@/components/map/TrackerMap";
import SpiderInsignia from "@/components/SpiderInsignia";
import { SetDeviceStatus, SetSideKeys, SetTelemetry } from "@/components/device/DeviceStatus";
import { bearingDegrees, formatAccuracy, formatDistance, haversineMeters } from "@/lib/distance";
import { formatAgo, PROXIMITY_LABEL, proximity, type Freshness } from "@/lib/shared/tracking";
import type { SpiderId } from "@/lib/shared/spiders";
import type { PeerLocation } from "@/lib/shared/types";
import EndButton from "./EndButton";
import WebRadar from "./WebRadar";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

interface Props {
  sessionId: string;
  peerName: string;
  peerSpider: SpiderId;
  peerLocation: PeerLocation;
  ageMs: number;
  freshness: Freshness;
  myName: string;
  mySpider: SpiderId;
  /** This device's own latest fix (YOU marker, distance, radar). */
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

/** 0-4 bars from this device's GPS accuracy. */
function signalBars(accuracy: number | null): number {
  if (accuracy === null) return 0;
  if (accuracy <= 10) return 4;
  if (accuracy <= 30) return 3;
  if (accuracy <= 100) return 2;
  return 1;
}

export default function TrackingView({
  sessionId,
  peerName,
  peerSpider,
  peerLocation,
  ageMs,
  freshness,
  myName,
  mySpider,
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

  const distanceM = me ? haversineMeters(me, peerLocation) : null;
  const distance = distanceM === null ? null : formatDistance(distanceM);
  const bearing = me ? bearingDegrees(me, peerLocation) : null;
  const prox = proximity(distanceM);
  const showMap = Boolean(MAPTILER_KEY) && !mapFailed;

  // One-shot attention pulse when entering the vicinity (never a constant flash).
  const [pulse, setPulse] = useState(false);
  const lastProx = useRef(prox);
  useEffect(() => {
    if (prox === "vicinity" && lastProx.current !== "vicinity") {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2400);
      lastProx.current = prox;
      return () => clearTimeout(t);
    }
    lastProx.current = prox;
  }, [prox]);

  const status = connectionLost
    ? { text: "CONNECTION LOST", led: "err" as const, sprite: peerSpider }
    : {
        text: [peerName, distance, FRESH_LABEL[freshness]].filter(Boolean).join(" • "),
        led: freshness === "live" ? ("ok" as const) : freshness === "stale" ? ("warn" as const) : ("err" as const),
        blink: freshness === "live",
        sprite: peerSpider,
      };

  const recenter = (mode: FollowMode) => {
    setFollow(mode);
    setNonce((n) => n + 1);
  };

  return (
    <>
      <SetDeviceStatus {...status} />
      <SetSideKeys
        keys={[
          { id: "peer", tag: "A.1", spider: peerSpider, label: `Center on ${peerName}`, active: follow === "spidey", onPress: () => recenter("spidey") },
          { id: "me", tag: "A.2", spider: mySpider, label: `Center on you (${myName})`, active: follow === "me", onPress: () => recenter("me") },
        ]}
      />
      <SetTelemetry
        sig={signalBars(me?.accuracy ?? null)}
        gps={me ? formatAccuracy(me.accuracy).replace(/\s/g, "") : null}
        link={!connectionLost}
        p2p={!myUploadStalled && freshness !== "offline"}
        trk={2}
        live={freshness}
        ident={`${sessionId.slice(0, 4)}·${sessionId.slice(-4)}`.toUpperCase()}
      />

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
          friendSpider={peerSpider}
          meSpider={mySpider}
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

      {/* Top row: the other person's freshness + countdown; radar hangs under the countdown. */}
      <div className="hud hud--top">
        <span className={`hud-chip hud-chip--${freshness}`}>
          <span className="hud-chip__dot" />
          {connectionLost ? "NO LINK" : FRESH_LABEL[freshness]}
        </span>
        <div className="hud-stack">
          <span className="hud-chip hud-chip--exp">
            <span className="hud-chip__tag">EXP</span> {expiresLabel}
          </span>
          <WebRadar bearing={bearing} distanceM={distanceM} />
        </div>
      </div>

      {/* Bottom-left: tracker readout with the proximity alert. Bottom-right: keys. */}
      <div className="hud hud--bottom">
        <dl className={`hud-readout hud-readout--${prox}${pulse ? " is-pulsing" : ""}`}>
          <dt className="hud-readout__alert">
            <span className="hud-readout__alert-led" aria-hidden />
            {PROXIMITY_LABEL[prox]}
          </dt>
          <dd className="hud-readout__name">{peerName}</dd>
          {distance && <dd className="hud-readout__big">{distance} AWAY</dd>}
          <dd>UPDATED {formatAgo(ageMs)}</dd>
          <dd>GPS {formatAccuracy(peerLocation.accuracy)}</dd>
          <dd className={myUploadStalled ? "hud-readout__warn" : "hud-readout__muted"}>
            {myUploadStalled ? "YOUR UPDATES STALLED" : "● YOU ARE SHARING"}
          </dd>
        </dl>

        <div className="hud-keys">
          <button type="button" className="hud-key hud-key--icon" onClick={() => recenter("spidey")} aria-label={`Center on ${peerName}`}>
            <span className="px-icon px-icon--target" aria-hidden />
            SPIDEY
          </button>
          {me && (
            <button type="button" className="hud-key hud-key--icon hud-key--alt" onClick={() => recenter("both")} aria-label="Fit both positions">
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
