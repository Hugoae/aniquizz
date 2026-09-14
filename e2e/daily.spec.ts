import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('daily quiz happy path', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run browser e2e');

  test('opens the daily landing and starts the attempt', async ({ page }) => {
    await page.goto('/');
    const cookieBanner = page.getByRole('dialog', { name: /cookies et confidentialité/i });
    if (await cookieBanner.isVisible().catch(() => false)) {
      await cookieBanner.getByRole('button', { name: /fermer/i }).click();
    }

    const loginButton = page.getByRole('button', { name: /connexion|se connecter/i }).first();
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.getByLabel(/email/i).fill(email!);
      await page.getByLabel(/mot de passe/i).fill(password!);
      await page.getByRole('button', { name: /se connecter/i }).click();
    }

    await page.goto('/daily');
    await expect(page.getByRole('heading', { name: /quiz du jour/i })).toBeVisible({ timeout: 30_000 });

    const start = page.getByRole('button', { name: /commencer|voir le résultat/i });
    await expect(start).toBeVisible();
    if (await page.getByRole('button', { name: /^commencer$/i }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^commencer$/i }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: /^commencer$/i }).click();
      await expect(page.getByRole('group', { name: /choix/i })).toBeVisible({ timeout: 30_000 });
      await page.getByRole('group', { name: /choix/i }).getByRole('button').first().click();
      await expect(page.getByRole('button', { name: /manche suivante/i })).toBeVisible({ timeout: 20_000 });
    }
  });
});
