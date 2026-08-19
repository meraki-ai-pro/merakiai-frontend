import { test, expect } from '@playwright/test';
import { caption, loginAs } from './helpers';

/**
 * Diagnostic, not part of the client walkthrough.
 *
 * The recorded student run leaves the avatar on "Connecting your AI tutor…".
 * The backend side demonstrably works — the API log shows the stream created,
 * the SDP answered, ICE trickled and `D-ID speak dispatched` — so the question
 * is only whether the browser can carry the MEDIA, which is UDP to D-ID's
 * servers and is what a sandboxed environment tends to block.
 *
 * This reports the actual RTCPeerConnection and <video> state instead of
 * guessing. Run it headed against real Chrome:
 *
 *   npx playwright test probe-avatar --headed --project=chrome-real
 */
// Opt-in only. A bare `npx playwright test` runs every project, so without
// this the diagnostic would join the client walkthrough and its findings would
// be reported as failures of the deliverable.
test.skip(!process.env.E2E_PROBE, 'diagnostic — run with E2E_PROBE=1');

test('probe: does the D-ID avatar establish media here?', async ({ page }) => {
  // Record every peer connection the page creates so we can read ICE state
  // afterwards — the app does not expose its RTCPeerConnection.
  await page.addInitScript(() => {
    (window as any).__pcs = [];
    const Native = window.RTCPeerConnection;
    // @ts-expect-error - deliberate instrumentation
    window.RTCPeerConnection = function (...args: any[]) {
      const pc = new Native(...args);
      (window as any).__pcs.push(pc);
      return pc;
    };
    window.RTCPeerConnection.prototype = Native.prototype;
  });

  await loginAs(page, 'student1');
  await page
    .getByRole('button', { name: /Ask anything, get expert answers/i })
    .first()
    .click();

  const box = page.getByPlaceholder('Ask Meraki anything…');
  await expect(box).toBeVisible({ timeout: 60_000 });

  await page.getByRole('button', { name: /^video$/i }).first().click();
  await caption(page, 'Video mode — waiting for the avatar to connect.');
  await page.waitForTimeout(5000);

  await box.fill('In one sentence, what is the power rule?');
  await box.press('Enter');

  // Poll for up to three minutes, reporting what actually happens.
  let last = '';
  for (let i = 0; i < 36; i += 1) {
    const state = await page.evaluate(() => {
      const pcs: RTCPeerConnection[] = (window as any).__pcs ?? [];
      const v = document.querySelector('video');
      return {
        peerConnections: pcs.length,
        ice: pcs.map((p) => p.iceConnectionState).join(','),
        conn: pcs.map((p) => p.connectionState).join(','),
        videoW: v ? (v as HTMLVideoElement).videoWidth : -1,
        videoTime: v ? Number((v as HTMLVideoElement).currentTime.toFixed(1)) : -1,
        statusText: document.body.innerText.includes('Connecting your AI tutor')
          ? 'connecting'
          : 'not-connecting',
      };
    });
    const line = JSON.stringify(state);
    if (line !== last) {
      console.log(`[avatar t+${i * 5}s] ${line}`);
      last = line;
    }
    // Media actually flowing is the only real success signal.
    if (state.videoW > 0 && state.videoTime > 0) {
      console.log('[avatar] MEDIA IS FLOWING — the avatar is live in this browser');
      break;
    }
    await page.waitForTimeout(5000);
  }

  await page.screenshot({ path: 'e2e-results/shots/probe-avatar.png' });
});
