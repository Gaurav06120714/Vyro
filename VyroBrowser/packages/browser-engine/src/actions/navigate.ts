import type { Page } from 'playwright';

export type WaitUntilState = 'load' | 'domcontentloaded' | 'networkidle';

export interface NavigateOptions {
  url: string;
  waitUntil?: WaitUntilState;
  timeout?: number;
}

export async function performNavigate(page: Page, options: NavigateOptions): Promise<{ url: string; title: string }> {
  const { url, waitUntil = 'domcontentloaded', timeout = 30000 } = options;

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  await page.goto(normalizedUrl, { waitUntil, timeout });

  // Wait for any immediate JS-triggered navigation
  await page.waitForLoadState('domcontentloaded');

  return {
    url: page.url(),
    title: await page.title(),
  };
}
