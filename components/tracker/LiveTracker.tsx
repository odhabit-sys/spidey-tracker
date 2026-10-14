"use client";

// One live tracker experience for BOTH participants (creator and joiner).
// Server state decides what is visible; strict reciprocity is enforced by the
// API (you only receive the other person's location while you share yours).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EqBars from "@/components/EqBars";
import PixelButton from "@/components/PixelButton";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import { endTracker, getTrackerState, type ErrorCode } from "@/lib/client/api";
import { forgetCredentials } from "@/lib/client/participantStore";
import { subscribeToTracker } from "@/lib/client/realtime";
import { useCountdown, useServerNow } from "@/lib/client/useCountdown";
import type { FailReason, Publisher } from "@/lib/client/useLocationPublisher";
import { useWakeLock } from "@/lib/client/useWakeLock";
import { formatAccuracy } from "@/lib/distance";
import { formatAgo, freshness } from "@/lib/shared/tracking";
import type { ParticipantCredentials, TrackerState, TrackerStatus } from "@/lib/shared/types";
import Display, { Loading } from "./Display";
import EndButton from "./EndButton";
import InvitePanel from "./InvitePanel";
import TrackingView from "./TrackingView";

/** Fallback refresh in case a Realtime ping is missed. */
const POLL_MS = 10_000;

type Fatal = "not_found" | "expired" | "ended";

interface Props {
  creds: ParticipantCredentials;
  publisher: Publisher;
  /** Lets the owner of the publisher hold uploads until the friend has joined. */
  onStatus: (status: TrackerStatus) => void;
}

