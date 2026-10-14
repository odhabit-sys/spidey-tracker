"use client";

// /join/[token]: consent screen for the invited person. After START SHARING
// and the first real GPS fix, the invite is accepted and this page turns into
// the same live tracker the creator uses (same publisher, no second tap).

import { useCallback, useEffect, useRef, useState } from "react";
import EqBars from "@/components/EqBars";
import PixelButton from "@/components/PixelButton";
import SpiderPicker from "@/components/SpiderPicker";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import Display, { Loading } from "@/components/tracker/Display";
import LiveTracker from "@/components/tracker/LiveTracker";
import { getInvite, joinInvite, type ErrorCode } from "@/lib/client/api";
import { loadCredentialsForInvite, saveCredentials } from "@/lib/client/participantStore";
import { useCountdown } from "@/lib/client/useCountdown";
import { useLocationPublisher, type AcquireResult, type FailReason } from "@/lib/client/useLocationPublisher";
import { cleanName, isValidName } from "@/lib/names";
import { firstFreeSpider, type SpiderId } from "@/lib/shared/spiders";
import type { InviteInfo, ParticipantCredentials, TrackerStatus } from "@/lib/shared/types";

export default function JoinInvite({ token }: { token: string }) {
  // undefined = not read yet (storage is only available after mount).
  const [stored, setStored] = useState<ParticipantCredentials | null | undefined>(undefined);
  useEffect(() => setStored(loadCredentialsForInvite(token)), [token]);

  if (stored === undefined) {
    return (
      <Display>
        <Loading text="CHECKING INVITE" />
      </Display>
    );
  }
  return <JoinFlow inviteToken={token} stored={stored} />;
}

type Lookup = { kind: "loading" } | { kind: "ready"; invite: InviteInfo } | { kind: "error"; code: ErrorCode };

