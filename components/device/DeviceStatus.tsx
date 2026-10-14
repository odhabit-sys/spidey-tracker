"use client";

// The persistent device frame (bottom display, portrait, side keys, telemetry
// modules) lives outside the page. Pages drive it with:
//   <SetDeviceStatus />  bottom display text/LED + portrait sprite
//   <SetSideKeys />      the two left-edge participant keys (map view)
//   <SetTelemetry />     small hardware readouts (SIG, GPS, LINK, P2P, TRK...)

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import PixelSprite from "@/components/PixelSprite";
import { SPIDER_SPRITES, spiderHead } from "@/lib/spiderSprites";
import { SPIDER_ICON } from "@/lib/sprites";
import { DEFAULT_SPIDER, SPIDER_LABELS, type SpiderId } from "@/lib/shared/spiders";
import type { Freshness } from "@/lib/shared/tracking";

export type LedState = "off" | "ok" | "warn" | "err";

export interface DeviceStatusValue {
  text: string;
  led: LedState;
  blink?: boolean;
  /** Portrait in the bottom-left hardware slot. */
  sprite?: SpiderId;
}

export interface SideKey {
  id: string;
  spider: SpiderId;
  /** Accessible name, e.g. "Center on BOB". */
  label: string;
  /** Tiny tag printed on the key, e.g. "A.1". */
  tag: string;
  active: boolean;
  onPress: () => void;
}

export interface Telemetry {
  /** 0-4 signal bars (from this device's GPS accuracy). */
  sig: number;
  /** e.g. "±35M", or null when unknown. */
  gps: string | null;
  link: boolean;
  /** Both participants currently sharing. */
  p2p: boolean;
  /** Participants in the tracker. */
  trk: number;
  live: Freshness | null;
  /** Short decorative ident derived from the session id (never coordinates). */
  ident: string;
}

const DEFAULT_STATUS: DeviceStatusValue = { text: "SPIDEY • READY", led: "ok" };
export const IDLE_TELEMETRY: Telemetry = { sig: 0, gps: null, link: false, p2p: false, trk: 1, live: null, ident: "--.--" };

interface Ctx {
  status: DeviceStatusValue;
  setStatus: (s: DeviceStatusValue) => void;
  sideKeys: SideKey[] | null;
  setSideKeys: (k: SideKey[] | null) => void;
  telemetry: Telemetry;
  setTelemetry: (t: Telemetry) => void;
}

const DeviceCtx = createContext<Ctx | null>(null);

export function DeviceStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [sideKeys, setSideKeys] = useState<SideKey[] | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>(IDLE_TELEMETRY);
  return (
    <DeviceCtx.Provider value={{ status, setStatus, sideKeys, setSideKeys, telemetry, setTelemetry }}>
      {children}
    </DeviceCtx.Provider>
  );
}

export function SetDeviceStatus({ text, led = "ok", blink, sprite }: { text: string; led?: LedState; blink?: boolean; sprite?: SpiderId }) {
  const setStatus = useContext(DeviceCtx)?.setStatus;
  useEffect(() => {
    setStatus?.({ text, led, blink, sprite });
  }, [setStatus, text, led, blink, sprite]);
  return null;
}

/** Register the left participant keys while mounted (cleared on unmount). */
export function SetSideKeys({ keys }: { keys: SideKey[] }) {
  const setSideKeys = useContext(DeviceCtx)?.setSideKeys;
  const latest = useRef(keys);
  latest.current = keys;
  const signature = keys.map((k) => `${k.id}:${k.spider}:${k.active}:${k.label}`).join("|");
  useEffect(() => {
    // Callbacks are read through the ref so they never go stale.
    setSideKeys?.(latest.current.map((k, i) => ({ ...k, onPress: () => latest.current[i]?.onPress() })));
  }, [setSideKeys, signature]);
  useEffect(() => () => setSideKeys?.(null), [setSideKeys]);
  return null;
}

