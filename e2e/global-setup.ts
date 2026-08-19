import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Where the backend checkout lives, so the reset script can be run with its own
 * virtualenv. Defaults to the sibling layout in this repo; override with
 * MERAKI_BACKEND when it sits elsewhere.
 */
const BACKEND = process.env.MERAKI_BACKEND ?? path.resolve(__dirname, '../../Backend - V1');
const PY =
  process.env.MERAKI_PYTHON ??
  path.join(BACKEND, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const RESET = path.join(BACKEND, 'scripts/reset_e2e.py');

/**
 * Reset the demo course before recording.
 *
 * The walkthrough shows a lecturer creating a course from nothing, so a course
 * left over from the previous run would make step one fail with "already
 * exists". Only e2e-* rows and the three e2e accounts are touched.
 */
export default async function globalSetup() {
  // The specs form one narrative and are meant to run together. Running the
  // student spec alone would otherwise delete the course the lecturer spec
  // created, so E2E_SKIP_RESET=1 exists for iterating on a single spec.
  if (process.env.E2E_SKIP_RESET === '1') {
    console.log('[global-setup] E2E_SKIP_RESET=1 — keeping existing data');
    return;
  }

  // Start from a clean state file; a stale invite code from a previous run
  // would be redeemed against a course that no longer exists.
  const stateFile = path.resolve('./e2e-state/state.json');
  if (fs.existsSync(stateFile)) fs.rmSync(stateFile);

  if (!fs.existsSync(PY) || !fs.existsSync(RESET)) {
    console.warn('[global-setup] reset script not found — continuing without reset');
    return;
  }

  try {
    const out = execFileSync(PY, [RESET], {
      cwd: BACKEND,
      encoding: 'utf8',
      timeout: 120_000,
    });
    console.log('[global-setup] reset:\n' + out.trim());
  } catch (err) {
    // A failed reset is worth knowing about but should not block the run: the
    // specs tolerate an existing course.
    console.warn('[global-setup] reset failed:', (err as Error).message.slice(0, 400));
  }
}
