import { expect, test } from '@playwright/test';

test.describe('player settings panel', () => {
  test('opens tabs and applies motion mode without signing in', async ({ page }) => {
    await page.goto('/');

    const cookieBanner = page.getByRole('dialog', { name: /cookies et confidentialité/i });
    if (await cookieBanner.isVisible().catch(() => false)) {
      await cookieBanner.getByRole('button', { name: /fermer/i }).click();
    }

    await page.getByRole('button', { name: 'Paramètres' }).click();
    const panel = page.getByRole('region', { name: 'Panneau des paramètres' });
    await expect(panel).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(panel.getByRole('heading', { name: 'Audio' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Animations' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'En partie' })).toBeVisible();

    await panel.getByRole('radio', { name: 'Réduit' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

    await panel.getByRole('radio', { name: 'Complet' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');

    await page.getByRole('tab', { name: 'Social' }).click();
    await expect(panel.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(panel.getByText(/Connectez-vous pour gérer confidentialité/)).toBeVisible();

    await page.getByRole('tab', { name: 'Compte' }).click();
    await expect(panel.getByText(/Connectez-vous pour gérer confidentialité/)).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Informations légales' })).toBeVisible();
  });
});
