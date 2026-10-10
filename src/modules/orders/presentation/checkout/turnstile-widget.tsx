"use client";

import { useEffect, useRef } from "react";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | undefined;

/** Loads Cloudflare's script once. The script tag is added by our own (nonce'd) code. */
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error("turnstile script failed"));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  reset(): void;
}

/**
 * Cloudflare Turnstile widget. The token is single use: after every submit the parent
 * calls `reset()` through `handleRef`. The server verifies the token; this only collects it.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  handleRef,
}: {
  readonly siteKey: string;
  readonly onToken: (token: string | null) => void;
  readonly handleRef: { current: TurnstileHandle | null };
}) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
        handleRef.current = {
          reset: () => {
            onTokenRef.current(null);
            if (widgetId) window.turnstile?.reset(widgetId);
          },
        };
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      handleRef.current = null;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, handleRef]);

  return <div ref={container} data-testid="turnstile" className="min-h-16" />;
}
