import type { Page } from 'playwright';

export interface ScrollOptions {
  direction: 'up' | 'down' | 'left' | 'right';
  amount?: number;
  selector?: string;
}

export async function performScroll(page: Page, options: ScrollOptions): Promise<void> {
  const { direction, amount = 500, selector } = options;
  const deltaX = direction === 'right' ? amount : direction === 'left' ? -amount : 0;
  const deltaY = direction === 'down' ? amount : direction === 'up' ? -amount : 0;

  if (selector) {
    await page.locator(selector).evaluate(
      (el, args) => { el.scrollBy(args.dx, args.dy); },
      { dx: deltaX, dy: deltaY }
    );
  } else {
    await page.evaluate(
      (args) => { window.scrollBy(args.dx, args.dy); },
      { dx: deltaX, dy: deltaY }
    );
  }

  // Allow content to render after scroll
  await page.waitForTimeout(200);
}

export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
}

export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}
