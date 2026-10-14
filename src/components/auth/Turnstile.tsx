'use client';

/**
 * Cloudflare Turnstile widget for the password forms (sign-up, sign-in,
 * forgot password, change password).
 *
 * Supabase Auth verifies the token server-side once captcha protection is
 * switched on in the dashboard (provider: Turnstile); our backend only
 * forwards it. With no NEXT_TURNSTILE_SITE_KEY this renders nothing and
 * the forms behave as they did before, which is what lets the code ship ahead
 * of the dashboard switch.
 *
 * Loaded from Cloudflare's own script (render=explicit) rather than an npm
 * wrapper. Tokens are single-use: bump `resetKey` after any failed submit so
 * the user gets a fresh token instead of a reused, rejected one.
 */

import { useEffect, useRef } from 'react';

export const TURNSTILE_SITE_KEY = process.env.NEXT_TURNSTILE_SITE_KEY ?? '';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')));
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error('Could not load Turnstile'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function Turnstile({
  onToken,
  resetKey = 0,
}: {
  /** The verified token, or null when it expires, errors or is reset. */
  onToken: (token: string | null) => void;
  /** Change this number to clear the widget for a new attempt. */
  resetKey?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenCb = useRef(onToken);
  tokenCb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current || widget.current) return;
        widget.current = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (t: string) => tokenCb.current(t),
          'expired-callback': () => tokenCb.current(null),
          'error-callback': () => tokenCb.current(null),
        });
      })
      .catch(() => tokenCb.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      tokenCb.current(null);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="flex min-h-[65px] justify-center" data-testid="turnstile" />;
}
