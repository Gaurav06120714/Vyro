import type { Page } from 'playwright';

export interface TypeOptions {
  selector: string;
  text: string;
  clearFirst?: boolean;
  delay?: number;
  pressEnterAfter?: boolean;
}

export async function performType(page: Page, options: TypeOptions): Promise<void> {
  const { selector, text, clearFirst = true, delay = 0, pressEnterAfter = false } = options;

  await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

  if (clearFirst) {
    await page.fill(selector, '');
  }

  if (delay > 0) {
    // Human-like typing with delay
    await page.click(selector);
    await page.type(selector, text, { delay });
  } else {
    await page.fill(selector, text);
  }

  if (pressEnterAfter) {
    await page.press(selector, 'Enter');
  }
}