export default function LiveTracker({ creds, publisher, onStatus }: Props) {
  const router = useRouter();
  const [state, setState] = useState<TrackerState | null>(null);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [netError, setNetError] = useState<ErrorCode | null>(null);
  const [ending, setEnding] = useState(false);
  const inFlight = useRef(false);
  const endingRef = useRef(false); // our own END triggers a realtime ping; don't treat it as "not found"

  const countdown = useCountdown(state?.expiresAt ?? creds.expiresAt, state?.serverTime ?? null);
  const serverNow = useServerNow(state?.serverTime ?? null);
  const { halt } = publisher;

  const finish = useCallback(
    (kind: Fatal) => {
      halt();
      forgetCredentials(creds.sessionId);
      setFatal(kind);
    },
    [creds.sessionId, halt],
  );

  const refresh = useCallback(async () => {
    if (inFlight.current || endingRef.current) return;
    inFlight.current = true;
    const result = await getTrackerState(creds.sessionId, creds.token);
    inFlight.current = false;
    if (result.ok) {
      setState(result.data);
      onStatus(result.data.status);
      setNetError(null);
    } else if (result.code === "not_found" || result.code === "expired") {
      finish(result.code);
    } else {
      setNetError(result.code); // keep showing the last good state
    }
  }, [creds.sessionId, creds.token, finish, onStatus]);

  useEffect(() => {
    if (fatal) return;
    refresh();
    const unsubscribe = subscribeToTracker(creds.channelKey, refresh, () => {});
    const poll = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [creds.channelKey, fatal, refresh]);

  // The publisher discovered the tracker is gone (END elsewhere / expiry).
  useEffect(() => {
    if (publisher.failure === "ended") finish("ended");
    else if (publisher.failure === "expired") finish("expired");
  }, [publisher.failure, finish]);

  useEffect(() => {
    if (countdown.expired && !fatal) finish("expired");
  }, [countdown.expired, fatal, finish]);

  // Refresh right after my own sharing starts/stops so the screen follows.
  useEffect(() => {
    void refresh();
  }, [publisher.phase, refresh]);

  useWakeLock(publisher.phase === "sharing");

  async function onEnd() {
    setEnding(true);
    endingRef.current = true;
    const result = await endTracker(creds.sessionId, creds.token);
    if (result.ok || result.code === "not_found" || result.code === "expired") {
      finish("ended");
    } else {
      endingRef.current = false;
      setNetError(result.code);
    }
    setEnding(false);
  }

  // ---- Terminal states ------------------------------------------------------
  if (fatal) {
    const copy = FATAL_COPY[fatal];
    return (
      <Display>
        <SetDeviceStatus text={copy.status} led="err" />
        <p className="console__headline">{copy.title}</p>
        <p className="console__copy">{copy.body}</p>
        <PixelButton variant="screen" onClick={() => router.push("/")}>
          NEW TRACKER
        </PixelButton>
      </Display>
    );
  }

  if (!state) {
    return (
      <Display>
        <Loading text="CONNECTING" />
      </Display>
    );
  }

  const peer = state.peer.name ?? "YOUR FRIEND";
  const iAmPublishing = publisher.phase === "sharing" || publisher.phase === "locating";
  const endControl = <EndButton onEnd={onEnd} ending={ending} variant="text" />;
  const foot = <p className="console__foot">TRACKER EXPIRES IN {countdown.label}</p>;
  const netLine = netError && <p className="console__error">! CONNECTION LOST. RETRYING...</p>;

  // ---- Location problem on this device (denied / unsupported / network) ----
  if (publisher.failure && publisher.failure !== "ended" && publisher.failure !== "expired") {
    const copy = PUBLISH_FAIL_COPY[publisher.failure];
    return (
      <Display>
        <SetDeviceStatus text={copy.status} led="err" />
        <p className="console__headline">{copy.title}</p>
        <p className="console__copy">{copy.body}</p>
        {publisher.failure === "denied" && (
          <p className="console__copy console__copy--dim">
            IPHONE: SETTINGS › PRIVACY &amp; SECURITY › LOCATION SERVICES › SAFARI WEBSITES › WHILE USING THE APP
          </p>
        )}
        <PixelButton variant="screen" onClick={publisher.start}>
          TRY AGAIN
        </PixelButton>
        {foot}
        {endControl}
      </Display>
    );
  }

  // ---- Waiting for the invite to be accepted (creator only) ----------------
  if (state.status === "waiting") {
    return (
      <Display>
        <SetDeviceStatus text="WAITING FOR FRIEND" led="warn" blink />
        <p className="console__headline">
          WAITING FOR FRIEND<span className="cursor">_</span>
        </p>
        <EqBars live />
        {creds.inviteToken && <InvitePanel inviteToken={creds.inviteToken} creatorName={state.me.name} />}
        {iAmPublishing ? (
          <p className="console__copy console__copy--dim">LOCATION READY. YOU START SHARING AS SOON AS YOUR FRIEND JOINS.</p>
        ) : (
          <button type="button" className="text-btn text-btn--cyan" onClick={publisher.start}>
            START SHARING NOW
          </button>
        )}
        {netLine}
        {foot}
        {endControl}
      </Display>
    );
  }

  // ---- Active: I'm requesting my first fix --------------------------------
  if (publisher.phase === "locating") {
    return (
      <Display>
        <SetDeviceStatus text="REQUESTING GPS..." led="warn" blink />
        <p className="console__headline">
          {publisher.info.gps === "lost" ? "SEARCHING FOR GPS" : "REQUESTING LOCATION"}
          <span className="cursor">_</span>
        </p>
        <EqBars live />
        <p className="console__copy">
          {publisher.info.gps === "lost" ? "NO GPS SIGNAL YET. TRY MOVING NEAR A WINDOW." : "ALLOW LOCATION ACCESS WHEN YOUR BROWSER ASKS."}
        </p>
        <button type="button" className="text-btn" onClick={publisher.stop}>
          CANCEL
        </button>
      </Display>
    );
  }

  // ---- Active: I'm sharing and the other person is visible -> MAP ---------
  const peerLoc = state.peer.location;
  if (publisher.phase === "sharing" && peerLoc) {
    const ageMs = Math.max(0, serverNow - Date.parse(peerLoc.updatedAt));
    return (
      <TrackingView
        peerName={peer}
        peerLocation={peerLoc}
        ageMs={ageMs}
        freshness={freshness(ageMs)}
        me={publisher.myFix}
        expiresLabel={countdown.label}
        connectionLost={Boolean(netError)}
        myUploadStalled={publisher.info.stalled}
        stopping={false}
        onStop={publisher.stop}
        ending={ending}
        onEnd={onEnd}
      />
    );
  }

  // ---- Active: I'm sharing, waiting for the other person ------------------
  if (publisher.phase === "sharing" || publisher.phase === "stopping") {
    const peerStopped = state.peer.share === "stopped";
    const { info } = publisher;
    return (
      <Display compact>
        <SetDeviceStatus
          text={info.net === "offline" ? "CONNECTION LOST" : info.stalled ? "UPDATES STALLED" : "SHARING LOCATION"}
          led={info.net === "offline" ? "err" : info.stalled ? "warn" : "ok"}
          blink={!info.stalled && info.net !== "offline"}
        />
        <p className="console__headline sharing-title">
          <span className="sharing-dot" aria-hidden />
          {peerStopped ? `${peer} STOPPED SHARING` : `WAITING FOR ${peer}`}
        </p>
        <p className="console__copy console__copy--dim">
          {peerStopped
            ? `YOU'LL SEE ${peer} AGAIN IF THEY START SHARING.`
            : state.peer.share === "idle"
              ? `${peer} HASN'T STARTED SHARING YET. YOU'LL SEE EACH OTHER ONCE THEY DO.`
              : `WAITING FOR ${peer}'S NEXT LOCATION...`}
        </p>
        <SharingReadout info={info} now={Date.now()} expiresLabel={countdown.label} />
        {process.env.NODE_ENV !== "production" && (
          <p className="diag" aria-hidden>
            DEV FIX {publisher.diag.fixes} · SENT {publisher.diag.sent} · SKIP {publisher.diag.skipped} · OLD {publisher.diag.tooOld} · REJ{" "}
            {publisher.diag.rejected} · RST {publisher.diag.restarts}
          </p>
        )}
        {netLine}
        <PixelButton variant="red" className="stop-btn" onClick={publisher.stop} disabled={publisher.phase === "stopping"}>
          {publisher.phase === "stopping" ? <span className="blink">STOPPING...</span> : "STOP SHARING"}
        </PixelButton>
        {endControl}
      </Display>
    );
  }

  // ---- Active: I'm NOT sharing (never started, stopped, or paused) --------
  const pausedByReload = state.me.share === "sharing"; // server still thinks I'm sharing: page was closed/reloaded
  const peerSharing = state.peer.share === "sharing";
  return (
    <Display>
      <SetDeviceStatus text={pausedByReload ? "SHARING PAUSED" : "NOT SHARING"} led="warn" />
      <p className="console__headline">
        {pausedByReload
          ? "SHARING PAUSED"
          : state.me.share === "stopped"
            ? "YOU STOPPED SHARING"
            : state.role === "creator"
              ? `${peer} JOINED`
              : `CONNECTED TO ${peer}`}
      </p>
      <p className="console__copy">
        {pausedByReload
          ? "SHARING PAUSED BECAUSE THIS PAGE WAS CLOSED OR RELOADED."
          : `IF YOU START SHARING, YOU AND ${peer} WILL SEE EACH OTHER'S APPROXIMATE LIVE LOCATION UNTIL EITHER OF YOU STOPS OR THIS TRACKER EXPIRES.`}
      </p>
      <p className="console__copy console__copy--dim">
        {peerSharing ? `${peer} IS SHARING.` : `${peer} IS NOT SHARING RIGHT NOW.`} YOU ONLY SEE EACH OTHER WHILE YOU BOTH SHARE.
      </p>
      {publisher.stopUnconfirmed && (
        <p className="console__error">! COULDN&apos;T REACH THE SERVER TO DELETE YOUR LAST POSITION. IT EXPIRES WITH THE TRACKER.</p>
      )}
      {netLine}
      <PixelButton variant="screen" onClick={publisher.start}>
        {pausedByReload ? "RESUME SHARING" : "START SHARING"}
      </PixelButton>
      {pausedByReload && (
        <PixelButton variant="red" onClick={publisher.stop}>
          STOP SHARING
        </PixelButton>
      )}
      {foot}
      {endControl}
    </Display>
  );
}

function SharingReadout({ info, now, expiresLabel }: { info: Publisher["info"]; now: number; expiresLabel: string }) {
  return (
    <dl className="readout-grid">
      <dt>YOUR GPS</dt>
      <dd className={info.gps === "lost" ? "is-warn" : undefined}>
        {info.gps === "lost" ? "SIGNAL LOST" : info.accuracy === null ? "SEARCHING..." : formatAccuracy(info.accuracy)}
      </dd>
      <dt>LAST SENT</dt>
      <dd className={info.stalled ? "is-warn" : undefined}>
        {info.lastSentAt ? formatAgo(now - info.lastSentAt) : info.stalled ? "NOT DELIVERED YET" : "SENDING..."}
      </dd>
      <dt>LINK</dt>
      <dd className={info.net === "offline" ? "is-err" : undefined}>{info.net === "offline" ? "OFFLINE - RETRYING" : "ONLINE"}</dd>
      <dt>EXPIRES</dt>
      <dd>{expiresLabel}</dd>
    </dl>
  );
}

const FATAL_COPY: Record<Fatal, { title: string; body: string; status: string }> = {
  not_found: { title: "TRACKER NOT FOUND", body: "THIS TRACKER NO LONGER EXISTS.", status: "NOT FOUND" },
  expired: { title: "TRACKER EXPIRED", body: "ALL LOCATION DATA HAS BEEN DELETED.", status: "TRACKER EXPIRED" },
  ended: { title: "TRACKER ENDED", body: "ALL LOCATION DATA HAS BEEN DELETED.", status: "TRACKER ENDED" },
};

const PUBLISH_FAIL_COPY: Record<Exclude<FailReason, "ended" | "expired">, { title: string; status: string; body: string }> = {
  denied: {
    title: "LOCATION ACCESS DENIED",
    status: "ACCESS DENIED",
    body: "YOU'RE NOT SHARING. TO SHARE, ALLOW LOCATION FOR THIS SITE IN YOUR BROWSER SETTINGS, THEN TRY AGAIN.",
  },
  unsupported: { title: "LOCATION NOT AVAILABLE", status: "NO LOCATION", body: "THIS BROWSER CAN'T SHARE LOCATION HERE. OPEN THE LINK IN SAFARI OR CHROME." },
  invite_used: { title: "INVITE ALREADY USED", status: "INVITE USED", body: "THIS INVITE WAS ACCEPTED ON ANOTHER DEVICE." },
  network: { title: "CONNECTION LOST", status: "CONNECTION LOST", body: "COULDN'T REACH THE TRACKER. TRY AGAIN." },
  server: { title: "TRACKER NETWORK DOWN", status: "NETWORK DOWN", body: "TRY AGAIN IN A MOMENT." },
};
