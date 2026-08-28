import { expect, test } from '@playwright/test';

test.describe('public production shell', () => {
  test('auth pages render, navigate, and remain usable on mobile', async ({ page }) => {
    const brokenChunks: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/_next/static/') && response.status() >= 400) {
        brokenChunks.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in to Meraki' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeEditable();
    // The reveal button is deliberately labelled "Show password", so a loose
    // label query matches both controls. The stable form id targets the input.
    await expect(page.locator('#password')).toBeEditable();
    await page.getByLabel('Email address').fill('smoke@example.com');
    await page.locator('#password').fill('SmokePassw0rd!');
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeEnabled();

    await page.goto('/instructor');
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(new URL(page.url()).searchParams.get('from')).toBe('/lecturer');

    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in to Meraki' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(brokenChunks).toEqual([]);
  });
});
