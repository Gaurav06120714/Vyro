import type { BrowserContext, Page } from 'playwright';
import type { Logger } from 'pino';
import type { BrowserState, Screenshot } from '@vyro/shared-types';
import { DomExtractor } from '../../dom-parser/src/DomExtractor.js';
import { randomUUID } from 'crypto';

export interface BrowserSessionConfig {
  context: BrowserContext;
  taskId: string;
  logger: Logger;
  timeout: number;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  screenshot?: Screenshot;
}

/**
 * BrowserSession wraps a Playwright BrowserContext and provides
 * high-level action methods for the agent to use.
 */
export class BrowserSession {
  private page: Page | null = null;
  private readonly config: BrowserSessionConfig;
  private closed = false;
  private domExtractor: DomExtractor;

  constructor(config: BrowserSessionConfig) {
    this.config = config;
    this.domExtractor = new DomExtractor();
  }

  private async getPage(): Promise<Page> {
    if (this.closed) throw new Error('Session is closed');

    if (!this.page || this.page.isClosed()) {
      this.page = await this.config.context.newPage();
      this.page.on('dialog', async (dialog) => {
        this.config.logger.info({ type: dialog.type(), message: dialog.message() }, 'Auto-dismissing dialog');
        await dialog.dismiss();
      });
    }
    return this.page;
  }

  async navigate(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      await page.goto(url, { waitUntil, timeout: this.config.timeout });
      this.config.logger.info({ url }, 'Navigated');
      return { success: true, data: { url: page.url(), title: await page.title() } };
    } catch (error) {
      const err = error as Error;
      this.config.logger.error({ url, error: err.message }, 'Navigation failed');
      return { success: false, error: err.message };
    }
  }

  async click(selector: string, options: { force?: boolean; timeout?: number } = {}): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      await page.click(selector, {
        timeout: options.timeout ?? this.config.timeout,
        force: options.force ?? false,
      });
      this.config.logger.debug({ selector }, 'Clicked element');
      return { success: true };
    } catch (error) {
      const err = error as Error;
      this.config.logger.warn({ selector, error: err.message }, 'Click failed');
      return { success: false, error: err.message };
    }
  }

  async type(selector: string, text: string, options: { clearFirst?: boolean; pressEnterAfter?: boolean } = {}): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      if (options.clearFirst !== false) {
        await page.fill(selector, '');
      }
      await page.fill(selector, text);
      if (options.pressEnterAfter) {
        await page.press(selector, 'Enter');
      }
      this.config.logger.debug({ selector, textLength: text.length }, 'Typed text');
      return { success: true };
    } catch (error) {
      const err = error as Error;
      this.config.logger.warn({ selector, error: err.message }, 'Type failed');
      return { success: false, error: err.message };
    }
  }

  async select(selector: string, options: { value?: string; label?: string }): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      if (options.value) {
        await page.selectOption(selector, { value: options.value });
      } else if (options.label) {
        await page.selectOption(selector, { label: options.label });
      } else {
        return { success: false, error: 'Either value or label must be provided' };
      }
      this.config.logger.debug({ selector, ...options }, 'Selected option');
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async hover(selector: string): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      await page.hover(selector, { timeout: this.config.timeout });
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async scroll(direction: 'up' | 'down' | 'left' | 'right', amount = 500, selector?: string): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      const deltaX = direction === 'right' ? amount : direction === 'left' ? -amount : 0;
      const deltaY = direction === 'down' ? amount : direction === 'up' ? -amount : 0;

      if (selector) {
        await page.locator(selector).evaluate(
          (el, { dx, dy }) => el.scrollBy(dx, dy),
          { dx: deltaX, dy: deltaY }
        );
      } else {
        await page.evaluate(({ dx, dy }) => window.scrollBy(dx, dy), { dx: deltaX, dy: deltaY });
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async keyPress(key: string, selector?: string): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      if (selector) {
        await page.press(selector, key);
      } else {
        await page.keyboard.press(key);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async takeScreenshot(options: { fullPage?: boolean } = {}): Promise<Screenshot> {
    const page = await this.getPage();
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: options.fullPage ?? false,
    });

    const base64 = buffer.toString('base64');
    const viewport = page.viewportSize();

    return {
      id: randomUUID(),
      taskId: this.config.taskId,
      stepId: null,
      url: `/screenshots/${this.config.taskId}/${Date.now()}.jpg`,
      pageUrl: page.url(),
      base64,
      width: viewport?.width ?? 1440,
      height: viewport?.height ?? 900,
      timestamp: new Date(),
    };
  }

  async waitForElement(selector: string, options: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number } = {}): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      await page.waitForSelector(selector, {
        state: options.state ?? 'visible',
        timeout: options.timeout ?? 15000,
      });
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async getPageState(options: { includeText?: boolean; selector?: string } = {}): Promise<BrowserState> {
    const page = await this.getPage();
    const domSummary = await this.domExtractor.extractState(page, options.selector);
    const screenshot = await this.takeScreenshot();

    return {
      url: page.url(),
      title: await page.title(),
      screenshotBase64: screenshot.base64,
      domSummary,
      timestamp: new Date(),
    };
  }

  async extractData(schema: Record<string, unknown>, context: string, selector?: string): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      const root = selector ? page.locator(selector) : page.locator('body');
      const html = await root.innerHTML();

      // Return the HTML for the AI to parse according to the schema
      // The actual extraction happens in the AI reasoning step
      return {
        success: true,
        data: {
          html: html.slice(0, 50000), // Cap to avoid token overflow
          url: page.url(),
          schema,
          context,
        },
      };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async dragDrop(sourceSelector: string, targetSelector: string): Promise<ActionResult> {
    const page = await this.getPage();
    try {
      const source = page.locator(sourceSelector);
      const target = page.locator(targetSelector);
      await source.dragTo(target);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async getCurrentUrl(): Promise<string> {
    const page = await this.getPage();
    return page.url();
  }

  async getTitle(): Promise<string> {
    const page = await this.getPage();
    return page.title();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
  }

  isActive(): boolean {
    return !this.closed;
  }
}
