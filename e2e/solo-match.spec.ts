import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('solo match flow', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run browser e2e');

  test('create match, play rounds, reach game over', async ({ page }) => {
    await page.goto('/');

    // Open login from header if needed.
    const loginButton = page.getByRole('button', { name: /connexion|se connecter/i }).first();
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
    }

    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/mot de passe/i).fill(password!);
    await page.getByRole('button', { name: /se connecter/i }).click();

    await page.waitForURL(/\/(play|$)/, { timeout: 30_000 });

    await page.goto('/play');
    await page.getByRole('button', { name: /^solo$/i }).click();

    // Minimize match length: 5 songs (server minimum), 5s guess timer.
    const sliders = page.getByRole('slider');
    await sliders.nth(0).focus();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await sliders.nth(1).focus();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('ArrowLeft');
    }

    await page.getByRole('button', { name: /lancer la partie/i }).click();
    await page.getByRole('button', { name: /^jouer$/i }).click();

    await page.waitForURL(/\/game/, { timeout: 60_000 });

    // Play 5 rounds (minimum soundCount).
    for (let round = 0; round < 5; round++) {
      const choice = page.locator('button').filter({ hasText: /.+/ }).nth(4);
      await choice.waitFor({ state: 'visible', timeout: 60_000 });
      await choice.click();
      await page.waitForTimeout(2_000);
    }

    await expect(page.getByRole('button', { name: /rejouer/i })).toBeVisible({
      timeout: 120_000,
    });
  });
});
