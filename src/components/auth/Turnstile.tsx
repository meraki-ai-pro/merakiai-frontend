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

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export const TURNSTILE_SITE_KEY = process.env.NEXT_TURNSTILE_SITE_KEY ?? '';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
  getResponse: (id?: string) => string | undefined;
  isExpired: (id?: string) => boolean;
};

export interface TurnstileHandle {
  /** Read the live widget token, not a stale React-state copy. */
  getToken: () => string | null;
  /** Consume the current attempt and display a fresh challenge. */
  reset: () => void;
}

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

export const Turnstile = forwardRef<TurnstileHandle, {
  /** The verified token, or null when it expires, errors or is reset. */
  onToken: (token: string | null) => void;
  /** Change this number to clear the widget for a new attempt. */
  resetKey?: number;
}>(function Turnstile({
  onToken,
  resetKey = 0,
}, ref) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenIssuedAt = useRef(0);
  const tokenCb = useRef(onToken);
  tokenCb.current = onToken;

  const resetWidget = () => {
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    tokenIssuedAt.current = 0;
    tokenCb.current(null);
  };

  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (!widget.current || !window.turnstile) return null;
      if (window.turnstile.isExpired(widget.current)) return null;
      return window.turnstile.getResponse(widget.current) || null;
    },
    reset: resetWidget,
  }));

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current || widget.current) return;
        widget.current = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          size: 'flexible',
          retry: 'auto',
          'refresh-expired': 'auto',
          'refresh-timeout': 'auto',
          callback: (t: string) => {
            tokenIssuedAt.current = Date.now();
            tokenCb.current(t);
          },
          'expired-callback': () => {
            tokenIssuedAt.current = 0;
            tokenCb.current(null);
          },
          'timeout-callback': () => {
            tokenIssuedAt.current = 0;
            tokenCb.current(null);
          },
          'error-callback': () => {
            tokenIssuedAt.current = 0;
            tokenCb.current(null);
          },
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
    if (resetKey) resetWidget();
  }, [resetKey]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const refreshIfStale = (force = false) => {
      const age = tokenIssuedAt.current ? Date.now() - tokenIssuedAt.current : 0;
      if (force || age > 4 * 60 * 1000) resetWidget();
    };
    const onPageShow = (event: PageTransitionEvent) => refreshIfStale(event.persisted);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshIfStale();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="flex min-h-[65px] justify-center" data-testid="turnstile" />;
});
