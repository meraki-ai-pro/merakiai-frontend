'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly reveals `fullText` character-by-character instead of jumping in the
 * bursty chunks that arrive over the socket. Uses a requestAnimationFrame loop
 * with an ease-out catch-up: the further the displayed text lags behind what's
 * been received, the faster it reveals — so it never falls far behind, but
 * always animates at a steady, readable minimum rate (Mike-style typing feel).
 *
 * Frame-rate independent (advances by elapsed time), and resets automatically
 * when a new turn begins (target becomes shorter than what's shown).
 */
const MIN_CHARS_PER_SEC = 240; // steady floor when nearly caught up
const CATCHUP_PER_MS = 0.0016; // fraction of the backlog revealed per ms

export function useSmoothText(fullText: string, active: boolean): string {
  const [shown, setShown] = useState('');
  const shownLenRef = useRef(0);
  const targetRef = useRef(fullText);
  targetRef.current = fullText;

  // Note: a fresh turn unmounts/remounts this hook (StreamingResponse is only
  // rendered while streaming), so shownLenRef starts at 0 again automatically.
  // A mid-flight shrink (e.g. the final .strip()ed text is a few chars shorter
  // than the accumulated chunks) is handled by clamping in the tick — never a
  // reset, so the answer doesn't re-type at the end.

  useEffect(() => {
    if (!active) {
      shownLenRef.current = 0;
      setShown('');
      return;
    }

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dtMs = Math.min(now - last, 100); // clamp big gaps (tab switch)
      last = now;

      const target = targetRef.current;
      let len = shownLenRef.current;
      if (len > target.length) len = target.length; // target reset mid-flight

      if (len < target.length) {
        const remaining = target.length - len;
        const advance = Math.ceil(
          remaining * (1 - Math.exp(-CATCHUP_PER_MS * dtMs)) +
            (MIN_CHARS_PER_SEC * dtMs) / 1000,
        );
        len = Math.min(target.length, len + Math.max(1, advance));
        shownLenRef.current = len;
        setShown(target.slice(0, len));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return shown;
}
