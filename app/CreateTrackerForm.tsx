"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import EqBars from "@/components/EqBars";
import PixelButton from "@/components/PixelButton";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import { cleanName, isValidName } from "@/lib/names";
import { createSession } from "@/lib/client/api";
import { saveCredentials } from "@/lib/client/participantStore";

export default function CreateTrackerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!isValidName(trimmed)) {
      setError("ENTER A NAME FIRST");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createSession(trimmed);
    if (result.ok) {
      saveCredentials(result.data);
      router.push(`/tracker/${result.data.sessionId}`);
    } else {
      setError(result.message);
      setBusy(false);
    }
  }

  return (
    <form className="console" onSubmit={onSubmit} noValidate>
      {busy && <SetDeviceStatus text="CREATING TRACKER..." led="warn" blink />}
      {error && <SetDeviceStatus text="ERROR" led="err" />}

      <p className="console__headline">
        READY TO TRACK<span className="cursor">_</span>
      </p>
      <EqBars />

      <label className="console__label" htmlFor="creator-name">
        WHAT SHOULD YOUR FRIEND CALL YOU?
      </label>
      <div className="readout">
        <span className="readout__prompt" aria-hidden>
          &gt;
        </span>
        <input
          id="creator-name"
          className="readout__input"
          value={name}
          onChange={(e) => setName(cleanName(e.target.value))}
          placeholder="YOUR NAME"
          autoComplete="nickname"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
        />
      </div>

      {error && (
        <p className="console__error" role="alert">
          ! {error}
        </p>
      )}

      <PixelButton type="submit" variant="screen" disabled={busy}>
        {busy ? <span className="blink">CREATING...</span> : "CREATE TRACKER"}
      </PixelButton>

      <p className="console__foot">MUTUAL TRACKING • EXPIRES AFTER 1 HOUR</p>
    </form>
  );
}