/** Push live telemetry while mounted (reset to idle on unmount). */
export function SetTelemetry(t: Telemetry) {
  const setTelemetry = useContext(DeviceCtx)?.setTelemetry;
  const { sig, gps, link, p2p, trk, live, ident } = t;
  useEffect(() => {
    setTelemetry?.({ sig, gps, link, p2p, trk, live, ident });
  }, [setTelemetry, sig, gps, link, p2p, trk, live, ident]);
  useEffect(() => () => setTelemetry?.(IDLE_TELEMETRY), [setTelemetry]);
  return null;
}

// ---------------------------------------------------------------------------
// Frame hardware that reads the context
// ---------------------------------------------------------------------------

export function StatusDisplay() {
  const status = useContext(DeviceCtx)?.status ?? DEFAULT_STATUS;
  return (
    <div className={`status-display${status.text.length > 17 ? " status-display--long" : ""}`} role="status" aria-live="polite">
      <span className={`status-display__led led-${status.led}${status.blink ? " is-blinking" : ""}`} />
      <span className="status-display__text">{status.text}</span>
    </div>
  );
}

/** Bottom-left standing portrait: whoever the current screen is about. */
export function StatusPortrait() {
  const sprite = useContext(DeviceCtx)?.status.sprite ?? DEFAULT_SPIDER;
  return (
    <span className="device__mini" aria-label={`${SPIDER_LABELS[sprite]} spider`}>
      <PixelSprite sprite={SPIDER_SPRITES[sprite]} scale={3} />
    </span>
  );
}

/** Left-edge keys: participant focus buttons on the map, decorative elsewhere. */
export function SideKeys() {
  const keys = useContext(DeviceCtx)?.sideKeys;
  if (!keys) {
    return (
      <>
        <span className="side-tag side-tag--1" aria-hidden>
          <PixelSprite sprite={SPIDER_ICON} scale={1} />
        </span>
        <span className="side-tag side-tag--2" aria-hidden>
          <PixelSprite sprite={SPIDER_ICON} scale={1} />
        </span>
      </>
    );
  }
  return (
    <>
      {keys.slice(0, 2).map((k, i) => (
        <button
          key={k.id}
          type="button"
          className={`side-tag side-tag--${i + 1} side-tag--live${k.active ? " is-active" : ""}`}
          onClick={k.onPress}
          aria-label={k.label}
          aria-pressed={k.active}
        >
          <PixelSprite sprite={spiderHead(k.spider)} scale={1.5} />
          <span className="side-tag__tag" aria-hidden>
            {k.tag}
          </span>
        </button>
      ))}
    </>
  );
}

/** Small asymmetric hardware modules around the badge and on the right rail. */
export function TelemetryModules() {
  const t = useContext(DeviceCtx)?.telemetry ?? IDLE_TELEMETRY;
  return (
    <>
      <div className="hw-mod hw-mod--sig" aria-hidden>
        <span className="hw-mod__label">SIG</span>
        <span className="sigbars">
          {[1, 2, 3, 4].map((b) => (
            <span key={b} className={b <= t.sig ? "is-on" : undefined} style={{ height: 2 + b * 2 }} />
          ))}
        </span>
      </div>

      <div className="hw-mod hw-mod--trk" aria-hidden>
        <span className={`hw-led ${t.live === "live" ? "led-ok is-blinking" : t.live === "stale" ? "led-warn" : t.live === "offline" ? "led-err" : ""}`} />
        <span className="hw-mod__label">TRK</span>
        <span className="hw-mod__val">{String(t.trk).padStart(2, "0")}</span>
      </div>

      <div className="hw-rail" aria-hidden>
        <span className={`hw-rail__led ${t.gps ? "led-ok" : ""}`} />
        <span className="hw-rail__label">GPS</span>
        <span className={`hw-rail__led ${t.link ? "led-ok" : ""}`} />
        <span className="hw-rail__label">LNK</span>
        <span className={`hw-rail__led ${t.p2p ? "led-ok is-blinking" : ""}`} />
        <span className="hw-rail__label">P2P</span>
      </div>

      <div className="hw-ident" aria-hidden>
        <span>{t.gps ? `GPS ${t.gps}` : "GPS --"}</span>
        <span className="hw-ident__sep">//</span>
        <span>ID {t.ident}</span>
      </div>
    </>
  );
}
