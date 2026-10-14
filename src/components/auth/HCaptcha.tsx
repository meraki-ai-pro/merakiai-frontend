'use client';

/**
 * hCaptcha widget for the password forms (sign-up, sign-in, forgot password,
 * change password).
 *
 * Supabase Auth verifies the token server-side once captcha protection is
 * switched on in the dashboard; our backend only forwards it. With no
 * NEXT_PUBLIC_HCAPTCHA_SITE_KEY this renders nothing and the forms behave as
 * they did before, which is what lets the code ship ahead of the dashboard
 * switch.
 *
 * Loaded from hCaptcha's own script (render=explicit) rather than an npm
 * wrapper. Tokens are single-use: bump `resetKey` after any failed submit so
 * the student gets a fresh challenge instead of a reused, rejected token.
 */

import { useEffect, useRef } from 'react';

export const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '';

type HCaptchaApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
  }
}

let scriptPromise: Promise<HCaptchaApi> | null = null;

function loadHCaptcha(): Promise<HCaptchaApi> {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.onload = () => (window.hcaptcha ? resolve(window.hcaptcha) : reject(new Error('hCaptcha missing')));
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error('Could not load hCaptcha'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function HCaptcha({
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
    if (!HCAPTCHA_SITE_KEY || !box.current) return;
    let cancelled = false;
    loadHCaptcha()
      .then((api) => {
        if (cancelled || !box.current || widget.current) return;
        widget.current = api.render(box.current, {
          sitekey: HCAPTCHA_SITE_KEY,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (t: string) => tokenCb.current(t),
          'expired-callback': () => tokenCb.current(null),
          'error-callback': () => tokenCb.current(null),
        });
      })
      .catch(() => tokenCb.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.hcaptcha) window.hcaptcha.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current && window.hcaptcha) {
      window.hcaptcha.reset(widget.current);
      tokenCb.current(null);
    }
  }, [resetKey]);

  if (!HCAPTCHA_SITE_KEY) return null;
  return <div ref={box} className="flex min-h-[78px] justify-center" data-testid="hcaptcha" />;
}
