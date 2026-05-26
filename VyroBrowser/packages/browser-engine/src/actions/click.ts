import type { Page } from 'playwright';

export interface ClickOptions {
  selector: string;
  force?: boolean;
  timeout?: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export async function performClick(page: Page, options: ClickOptions): Promise<void> {
  const { selector, force = false, timeout = 10000, button = 'left', clickCount = 1 } = options;

  // Try the direct approach first
  try {
    await page.click(selector, { force, timeout, button, clickCount });
    return;
  } catch (_firstError) {
    // Fallback: scroll element into view and try again
    try {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, selector);

      await page.waitForTimeout(300);
      await page.click(selector, { force: true, timeout: 5000, button, clickCount });
    } catch (error) {
      throw new Error(`Click failed on "${selector}": ${(error as Error).message}`);
    }
  }
}
