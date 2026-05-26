import { test, expect } from '@playwright/test';

test('has title and main heading', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/VyroPortify/);

  // Expect the main hero badge to be visible.
  await expect(page.getByText('Powered by Claude AI')).toBeVisible();
});
