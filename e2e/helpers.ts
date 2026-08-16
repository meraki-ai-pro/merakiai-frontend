import { expect, type Page } from '@playwright/test';
export type { Page };
import fs from 'fs';
import path from 'path';

/**
 * Walkthrough accounts.
 *
 * Passwords are NOT in this file. They are real credentials on the live
 * Supabase project — anyone with the repo could sign in as them — so they come
 * from e2e/.env.e2e (gitignored) or the environment. Copy .env.e2e.example,
 * fill it in, and run backend `scripts/seed_accounts.py` to create the
 * accounts with those passwords.
 */
function loadEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, '.env.e2e'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* file is optional — the environment can supply these instead */
  }
  return out;
}

const ENV_FILE = loadEnvFile();

function credential(name: string): string {
  const value = process.env[name] ?? ENV_FILE[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy e2e/.env.e2e.example to e2e/.env.e2e and fill it in, ` +
        'then seed the accounts with backend scripts/seed_accounts.py.',
    );
  }
  return value;
}

export const ACCOUNTS = {
  lecturer: {
    email: process.env.E2E_LECTURER_EMAIL ?? 'e2e.lecturer@ug.edu.gh',
    get password() {
      return credential('E2E_LECTURER_PASSWORD');
    },
    name: 'Ama',
  },
  student1: {
    email: process.env.E2E_STUDENT1_EMAIL ?? 'e2e.student1@ug.edu.gh',
    get password() {
      return credential('E2E_STUDENT1_PASSWORD');
    },
    name: 'Kwame',
  },
  student2: {
    email: process.env.E2E_STUDENT2_EMAIL ?? 'e2e.student2@ug.edu.gh',
    get password() {
      return credential('E2E_STUDENT2_PASSWORD');
    },
    name: 'Akosua',
  },
};

export const COURSE = {
  id: 'e2e-calculus-101',
  name: 'Calculus I (E2E)',
};

/**
 * The Calculus I documents the lecturer uploads during the walkthrough.
 *
 * Checked in under e2e/fixtures rather than generated per run: the equations
 * are real Word OMML, which is the path the maths-aware ingestion has to
 * handle, and regenerating them would make the recording depend on a script
 * that is not part of the app. Backend scripts/make_course_docs.py rebuilds
 * them if they ever need changing.
 */
export const MATERIALS_DIR = path.resolve(__dirname, 'fixtures');

/**
 * Cross-spec state. The walkthrough is one narrative run by a single worker,
 * so an invite code minted in the lecturer spec has to reach the student spec.
 * A file is used rather than a module-level variable because each spec file
 * gets its own module registry.
 */
// Deliberately NOT under e2e-results: Playwright empties outputDir at the
// start of every run, which would delete the invite code before the student
// spec could read it.
const STATE_FILE = path.resolve('./e2e-state/state.json');

export function saveState(patch: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const current = loadState();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...patch }, null, 2));
}

export function loadState(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Draw a caption over the page for the recording.
 *
 * The client watches these videos without a narrator, so each step announces
 * itself on screen. It is injected into the page rather than added in
 * post-production so it lands in the Playwright video automatically.
 */
export async function caption(page: Page, text: string, holdMs = 1400) {
  await page.evaluate((label) => {
    const ID = '__e2e_caption__';
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.style.cssText = [
        'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483647',
        'padding:14px 22px', 'background:rgba(9,14,26,0.93)', 'color:#fff',
        'font:600 17px/1.4 system-ui,Segoe UI,sans-serif', 'letter-spacing:0.01em',
        'border-top:3px solid #38bdf8', 'pointer-events:none',
        'text-align:center', 'white-space:pre-wrap',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = label;
  }, text).catch(() => { /* page may be mid-navigation; caption is cosmetic */ });
  await page.waitForTimeout(holdMs);
}

/** Log in through the real form so the recording shows the actual screen. */
export async function loginAs(page: Page, who: keyof typeof ACCOUNTS) {
  const acct = ACCOUNTS[who];
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await caption(page, `Signing in as ${acct.email}`, 800);

  await page.locator('#email').fill(acct.email);
  await page.locator('#password').fill(acct.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();

  // Either surface is a successful login; which one depends on role.
  await page.waitForURL(/\/(dashboard|lecturer)/, { timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

export async function logout(page: Page) {
  // Clear client-side auth directly: the sign-out control lives in a
  // collapsible sidebar menu whose position differs between the student and
  // lecturer shells, and this spec is not testing that button.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Wait for a streamed assistant answer to finish.
 *
 * Completion is detected by the text going quiet rather than by a spinner
 * disappearing: the smooth-reveal hook commits the final message a moment
 * after the last token arrives, so a spinner check can pass mid-reveal.
 */
export async function waitForAnswer(page: Page, timeoutMs = 180_000) {
  const started = Date.now();
  let lastLength = -1;
  let stableFor = 0;

  while (Date.now() - started < timeoutMs) {
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len === lastLength) {
      stableFor += 1000;
      // Quiet for 6s and something substantial on screen -> the turn is done.
      if (stableFor >= 6000 && len > 400) return true;
    } else {
      stableFor = 0;
      lastLength = len;
    }
    await page.waitForTimeout(1000);
  }
  return false;
}

/**
 * The disclaimer the tutor appends when retrieval returned nothing.
 *
 * Deliberately loose — the wording is model-generated and three phrasings have
 * already been observed across runs:
 *
 *   "I don't have specific course reference material on this topic"
 *   "I don't have specific reference material from your course notes"
 *   "My reference materials didn't specifically cover this topic"
 *
 * A tighter pattern stops catching the regression it exists for. This is the
 * *narration*, not the proof — use `expectGrounded` / `expectNotGrounded` for
 * the assertion that actually holds, since those read the citation UI, which
 * is driven by the `sources` websocket event rather than by prose.
 */
export const NO_MATERIAL_DISCLAIMER = /reference materials?\b/i;

/** Inline citation markers render as buttons labelled "Source N: <location>". */
export const citationBadges = (page: Page) =>
  page.getByRole('button', { name: /^Source \d+/ });

/** The "N of M sources cited" summary under a grounded answer. */
export const sourcesBar = (page: Page) => page.getByText(/of \d+ sources cited/i);

/**
 * Assert the answer was drawn from course material.
 *
 * Structural on purpose: correct-looking mathematics is not evidence of
 * retrieval, because the model writes it just as fluently with an empty
 * knowledge base.
 */
export async function expectGrounded(page: Page) {
  await expect(sourcesBar(page).first()).toBeVisible({ timeout: 60_000 });
  await expect(citationBadges(page).first()).toBeVisible({ timeout: 30_000 });
}

/** Assert nothing was retrieved — and that no references were invented. */
export async function expectNotGrounded(page: Page) {
  await expect(sourcesBar(page)).toHaveCount(0);
  await expect(citationBadges(page)).toHaveCount(0);
}

/**
 * Wait for toast notifications to clear before clicking.
 *
 * react-hot-toast renders into a fixed overlay; after a burst of uploads and
 * publishes the stack can sit over the very button the next step needs, and
 * Playwright reports it as "subtree intercepts pointer events". They
 * auto-dismiss, so waiting is enough — and it keeps the toasts on camera,
 * which hiding them would not.
 */
export async function waitForToasts(page: Page, timeoutMs = 10_000) {
  await page
    .waitForFunction(
      () => {
        const toaster = document.querySelector('[data-rht-toaster]');
        return !toaster || toaster.childElementCount === 0;
      },
      undefined,
      { timeout: timeoutMs },
    )
    .catch(() => undefined);
}

/** Collect console errors so the report can state whether the run was clean. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 300)}`));
  return errors;
}

/** Assert we are on a page that rendered, not a Next.js error overlay. */
export async function expectNoAppCrash(page: Page) {
  await expect(page.locator('text=Application error')).toHaveCount(0);
  await expect(page.locator('text=Unhandled Runtime Error')).toHaveCount(0);
}
