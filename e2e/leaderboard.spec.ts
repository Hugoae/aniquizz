import { expect, test } from '@playwright/test';

test.describe('community leaderboard', () => {
  test('switches metrics from the tablist on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/leaderboard');

    await expect(page.getByRole('heading', { name: /classement global/i })).toBeVisible();
    const tabs = page.getByRole('tablist', { name: /critères de classement/i });
    await expect(tabs).toBeVisible();

    await page.getByRole('tab', { name: /pokédex/i }).click();
    await expect(page).toHaveURL(/metric=discoveries/);
    await expect(page.getByRole('tab', { name: /pokédex/i })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: /pokédex/i }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: /parties/i })).toHaveAttribute('aria-selected', 'true');
  });
});
