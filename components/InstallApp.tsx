"use client";

// A quiet "add to phone" line on the home screen only (never on tracker pages).
//   Chromium/Android: uses the browser's own install prompt when it's offered.
//   iPhone/iPad Safari: no prompt API exists, so it shows Share -> Add to Home Screen.
// Hidden when already installed or after the person dismisses it.

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "spidey:install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export default function InstallApp() {
  const [mode, setMode] = useState<"none" | "prompt" | "ios">("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // storage blocked: still offer it
    }
    if (isIos()) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's mini-infobar away; we offer it quietly instead
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("none");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "none") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setMode("none");
  };

  const install = async () => {
    if (mode === "ios") {
      setShowHelp((v) => !v);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The browser only offers its prompt once per page load.
    setDeferred(null);
    setMode("none");
  };

  return (
    <div className="install">
      <div className="install__row">
        <button type="button" className="install__link" onClick={install} aria-expanded={mode === "ios" ? showHelp : undefined}>
          <span className="install__icon" aria-hidden>
            +
          </span>
          ADD SPIDEY TO YOUR PHONE
        </button>
        <button type="button" className="install__close" onClick={dismiss} aria-label="Hide install hint">
          ×
        </button>
      </div>
      {mode === "ios" && showHelp && (
        <p className="install__help">
          TAP{" "}
          <svg className="install__share" viewBox="0 0 9 11" width="9" height="11" shapeRendering="crispEdges" aria-hidden>
            <path d="M4 0h1v7H4zM3 1h3v1H3zM2 2h1v1H2zM6 2h1v1H6zM0 4h3v1H1v5h7V5H6V4h3v7H0z" fill="currentColor" />
          </svg>{" "}
          SHARE, THEN &quot;ADD TO HOME SCREEN&quot;
        </p>
      )}
    </div>
  );
}
