import { test, expect } from '@playwright/test';
import {
  COURSE,
  NO_MATERIAL_DISCLAIMER,
  caption,
  citationBadges,
  expectGrounded,
  expectNotGrounded,
  loginAs,
  logout,
  trackConsoleErrors,
  waitForAnswer,
  expectNoAppCrash,
} from './helpers';

/**
 * "Is the tutor actually reading my notes?"
 *
 * This is the question a lecturer has to be able to answer before trusting the
 * system with a cohort, and it is the one thing a polished demo hides best: a
 * language model answers calculus fluently whether or not it retrieved
 * anything, so a screen full of correct mathematics is NOT evidence that the
 * lecturer's material was used.
 *
 * The segment proves it both ways round on camera — with the notes hidden, and
 * with them published — because only the contrast distinguishes "grounded" from
 * "plausible".
 */
test.describe.configure({ mode: 'serial' });

const QUESTION = 'Explain the chain rule and show a worked example.';
const NOTES = 'Calculus-I-Differentiation-Notes.docx';
const NOTES_TITLE = 'Calculus I — Differentiation';


test('grounding: the tutor cites the lecturer’s material, and says so when it cannot', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);

  // ── 1. Lecturer hides the lecture notes ───────────────────────────────────
  await loginAs(page, 'lecturer');
  await page.goto(`/lecturer/${COURSE.id}`);
  await page.getByRole('tab', { name: 'Knowledge' }).click();
  await caption(page, 'To prove the tutor uses your notes, first take them away.');

  // Repeated or interrupted production runs can leave duplicate E2E uploads.
  // Select one actionable row and ignore failed historical attempts.
  const notesRow = page
    .locator('li')
    .filter({ hasText: NOTES })
    .filter({
      has: page.locator(
        'button[title="Hide from students"], button[title="Publish to students"]',
      ),
    })
    .first();
  await expect(notesRow).toBeVisible({ timeout: 30_000 });

  // Establish the starting state rather than assuming it. This segment toggles
  // publication, so an earlier interrupted run can leave the notes hidden —
  // and then the very first step fails looking for a button that says "Hide".
  const publishBtn = notesRow.locator('button[title="Publish to students"]');
  if (await publishBtn.count()) {
    await publishBtn.click();
    const liveNotesRow = page
      .locator('li')
      .filter({ hasText: NOTES })
      .filter({ has: page.locator('button[title="Hide from students"]') })
      .first();
    await expect(liveNotesRow.getByText('Live', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  await notesRow.locator('button[title="Hide from students"]').click();
  await expect(notesRow.getByText('Draft', { exact: true })).toBeVisible({ timeout: 30_000 });
  await caption(page, 'The lecture notes are now a draft — hidden from students.');

  // The lecturer's own retrieval check should now come back empty.
  await page.getByPlaceholder('How do I differentiate a product?').fill('How does the chain rule work?');
  await page.getByRole('button', { name: /^run$/i }).click();
  await expect(page.getByText('Nothing was retrieved', { exact: false })).toBeVisible({
    timeout: 60_000,
  });
  await caption(page, 'Retrieval finds nothing for Learn mode. That is the test.');
  await page.screenshot({ path: 'e2e-results/shots/grounding-1-nothing-retrieved.png' });

  // ── 2. Student asks anyway ────────────────────────────────────────────────
  await logout(page);
  await loginAs(page, 'student1');
  await caption(page, 'The same student asks the same question.');

  await page
    .getByRole('button', { name: /Ask anything, get expert answers/i })
    .first()
    .click();
  const box = page.getByPlaceholder('Ask Meraki anything…');
  await expect(box).toBeVisible({ timeout: 60_000 });
  await box.fill(QUESTION);
  await box.press('Enter');
  await waitForAnswer(page);

  // The load-bearing half: no citations were invented to cover the gap.
  await expectNotGrounded(page);

  // The visible half: the tutor says so in words. The disclaimer lands at the
  // end of the answer, and the board shows one slide at a time — so step to
  // the last slide before reading. This also puts it on screen for the video,
  // which is the whole point of the segment.
  const dots = page.locator('[aria-label^="Slide "]');
  const dotCount = await dots.count();
  if (dotCount > 0) {
    await dots.nth(dotCount - 1).click().catch(() => undefined);
    await page.waitForTimeout(1500);
  }

  const ungrounded = await page.evaluate(() => document.body.innerText);
  expect(ungrounded, 'tutor should say the answer is not from course material').toMatch(
    NO_MATERIAL_DISCLAIMER,
  );

  await caption(page, 'It answers — but says the answer is NOT from the course material.');
  await page.screenshot({ path: 'e2e-results/shots/grounding-2-honest-disclaimer.png' });
  await caption(page, 'And it invents no citations to cover the gap. Nothing is faked.');

  // ── 3. Lecturer publishes the notes again ─────────────────────────────────
  await logout(page);
  await loginAs(page, 'lecturer');
  await page.goto(`/lecturer/${COURSE.id}`);
  await page.getByRole('tab', { name: 'Knowledge' }).click();
  await caption(page, 'The lecturer publishes the notes. Nothing else changes.');

  const notesRowAgain = page
    .locator('li')
    .filter({ hasText: NOTES })
    .filter({ has: page.locator('button[title="Publish to students"]') })
    .first();
  await notesRowAgain.locator('button[title="Publish to students"]').click();
  const liveNotesRowAgain = page
    .locator('li')
    .filter({ hasText: NOTES })
    .filter({ has: page.locator('button[title="Hide from students"]') })
    .first();
  await expect(liveNotesRowAgain.getByText('Live', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await caption(page, 'Live again.');

  // ── 4. Same student, same question, grounded answer ───────────────────────
  await logout(page);
  await loginAs(page, 'student1');
  await caption(page, 'Same student. Same question. One thing changed.');

  await page
    .getByRole('button', { name: /Ask anything, get expert answers/i })
    .first()
    .click();
  const box2 = page.getByPlaceholder('Ask Meraki anything…');
  await expect(box2).toBeVisible({ timeout: 60_000 });
  await box2.fill(QUESTION);
  await box2.press('Enter');
  await waitForAnswer(page);

  await expectGrounded(page);
  await caption(page, 'Now every claim carries a citation back to the notes.');
  await page.screenshot({ path: 'e2e-results/shots/grounding-3-cited-answer.png' });

  // ── 5. Open a citation and read the lecturer's own words ──────────────────
  await caption(page, 'Opening a citation shows the passage it came from.');
  await citationBadges(page).first().click();

  const drawer = page.getByRole('dialog', { name: 'Sources' });
  await expect(drawer).toBeVisible({ timeout: 30_000 });
  // Students see the document's friendly title rather than its internal upload
  // filename. The passage itself is shown directly underneath it.
  await expect(drawer.getByText(NOTES_TITLE, { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    drawer.getByText('The chain rule differentiates a composition of functions', {
      exact: false,
    }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'e2e-results/shots/grounding-4-sources-drawer.png' });
  await caption(page, 'The exact passage, from the lecturer’s own file, with its maths.');

  await drawer.getByRole('button', { name: /close/i }).first().click();
  await page.waitForTimeout(1500);
  await caption(page, 'Fluent maths is not evidence. A citation is.');

  await expectNoAppCrash(page);
  if (errors.length) console.warn('[grounding] console errors:\n' + errors.join('\n'));
});