function JoinFlow({ inviteToken, stored }: { inviteToken: string; stored: ParticipantCredentials | null }) {
  const [creds, setCreds] = useState<ParticipantCredentials | null>(stored);
  const [lookup, setLookup] = useState<Lookup>({ kind: "loading" });
  const [name, setName] = useState("");
  const [spider, setSpider] = useState<SpiderId>("miles");
  const spiderRef = useRef<SpiderId>("miles");
  spiderRef.current = spider;
  // A joined tracker is always active; the joiner has no upload gate to update.
  const ignoreStatus = useCallback((_status: TrackerStatus) => {}, []);
  const nameRef = useRef("");

  // Accept the invite: called by the publisher only after the first real fix.
  const acquireToken = useCallback(async (): Promise<AcquireResult> => {
    const result = await joinInvite(inviteToken, nameRef.current, spiderRef.current);
    if (!result.ok) return { ok: false, reason: failFromApi(result.code) };
    const joined: ParticipantCredentials = {
      sessionId: result.data.sessionId,
      role: "joiner",
      token: result.data.token,
      channelKey: result.data.channelKey,
      expiresAt: result.data.expiresAt,
    };
    const persisted = saveCredentials(joined, inviteToken);
    setCreds(joined);
    return { ok: true, token: joined.token, persisted };
  }, [inviteToken]);

  // A joined tracker is always active, so uploads are allowed immediately.
  const publisher = useLocationPublisher({ token: creds?.token ?? null, acquireToken, canSend: true, persisted: true });

  // Public invite lookup, only needed before this device has joined.
  const load = useCallback(async () => {
    setLookup({ kind: "loading" });
    const result = await getInvite(inviteToken);
    setLookup(result.ok ? { kind: "ready", invite: result.data } : { kind: "error", code: result.code });
  }, [inviteToken]);
  useEffect(() => {
    if (!stored) load();
  }, [stored, load]);

  const invite = lookup.kind === "ready" ? lookup.invite : null;
  const takenSpider = invite?.creatorSpider ?? null;

  // Never pre-select the creator's Spider.
  useEffect(() => {
    if (takenSpider && spider === takenSpider) setSpider(firstFreeSpider(takenSpider));
  }, [takenSpider, spider]);
  const countdown = useCountdown(invite?.expiresAt ?? null, invite?.serverTime ?? null);

  // Joined (now or earlier on this device): the full live tracker.
  if (creds) return <LiveTracker creds={creds} publisher={publisher} onStatus={ignoreStatus} />;

  const creatorName = invite?.creatorName ?? "YOUR FRIEND";
  const start = () => {
    const trimmed = name.trim();
    if (!isValidName(trimmed)) return;
    nameRef.current = trimmed;
    publisher.start();
  };

  if (publisher.failure) {
    // Spider clash (checked server-side): back to the picker with fresh invite info.
    const retry =
      publisher.failure === "spider_taken"
        ? () => {
            publisher.clearFailure();
            void load();
          }
        : start;
    return (
      <Display>
        <JoinFailure reason={publisher.failure} onRetry={retry} />
      </Display>
    );
  }

  if (publisher.phase === "locating" || publisher.phase === "sharing") {
    return (
      <Display>
        <SetDeviceStatus text="REQUESTING GPS..." led="warn" blink sprite={spider} />
        <p className="console__headline">
          {publisher.info.gps === "lost" ? "SEARCHING FOR GPS" : "REQUESTING LOCATION"}
          <span className="cursor">_</span>
        </p>
        <EqBars live />
        <p className="console__copy">
          {publisher.info.gps === "lost" ? "NO GPS SIGNAL YET. TRY MOVING NEAR A WINDOW." : "ALLOW LOCATION ACCESS WHEN YOUR BROWSER ASKS."}
        </p>
        <p className="console__copy console__copy--dim">NOTHING IS SHARED UNTIL YOUR PHONE FINDS YOU.</p>
        <button type="button" className="text-btn" onClick={publisher.stop}>
          CANCEL
        </button>
      </Display>
    );
  }

  if (lookup.kind === "loading") {
    return (
      <Display>
        <Loading text="CHECKING INVITE" />
      </Display>
    );
  }

  if (lookup.kind === "error" || countdown.expired) {
    return (
      <Display>
        <LookupError code={lookup.kind === "error" ? lookup.code : "expired"} onRetry={load} />
      </Display>
    );
  }

  return (
    <Display>
      <SetDeviceStatus text="INVITE RECEIVED" led="ok" sprite={spider} />
      <p className="console__headline">{creatorName} WANTS TO FIND YOU</p>
      <p className="console__copy">
        IF YOU START SHARING, YOU AND {creatorName} WILL SEE EACH OTHER&apos;S APPROXIMATE LIVE LOCATION UNTIL EITHER OF YOU
        STOPS SHARING OR THIS TRACKER EXPIRES.
      </p>
      <p className="console__copy console__copy--dim">NOTHING IS SHARED UNTIL YOU PRESS START.</p>

      <label className="console__label" htmlFor="friend-name">
        ENTER YOUR CODENAME
      </label>
      <div className="readout">
        <span className="readout__prompt" aria-hidden>
          &gt;
        </span>
        <input
          id="friend-name"
          className="readout__input"
          value={name}
          onChange={(e) => setName(cleanName(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && start()}
          placeholder="YOUR NAME"
          autoComplete="nickname"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
        />
      </div>
      <SpiderPicker value={spider} onChange={setSpider} taken={takenSpider} />
      <PixelButton variant="screen" onClick={start} disabled={!isValidName(name.trim())}>
        START SHARING
      </PixelButton>
      <p className="console__foot">TRACKER EXPIRES IN {countdown.label}</p>
    </Display>
  );
}

function failFromApi(code: ErrorCode): FailReason {
  if (code === "expired" || code === "invite_used" || code === "network" || code === "spider_taken") return code;
  if (code === "not_found") return "ended";
  return "server";
}

// `status` is the short text for the bottom display (~19 characters fit).
const JOIN_FAIL_COPY: Record<FailReason, { title: string; status: string; body: string; retry?: boolean }> = {
  denied: {
    title: "LOCATION ACCESS DENIED",
    status: "ACCESS DENIED",
    body: "NOTHING WAS SHARED. TO SHARE, ALLOW LOCATION FOR THIS SITE IN YOUR BROWSER SETTINGS, THEN TRY AGAIN.",
    retry: true,
  },
  unsupported: { title: "LOCATION NOT AVAILABLE", status: "NO LOCATION", body: "THIS BROWSER CAN'T SHARE LOCATION HERE. OPEN THE LINK IN SAFARI OR CHROME." },
  expired: { title: "TRACKER EXPIRED", status: "TRACKER EXPIRED", body: "ASK YOUR FRIEND TO CREATE A NEW TRACKER." },
  ended: { title: "TRACKER ENDED", status: "TRACKER ENDED", body: "THIS TRACKER WAS ENDED. NOTHING WAS SHARED." },
  invite_used: {
    title: "INVITE ALREADY USED",
    status: "INVITE USED",
    body: "THIS INVITE IS ALREADY IN USE IN ANOTHER TAB, BROWSER OR DEVICE. OPEN IT WHERE YOU STARTED, OR IT ENDS WHEN THE TRACKER EXPIRES.",
  },
  network: { title: "CONNECTION LOST", status: "CONNECTION LOST", body: "COULDN'T REACH THE TRACKER. NOTHING WAS SHARED.", retry: true },
  server: { title: "TRACKER NETWORK DOWN", status: "NETWORK DOWN", body: "NOTHING WAS SHARED. TRY AGAIN IN A MOMENT.", retry: true },
  spider_taken: {
    title: "SPIDER TAKEN",
    status: "SPIDER TAKEN",
    body: "YOUR FRIEND ALREADY USES THAT SPIDER. NOTHING WAS SHARED. PICK ANOTHER ONE.",
    retry: true,
  },
};

function JoinFailure({ reason, onRetry }: { reason: FailReason; onRetry: () => void }) {
  const copy = JOIN_FAIL_COPY[reason];
  return (
    <>
      <SetDeviceStatus text={copy.status} led="err" />
      <p className="console__headline">{copy.title}</p>
      <p className="console__copy">{copy.body}</p>
      {reason === "denied" && (
        <p className="console__copy console__copy--dim">
          IPHONE: SETTINGS › PRIVACY &amp; SECURITY › LOCATION SERVICES › SAFARI WEBSITES › WHILE USING THE APP
        </p>
      )}
      {copy.retry && (
        <PixelButton variant="screen" onClick={onRetry}>
          TRY AGAIN
        </PixelButton>
      )}
    </>
  );
}

const LOOKUP_COPY: Partial<Record<ErrorCode, { title: string; status: string; body: string }>> = {
  not_found: { title: "SESSION NOT FOUND", status: "NOT FOUND", body: "THIS INVITE LINK IS NOT VALID." },
  expired: { title: "TRACKER EXPIRED", status: "TRACKER EXPIRED", body: "ASK YOUR FRIEND TO CREATE A NEW TRACKER." },
  invite_used: JOIN_FAIL_COPY.invite_used,
  network: { title: "CONNECTION LOST", status: "CONNECTION LOST", body: "CHECK YOUR INTERNET AND TRY AGAIN." },
};

function LookupError({ code, onRetry }: { code: ErrorCode; onRetry: () => void }) {
  const copy = LOOKUP_COPY[code] ?? { title: "TRACKER NETWORK DOWN", status: "NETWORK DOWN", body: "TRY AGAIN IN A MOMENT." };
  const retryable = code === "network" || code === "server" || code === "rate_limited";
  return (
    <>
      <SetDeviceStatus text={copy.status} led="err" />
      <p className="console__headline">{copy.title}</p>
      <p className="console__copy">{copy.body}</p>
      {retryable && (
        <PixelButton variant="screen" onClick={onRetry}>
          RETRY
        </PixelButton>
      )}
    </>
  );
}
