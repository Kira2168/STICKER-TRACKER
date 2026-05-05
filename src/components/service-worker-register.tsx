"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        // Keep silent; failing to register SW shouldn't block the app.
        console.warn("Service worker registration failed", err);
      }
    };

    void register();
  }, []);

  return null;
}
