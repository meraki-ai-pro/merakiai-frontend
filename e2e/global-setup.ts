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
const SEED = path.join(BACKEND, 'scripts/seed_accounts.py');

function loadE2EEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  const envFile = path.resolve(__dirname, '.env.e2e');
  if (!fs.existsSync(envFile)) return values;

  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

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

  if (!fs.existsSync(PY) || !fs.existsSync(RESET) || !fs.existsSync(SEED)) {
    console.warn('[global-setup] backend E2E scripts not found — continuing without reset');
    return;
  }

  const childEnv = { ...process.env, ...loadE2EEnv() };
  const resetOut = execFileSync(
    PY,
    [RESET, '--execute', '--confirm', 'DELETE E2E DATA'],
    { cwd: BACKEND, encoding: 'utf8', timeout: 180_000, env: childEnv },
  );
  console.log('[global-setup] reset:\n' + resetOut.trim());

  const seedOut = execFileSync(PY, [SEED], {
    cwd: BACKEND,
    encoding: 'utf8',
    timeout: 120_000,
    env: childEnv,
  });
  console.log('[global-setup] accounts ready:\n' + seedOut.trim());
}
