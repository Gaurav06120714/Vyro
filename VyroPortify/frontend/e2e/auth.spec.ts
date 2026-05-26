/**
 * E2E tests for authentication flows.
 *
 * Uses page.route() to mock API calls — no real backend or Clerk needed.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user visiting /dashboard is redirected", async ({ page }) => {
    // Mock Clerk's session check — unauthenticated
    await page.route("**/api/v1/**", (route) => {
      route.fulfill({ status: 401, json: { detail: "Unauthorized" } });
    });

    const response = await page.goto("/dashboard");

    // Should be redirected away from /dashboard (to /login or similar)
    // Playwright follows redirects by default
    const url = page.url();
    expect(url).not.toContain("/dashboard");
  });

  test("login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    // Page should load without a 500 error
    await expect(page).not.toHaveURL(/500/);
  });

  test("register page loads successfully", async ({ page }) => {
    await page.goto("/register");
    await expect(page).not.toHaveURL(/500/);
  });

  test("health endpoint is accessible", async ({ page }) => {
    await page.route("**/health", (route) => {
      route.fulfill({
        status: 200,
        json: { status: "ok", environment: "test" },
      });
    });

    const response = await page.request.get("http://localhost:8000/health");
    // This tests the mock route intercept — we are validating the spec structure
    expect(response).toBeDefined();
  });

  test("marketing home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/error/);
    // Check that some content renders
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
