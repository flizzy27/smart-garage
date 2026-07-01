"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type InstallPromptContextValue = {
  /** True when the app is currently running as an installed/standalone app. */
  isStandalone: boolean;
  /** True when the browser has offered a native install prompt we can trigger. */
  canInstall: boolean;
  /** Triggers the native browser install prompt, if one is available. */
  promptInstall: () => Promise<InstallOutcome>;
};

const InstallPromptContext = createContext<InstallPromptContextValue>({
  isStandalone: false,
  canInstall: false,
  promptInstall: async () => "unavailable",
});

/** Reads whether the app is installed/standalone and exposes the native install prompt, if offered. */
export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone === true;
}

/**
 * Captures the browser's `beforeinstallprompt` event once, near the app root,
 * so it stays available even if the user navigates to Settings later (the
 * event fires once per page load and is otherwise lost if nothing listens).
 * Never triggers the prompt automatically — only `promptInstall()` (called
 * from an explicit user action) does.
 */
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Mount-only: `window` doesn't exist during SSR, so the real display
    // mode can only be read once mounted in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount sync
    setIsStandalone(detectStandalone());
    const query = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => setIsStandalone(detectStandalone());
    query.addEventListener("change", handleChange);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredEvent(null);
      setIsStandalone(detectStandalone());
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      query.removeEventListener("change", handleChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredEvent) return "unavailable";
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return outcome;
  }, [deferredEvent]);

  return (
    <InstallPromptContext.Provider
      value={{ isStandalone, canInstall: deferredEvent !== null, promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}
