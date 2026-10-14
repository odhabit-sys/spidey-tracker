"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PixelButton from "@/components/PixelButton";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import Display, { Loading } from "@/components/tracker/Display";
import LiveTracker from "@/components/tracker/LiveTracker";
import { loadCredentials } from "@/lib/client/participantStore";
import { useLocationPublisher } from "@/lib/client/useLocationPublisher";
import type { ParticipantCredentials, TrackerStatus } from "@/lib/shared/types";

/**
 * /tracker/[id]: opens a tracker using the capability stored on THIS device
 * (normally the creator's). Capabilities never come from the URL.
 */
export default function CreatorTracker({ sessionId }: { sessionId: string }) {
  // undefined = not read yet (storage is only available after mount).
  const [creds, setCreds] = useState<ParticipantCredentials | null | undefined>(undefined);
  useEffect(() => setCreds(loadCredentials(sessionId)), [sessionId]);

  if (creds === undefined) {
    return (
      <Display>
        <Loading text="CONNECTING" />
      </Display>
    );
  }
  if (!creds) return <NotOnDevice />;
  return <TrackerWithPublisher creds={creds} />;
}

function TrackerWithPublisher({ creds }: { creds: ParticipantCredentials }) {
  const [status, setStatus] = useState<TrackerStatus>("waiting");
  // Creating a tracker never shares location: the publisher only starts on an explicit START SHARING press.
  const publisher = useLocationPublisher({ token: creds.token, canSend: status === "active", persisted: true });
  return <LiveTracker creds={creds} publisher={publisher} onStatus={setStatus} />;
}

function NotOnDevice() {
  const router = useRouter();
  return (
    <Display>
      <SetDeviceStatus text="NO TRACKER" led="err" />
      <p className="console__headline">TRACKER NOT ON THIS DEVICE</p>
      <p className="console__copy">ONLY THE PHONE THAT CREATED OR JOINED A TRACKER CAN OPEN IT.</p>
      <PixelButton variant="screen" onClick={() => router.push("/")}>
        NEW TRACKER
      </PixelButton>
    </Display>
  );
}
