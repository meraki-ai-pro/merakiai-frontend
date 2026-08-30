import { expect, test } from '@playwright/test';

test.describe('public production shell', () => {
  test('publishes crawlable SEO metadata and Meraki browser icons', async ({ page, request }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Meraki AI – Adaptive AI Tutor for University Learning');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.merakiai.online',
    );
    await expect(page.locator('link[rel~="icon"]').first()).toHaveAttribute(
      'href',
      /\/brand\/meraki-icon-color\.png/,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Statistics, Calculus/,
    );
    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .evaluate((element) => element.textContent ?? '');
    expect(structuredData).toContain('EducationalApplication');

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('Sitemap: https://www.merakiai.online/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('<loc>https://www.merakiai.online</loc>');

    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    expect(await manifest.text()).toContain('meraki-icon-color.png');
  });

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
