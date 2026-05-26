import type { Page } from 'playwright';
import { randomUUID } from 'crypto';
import type { Screenshot } from '@vyro/shared-types';

export interface ScreenshotOptions {
  taskId: string;
  stepId?: string;
  fullPage?: boolean;
  quality?: number;
}

export async function captureScreenshot(page: Page, options: ScreenshotOptions): Promise<Screenshot> {
  const { taskId, stepId, fullPage = false, quality = 80 } = options;

  const buffer = await page.screenshot({
    type: 'jpeg',
    quality,
    fullPage,
  });

  const viewport = page.viewportSize();
  const base64 = buffer.toString('base64');

  return {
    id: randomUUID(),
    taskId,
    stepId: stepId ?? null,
    url: `/screenshots/${taskId}/${Date.now()}.jpg`,
    pageUrl: page.url(),
    base64,
    width: viewport?.width ?? 1440,
    height: viewport?.height ?? 900,
    timestamp: new Date(),
  };
}
