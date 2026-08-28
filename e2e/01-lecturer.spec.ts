import { test, expect } from '@playwright/test';
import path from 'path';
import {
  COURSE,
  MATERIALS_DIR,
  caption,
  loginAs,
  saveState,
  trackConsoleErrors,
  waitForToasts,
  expectNoAppCrash,
} from './helpers';

/**
 * Lecturer walkthrough: onboarding through to a course students can use.
 *
 * Runs as one test rather than several so the recording is a single continuous
 * video of the real journey. Splitting it would produce five short clips that
 * each start at a login screen.
 */
test.describe.configure({ mode: 'serial' });

test('lecturer: onboarding, course, materials, videos, assessments, students', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);

  // ── 1. Sign in ────────────────────────────────────────────────────────────
  await loginAs(page, 'lecturer');
  await caption(page, 'Signed in as a lecturer.');
  await expectNoAppCrash(page);

  // ── 2. Reach the teaching workspace ───────────────────────────────────────
  // Current role routing lands lecturers here directly. Keep the navigation
  // branch for deployments that still land every account on /dashboard.
  if (!/\/lecturer(?:\/|$)/.test(page.url())) {
    await caption(page, 'Opening the teaching workspace from the sidebar.');
    const workspaceLink = page.getByRole('link', { name: /teaching workspace/i });
    await expect(workspaceLink).toBeVisible({ timeout: 20_000 });
    await workspaceLink.click();
    await page.waitForURL(/\/lecturer/, { timeout: 30_000 });
  }
  await expect(page.getByRole('heading', { name: /your courses/i })).toBeVisible();
  await caption(page, 'Lecturer workspace.');

  // ── 3. Create the course ──────────────────────────────────────────────────
  const courseHeading = page.getByRole('heading', { name: COURSE.name });
  if ((await courseHeading.count()) === 0) {
    await page.getByRole('button', { name: /new course|create your first course/i }).first().click();
    await caption(page, 'Creating a course: Calculus I, Level 100.');

    await page.getByPlaceholder('Calculus I').fill(COURSE.name);
    const idField = page.getByPlaceholder('calculus-101');
    await idField.fill(COURSE.id);
    await page.locator('select').first().selectOption('level_100');
    await page.getByRole('button', { name: /^create course$/i }).click();

    await expect(courseHeading).toBeVisible({ timeout: 30_000 });
    await caption(page, 'Course created. The id is used for storage and search.');
  } else {
    await caption(page, 'Reusing the isolated E2E course from an interrupted run.');
  }

  // ── 4. Open the course workspace ──────────────────────────────────────────
  await page.getByRole('heading', { name: COURSE.name }).click();
  await page.waitForURL(new RegExp(`/lecturer/${COURSE.id}`), { timeout: 30_000 });
  await expect(page.getByRole('tab', { name: 'Knowledge' })).toBeVisible({ timeout: 30_000 });
  await caption(page, 'Course workspace: Overview, Knowledge, Students, Videos, Pre/post tests.');

  // ── 5. Upload teaching material ───────────────────────────────────────────
  await page.getByRole('tab', { name: 'Knowledge' }).click();
  await caption(page, 'Knowledge tab. Uploads land as drafts, invisible to students.');

  const fileInput = page.locator('input[type="file"]');

  // Learn material — the mode checkboxes default to learn only.
  await caption(page, 'Uploading lecture notes for Learn mode.');
  await fileInput.setInputFiles(
    path.join(MATERIALS_DIR, 'Calculus-I-Differentiation-Notes.docx'),
  );
  await expect(page.getByText('Calculus-I-Differentiation-Notes').first()).toBeVisible({
    timeout: 60_000,
  });
  await caption(page, 'Ingestion runs in the background: parse, equations, chunk, embed.');

  // Review material — retag before uploading the tutorial sheet.
  const learnBox = page.locator('label', { hasText: /^learn$/i }).locator('input[type=checkbox]');
  const reviewBox = page.locator('label', { hasText: /^review$/i }).locator('input[type=checkbox]');
  // Labelled "Assessment" on screen; the wire value is still 'application'.
  const appBox = page
    .locator('label', { hasText: /^assessment$/i })
    .locator('input[type=checkbox]');

  await learnBox.uncheck();
  await reviewBox.check();
  await caption(page, 'Retagging: past papers must not leak into a Learn explanation.');
  await fileInput.setInputFiles(path.join(MATERIALS_DIR, 'Calculus-I-Tutorial-Questions.docx'));
  await expect(page.getByText('Calculus-I-Tutorial-Questions').first()).toBeVisible({
    timeout: 60_000,
  });

  // Assessment (scenario) material.
  await reviewBox.uncheck();
  await appBox.check();
  await caption(page, 'Uploading case studies for Assessment mode.');
  await fileInput.setInputFiles(path.join(MATERIALS_DIR, 'Calculus-I-Applications.docx'));
  await expect(page.getByText('Calculus-I-Applications').first()).toBeVisible({
    timeout: 60_000,
  });

  // ── 6. Wait for ingestion, then publish ───────────────────────────────────
  await caption(page, 'Ingestion runs in the background for all three files.', 500);
  // Scoped to the file list and exact: the caption overlay is also on the page,
  // and getByText matches substrings — a caption mentioning "processing" would
  // otherwise satisfy this wait against itself.
  await expect(
    page.locator('li').getByText('Processing…', { exact: true }),
  ).toHaveCount(0, { timeout: 300_000 });
  await caption(page, 'All three ready. Equations survived as LaTeX.');

  // Publish every draft. Driven by "are any drafts left?" rather than by a
  // count captured up front: the list reloads and reorders after each publish,
  // so a fixed-count loop over .first() can leave one behind — and one
  // unpublished Learn file means retrieval returns nothing for Learn mode,
  // which looks like a broken tutor rather than a missed click.
  const draftButton = () => page.locator('button[title="Publish to students"]');
  let published = 0;
  for (let guard = 0; guard < 10; guard += 1) {
    // Settle first, then look. Upload and publish toasts stack over this
    // button and swallow the click; waiting after counting meant the list
    // could reload during the wait and the counted button be gone by the time
    // we clicked it.
    await waitForToasts(page);
    if ((await draftButton().count()) === 0) break;

    // Tolerate the row re-rendering underneath us — the loop re-checks.
    const clicked = await draftButton()
      .first()
      .click({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (clicked) published += 1;
    await page.waitForTimeout(2500);
  }
  await expect(draftButton()).toHaveCount(0, { timeout: 30_000 });
  await caption(page, `Published ${published} file${published === 1 ? '' : 's'} to students.`);
  await expect(page.getByText('Live').first()).toBeVisible({ timeout: 30_000 });

  // ── 7. Test what retrieval actually returns ───────────────────────────────
  await caption(page, 'Test query: shows the passages retrieval finds, not an answer.');
  await page.getByPlaceholder('How do I differentiate a product?').fill(
    'How does the chain rule work?',
  );
  await page.getByRole('button', { name: /^run$/i }).click();
  await page.waitForTimeout(8000);

  // Assert retrieval actually returned something. Without this the suite can
  // pass with a silently empty knowledge base — the tutor then answers from
  // general knowledge and says it has no course material, which is the single
  // most damaging way this can fail in front of the client.
  await expect(
    page.getByText('Nothing was retrieved', { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Calculus-I-Differentiation-Notes.docx', { exact: false }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await caption(page, 'Passages come back with the file and section they came from.');

  // ── 8. Invite code for students ───────────────────────────────────────────
  await page.getByRole('tab', { name: 'Students' }).click();
  await caption(page, 'Students tab: create an invite code to read out in class.');
  await page.getByRole('button', { name: /new code/i }).click();

  const codeEl = page.locator('code').first();
  await expect(codeEl).toBeVisible({ timeout: 30_000 });
  const inviteCode = (await codeEl.textContent())?.trim() ?? '';
  expect(inviteCode.length).toBeGreaterThan(3);
  saveState({ inviteCode, courseId: COURSE.id, courseName: COURSE.name });
  await caption(page, `Invite code ${inviteCode} — students enter this to enrol.`);

  // Enrol the second student directly by email, which is the other route.
  await page.getByPlaceholder('student@university.edu.gh').fill('e2e.student2@ug.edu.gh');
  await page.getByRole('button', { name: /^enrol$/i }).click();
  await page.waitForTimeout(3000);
  await caption(page, 'A student with an account can also be enrolled by email.');

  // ── 9. Concept video ──────────────────────────────────────────────────────
  await page.getByRole('tab', { name: 'Videos' }).click();
  await caption(page, 'Videos tab: generate an animated explanation of a concept.');
  await page.getByRole('button', { name: /new video/i }).click();

  await page.getByTestId('render-concept-key').fill('chain-rule');
  await page.getByTestId('render-script').fill(
    'Show how the chain rule differentiates y = (3x^2 + 1)^5. Name the outer and inner ' +
      'function, differentiate each, then multiply and substitute back.',
  );
  await page.waitForTimeout(1500);
  await page.getByTestId('render-archetype').selectOption('equation_transform').catch(() => {});
  await caption(page, 'The lecturer describes the concept; Meraki animates it.');
  await page.getByTestId('render-submit').click();
  await page.waitForTimeout(6000);
  await caption(page, 'Queued for rendering. Students see nothing until it is approved.');

  // The tab polls every 8s while a render is in flight. Claude writes the
  // Manim scene, the sandbox checks it and manim draws it — about 90s.
  await caption(page, 'Writing the animation scene, then drawing it.', 500);
  const renderRow = page.locator('li').filter({ hasText: 'chain-rule' }).first();
  const needsReview = renderRow.getByText('Needs review', { exact: true });
  const failed = renderRow.getByText('Failed', { exact: true });
  await expect(needsReview.or(failed)).toBeVisible({ timeout: 480_000 });
  if (await failed.isVisible()) {
    await renderRow.getByRole('button', { name: /chain-rule/i }).click();
    const detail = (await renderRow.locator('pre').textContent().catch(() => null))?.trim();
    throw new Error(`Concept video failed${detail ? `: ${detail}` : ''}`);
  }
  await caption(page, 'Rendered, and waiting for the lecturer to check the maths.');

  // Watch it before approving — this is the review gate the proposal calls for.
  await page.getByText('chain-rule').first().click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'e2e-results/shots/concept-video.png' });
  await caption(page, 'The animation and its generated source are both shown.');

  await page.getByRole('button', { name: /approve/i }).first().click();
  await page.waitForTimeout(4000);
  await expect(page.getByText('Live').first()).toBeVisible({ timeout: 30_000 });
  await caption(page, 'Approved — students can now see this animation.');

  // ── 10. Assessment ────────────────────────────────────────────────────────
  // "Pre/post tests", not "Assessments" — Assessment is now the name of a
  // study mode, so the research instrument was renamed to keep the two apart.
  await page.getByRole('tab', { name: 'Pre/post tests' }).click();
  await caption(page, 'Pre/post tests: the pair that measures learning gain.');
  await page.getByTestId('new-assessment').click();

  await page.getByTestId('assessment-title').fill('Differentiation — pre-test');
  await page.getByTestId('assessment-kind').selectOption('pre');
  await page.getByTestId('create-assessment-submit').click();
  await expect(page.getByText('Differentiation — pre-test')).toBeVisible({ timeout: 30_000 });
  await caption(page, 'Paper created. Now the questions.');

  const QUESTIONS = [
    {
      prompt: 'What is the derivative of x^3 with respect to x?',
      options: ['3x^2', 'x^2', '3x', 'x^4/4'],
      correct: 0,
      topic: 'power rule',
    },
    {
      prompt: 'Differentiate y = (3x^2 + 1)^5 using the chain rule.',
      options: ['30x(3x^2+1)^4', '5(3x^2+1)^4', '6x(3x^2+1)^5', '15x(3x^2+1)^4'],
      correct: 0,
      topic: 'chain rule',
    },
    {
      prompt: 'The derivative of a product uv is:',
      options: ["u'v'", "u'v + uv'", "u'v - uv'", "(u'v + uv')/v^2"],
      correct: 1,
      topic: 'product rule',
    },
  ];

  // Creating a paper auto-expands it, so only click when the form is not
  // already showing — an unconditional click would collapse the row.
  const promptField = page.getByTestId('question-prompt');
  if (!(await promptField.isVisible().catch(() => false))) {
    await page.getByText('Differentiation — pre-test').click();
  }
  await expect(promptField).toBeVisible({ timeout: 20_000 });

  for (const q of QUESTIONS) {
    await page.getByTestId('question-prompt').fill(q.prompt);
    for (let i = 0; i < q.options.length; i += 1) {
      await page.getByTestId(`question-option-${i}`).fill(q.options[i]);
    }
    await page.getByTestId(`question-correct-${q.correct}`).check();
    await page.getByTestId('question-topic').fill(q.topic);
    await page.getByTestId('add-question-submit').click();
    await page.waitForTimeout(1800);
  }
  await caption(page, 'Three questions added, each tagged with its topic.');

  await page.locator('button[data-testid^="publish-"]').first().click();
  await page.waitForTimeout(3000);
  await caption(page, 'Published. Students can now sit the pre-test.');

  // ── 11. Overview ──────────────────────────────────────────────────────────
  await page.getByRole('tab', { name: 'Overview' }).click();
  await page.waitForTimeout(4000);
  await caption(page, 'Overview: students, published files, videos awaiting review.');

  await expectNoAppCrash(page);
  // Reported rather than asserted: a third-party warning should not fail a
  // walkthrough whose purpose is to show the workflow.
  if (errors.length) console.warn('[lecturer] console errors:\n' + errors.join('\n'));
});
