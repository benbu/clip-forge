import { test, expect } from '@playwright/test';

test.describe('ClipForge smoke test', () => {
  test('Editor shell renders and timeline loads', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('banner')).toHaveText(/ClipForge/);

    await expect(
      page.getByRole('heading', { name: 'Timeline', level: 3 })
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeVisible();
  });
});
