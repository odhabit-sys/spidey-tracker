"use client";

import { useEffect, useState } from "react";
import PixelButton from "@/components/PixelButton";

/** Share the private invite link: Web Share API first, clipboard as fallback. */
export default function InvitePanel({ inviteToken, creatorName }: { inviteToken: string; creatorName: string }) {
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/join/${inviteToken}`);
    setCanShare(typeof navigator.share === "function");
  }, [inviteToken]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("LINK COPIED");
    } catch {
      setNotice("HOLD THE LINK ABOVE TO COPY IT");
    }
  }

  async function share() {
    if (!canShare) return copy();
    try {
      await navigator.share({
        title: "JOIN MY SPIDEY TRACKER",
        text: `${creatorName} invited you to a Spidey Tracker. You'll see each other's location only while you both choose to share.`,
        url,
      });
      setNotice("INVITE SENT");
    } catch (err) {
      // AbortError = the user closed the share sheet; anything else, fall back to copying.
      if ((err as DOMException)?.name !== "AbortError") await copy();
    }
  }

  return (
    <div className="invite">
      <p className="console__label">JOIN MY SPIDEY TRACKER</p>
      <div className="readout readout--link">
        <span className="readout__prompt" aria-hidden>
          &gt;
        </span>
        <input className="readout__input readout__input--link" value={url} readOnly aria-label="Private invite link" onFocus={(e) => e.currentTarget.select()} />
      </div>
      <div className="invite__actions">
        <PixelButton variant="screen" onClick={share} disabled={!url}>
          INVITE FRIEND
        </PixelButton>
        {canShare && (
          <button type="button" className="text-btn" onClick={copy}>
            COPY LINK
          </button>
        )}
      </div>
      {notice && (
        <p className="console__label" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
