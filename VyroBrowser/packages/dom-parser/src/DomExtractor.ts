import type { Page } from 'playwright';
import type { DomSummary, InteractiveElement, FormInfo, LinkInfo } from '@vyro/shared-types';

/**
 * DomExtractor uses Playwright's evaluate API to perform in-browser DOM analysis.
 * It extracts interactive elements, forms, links, and detects special page states
 * (captchas, modals, errors) to give the AI a rich understanding of the current page.
 */
export class DomExtractor {
  async extractState(page: Page, scopeSelector?: string): Promise<DomSummary> {
    const [interactiveElements, forms, links, metadata] = await Promise.all([
      this.extractInteractiveElements(page, scopeSelector),
      this.extractForms(page, scopeSelector),
      this.extractLinks(page, scopeSelector),
      this.extractMetadata(page),
    ]);

    const visibleText = await this.extractVisibleText(page, scopeSelector);

    return {
      interactiveElements,
      visibleText: visibleText.slice(0, 8000),
      forms,
      links: links.slice(0, 50),
      errors: metadata.errors,
      captchaDetected: metadata.captchaDetected,
      modalDetected: metadata.modalDetected,
      pageType: metadata.pageType,
    };
  }

  private async extractInteractiveElements(page: Page, scopeSelector?: string): Promise<InteractiveElement[]> {
    const scope = scopeSelector ?? 'body';

    return page.evaluate((sel) => {
      const root = document.querySelector(sel) ?? document.body;

      const INTERACTIVE_SELECTORS = [
        'button:not([disabled])',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        'a[href]',
        '[role="button"]:not([disabled])',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="combobox"]',
        '[role="textbox"]',
        '[contenteditable="true"]',
      ].join(',');

      const elements: InteractiveElement[] = [];
      const seen = new Set<string>();

      root.querySelectorAll(INTERACTIVE_SELECTORS).forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Skip invisible or very small elements
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const style = window.getComputedStyle(htmlEl);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        if (!visible) return;

        // Generate stable selector
        let selector = '';
        const id = htmlEl.id;
        const testId = htmlEl.getAttribute('data-testid');
        const ariaLabel = htmlEl.getAttribute('aria-label');
        const name = (htmlEl as HTMLInputElement).name;
        const role = htmlEl.getAttribute('role');
        const type = (htmlEl as HTMLInputElement).type ?? htmlEl.tagName.toLowerCase();
        const text = (htmlEl.textContent ?? '').trim().slice(0, 80);
        const placeholder = (htmlEl as HTMLInputElement).placeholder ?? '';
        const href = (htmlEl as HTMLAnchorElement).href ?? '';

        if (id) {
          selector = `#${CSS.escape(id)}`;
        } else if (testId) {
          selector = `[data-testid="${testId}"]`;
        } else if (ariaLabel) {
          selector = `[aria-label="${ariaLabel}"]`;
        } else if (name && (htmlEl.tagName === 'INPUT' || htmlEl.tagName === 'SELECT' || htmlEl.tagName === 'TEXTAREA')) {
          selector = `${htmlEl.tagName.toLowerCase()}[name="${name}"]`;
        } else if (role) {
          selector = `[role="${role}"]`;
          if (text) selector += `:has-text("${text.slice(0, 30)}")`;
        } else {
          selector = htmlEl.tagName.toLowerCase();
          if (text) selector += `:has-text("${text.slice(0, 30)}")`;
        }

        // Deduplicate
        const key = `${selector}|${type}|${text}`;
        if (seen.has(key)) return;
        seen.add(key);

        elements.push({
          selector,
          type: role ?? type,
          text,
          placeholder: placeholder || undefined,
          ariaLabel: ariaLabel ?? undefined,
          role: role ?? undefined,
          href: href || undefined,
          visible,
          enabled: !(htmlEl as HTMLButtonElement).disabled,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
      });

      return elements.slice(0, 100); // Cap to avoid token overflow
    }, scope);
  }

  private async extractForms(page: Page, scopeSelector?: string): Promise<FormInfo[]> {
    const scope = scopeSelector ?? 'body';

    return page.evaluate((sel) => {
      const root = document.querySelector(sel) ?? document.body;
      const forms: FormInfo[] = [];

      root.querySelectorAll('form').forEach((form, fi) => {
        const formId = form.id ? `#${form.id}` : `form:nth-of-type(${fi + 1})`;
        const fields: FormInfo['fields'] = [];

        form.querySelectorAll('input, select, textarea').forEach((field) => {
          const inputEl = field as HTMLInputElement;
          if (inputEl.type === 'hidden') return;

          // Find label
          let label = '';
          if (inputEl.id) {
            label = document.querySelector(`label[for="${inputEl.id}"]`)?.textContent?.trim() ?? '';
          }
          if (!label) {
            label = inputEl.closest('label')?.textContent?.trim() ?? inputEl.placeholder ?? '';
          }

          const options: string[] = [];
          if (field.tagName === 'SELECT') {
            (field as HTMLSelectElement).options &&
              Array.from((field as HTMLSelectElement).options).forEach((opt) =>
                options.push(opt.text)
              );
          }

          let fieldSelector = '';
          if (inputEl.id) fieldSelector = `#${CSS.escape(inputEl.id)}`;
          else if (inputEl.name) fieldSelector = `${inputEl.tagName.toLowerCase()}[name="${inputEl.name}"]`;
          else fieldSelector = inputEl.tagName.toLowerCase();

          fields.push({
            name: inputEl.name || label || fieldSelector,
            type: inputEl.type || field.tagName.toLowerCase(),
            required: inputEl.required,
            selector: fieldSelector,
            label: label || undefined,
            placeholder: inputEl.placeholder || undefined,
            options: options.length > 0 ? options : undefined,
          });
        });

        forms.push({
          selector: formId,
          action: form.action || undefined,
          method: form.method || undefined,
          fields,
        });
      });

      return forms;
    }, scope);
  }

  private async extractLinks(page: Page, scopeSelector?: string): Promise<LinkInfo[]> {
    const scope = scopeSelector ?? 'body';
    const currentOrigin = new URL(page.url()).origin;

    return page.evaluate(
      ({ sel, origin }) => {
        const root = document.querySelector(sel) ?? document.body;
        const links: LinkInfo[] = [];
        const seen = new Set<string>();

        root.querySelectorAll('a[href]').forEach((a, i) => {
          const anchor = a as HTMLAnchorElement;
          const href = anchor.href;
          const text = (anchor.textContent ?? '').trim().slice(0, 100);

          if (!href || href.startsWith('javascript:') || href === '#') return;
          if (seen.has(href)) return;
          seen.add(href);

          const isExternal = !href.startsWith(origin);
          const selector = anchor.id
            ? `#${anchor.id}`
            : `a:nth-of-type(${i + 1})`;

          links.push({ href, text, selector, isExternal });
        });

        return links;
      },
      { sel: scope, origin: currentOrigin }
    );
  }

  private async extractVisibleText(page: Page, scopeSelector?: string): Promise<string> {
    const scope = scopeSelector ?? 'body';
    try {
      const text = await page.locator(scope).innerText();
      return text.replace(/\s+/g, ' ').trim();
    } catch {
      return '';
    }
  }

  private async extractMetadata(page: Page): Promise<{
    errors: string[];
    captchaDetected: boolean;
    modalDetected: boolean;
    pageType: DomSummary['pageType'];
  }> {
    return page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const bodyHtml = document.body.innerHTML.toLowerCase();

      // Detect captcha
      const captchaDetected =
        bodyHtml.includes('g-recaptcha') ||
        bodyHtml.includes('h-captcha') ||
        bodyHtml.includes('cf-turnstile') ||
        bodyHtml.includes('recaptcha') ||
        bodyHtml.includes('arkose') ||
        bodyText.includes('prove you are human') ||
        bodyText.includes('verify you are human');

      // Detect modal/dialog
      const modalDetected =
        document.querySelector('[role="dialog"]') !== null ||
        document.querySelector('.modal.show') !== null ||
        document.querySelector('[aria-modal="true"]') !== null;

      // Detect visible errors
      const errors: string[] = [];
      document.querySelectorAll('[role="alert"], .error, .alert-danger, .error-message').forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length < 200) errors.push(text);
      });

      // Detect page type
      let pageType: 'standard' | 'spa' | 'iframe' | 'pdf' | 'unknown' = 'standard';
      if (document.querySelector('iframe[src*="pdf"]') || window.location.pathname.endsWith('.pdf')) {
        pageType = 'pdf';
      } else if (document.querySelector('#root, #app, [data-reactroot]')) {
        pageType = 'spa';
      } else if (document.querySelectorAll('iframe').length > 0) {
        pageType = 'iframe';
      }

      return { errors: errors.slice(0, 5), captchaDetected, modalDetected, pageType };
    });
  }
}
