"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isAndroidDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  // @ts-expect-error - iOS Safari standalone flag
  const iosStandalone = typeof window.navigator.standalone === "boolean" ? window.navigator.standalone : false;
  return Boolean(mq || iosStandalone);
}

export function InstallToPhone() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone] = useState(() => isInStandaloneMode());
  const ios = useMemo(() => isIosDevice(), []);
  const android = useMemo(() => isAndroidDevice(), []);

  useEffect(() => {
    const handler = (e: Event) => {
      // Chrome/Edge on Android
      e.preventDefault?.();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone) return null;

  const canPrompt = Boolean(deferredPrompt);

  // For Android we always show a suggestion card.
  // Some browsers fire `beforeinstallprompt` only after a short delay or interaction.
  if (!canPrompt && !ios && !android) return null;

  return (
    <div className="mt-5 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Install</p>
      {canPrompt ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Install Little on your phone for a faster experience.</p>
          <button
            type="button"
            onClick={async () => {
              const promptEvent = deferredPrompt;
              if (!promptEvent) return;
              await promptEvent.prompt();
              try {
                const choice = await promptEvent.userChoice;
                if (choice.outcome === "accepted") {
                  setDeferredPrompt(null);
                }
              } catch {
                // ignore
              }
            }}
            className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Install
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-300">
          {ios ? (
            <>
              On iPhone: tap <span className="font-semibold text-white">Share</span> then{' '}
              <span className="font-semibold text-white">Add to Home Screen</span>.
            </>
          ) : (
            <>
              On Android: open the browser menu (<span className="font-semibold text-white">⋮</span>) and tap{' '}
              <span className="font-semibold text-white">Install app</span> (or{' '}
              <span className="font-semibold text-white">Add to Home screen</span>).
            </>
          )}
        </p>
      )}
    </div>
  );
}
