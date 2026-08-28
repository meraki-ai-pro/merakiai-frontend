import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration for the client walkthrough recording.
 *
 * This suite is a demonstration as much as a test: the videos it produces are
 * shown to the client. That drives three choices that differ from a normal CI
 * setup —
 *
 *   1. `workers: 1` and `fullyParallel: false`. The specs form one narrative
 *      (a lecturer creates a course, then students use it), and later specs
 *      read state the earlier ones created.
 *   2. Long timeouts. A Learn turn is a real RAG call through Celery, and the
 *      docs quote 25–35s for a full answer. A 30s default would fail on a
 *      working system.
 *   3. Video always on, at 1280x720. `retain-on-failure` would throw away
 *      exactly the recordings we are making this for.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  // One retry, because every step here is a real call to Supabase, OpenAI,
  // Anthropic or D-ID. Those time out occasionally for reasons that have
  // nothing to do with the app — a single Supabase ReadTimeout has cost a
  // whole 9-minute recording more than once. A genuine regression still fails
  // twice; a blip does not throw away the deliverable.
  retries: 1,
  // Generous because each spec is a whole journey, not one assertion: the
  // lecturer run ingests three documents and the student run takes several
  // real RAG turns.
  timeout: 20 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './e2e-report', open: 'never' }],
    ['json', { outputFile: './e2e-results/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    screenshot: 'on',
    trace: 'on',
    actionTimeout: 30 * 1000,
    navigationTimeout: 60 * 1000,
    viewport: { width: 1280, height: 720 },
    // Deterministic rendering for the recording.
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'Africa/Accra',
  },
  projects: [
    {
      name: 'walkthrough',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /(probe|smoke)-.*\.spec\.ts/,
    },
    {
      name: 'smoke',
      testMatch: /smoke-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Diagnostics only. Uses the real installed Chrome rather than bundled
      // Chromium, because the thing being diagnosed (WebRTC media to D-ID) is
      // exactly the sort of traffic a bundled/sandboxed browser blocks.
      name: 'chrome-real',
      testMatch: /probe-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
