import type { BrowserState } from '@vyro/shared-types';

/**
 * StateSerializer converts a BrowserState into a compact text representation
 * that can be efficiently passed to Claude in the conversation context.
 */
export class StateSerializer {
  serialize(state: BrowserState): string {
    const lines: string[] = [
      `=== Browser State ===`,
      `URL: ${state.url}`,
      `Title: ${state.title}`,
      `Timestamp: ${state.timestamp.toISOString()}`,
      '',
    ];

    const dom = state.domSummary;

    if (dom.captchaDetected) {
      lines.push('⚠️  CAPTCHA DETECTED — Human approval required');
      lines.push('');
    }

    if (dom.modalDetected) {
      lines.push('📋 Modal/Dialog detected on page');
      lines.push('');
    }

    if (dom.errors.length > 0) {
      lines.push('❌ Page Errors:');
      dom.errors.forEach((e) => lines.push(`  - ${e}`));
      lines.push('');
    }

    if (dom.interactiveElements.length > 0) {
      lines.push('--- Interactive Elements ---');
      dom.interactiveElements.slice(0, 30).forEach((el) => {
        const parts = [`[${el.type}]`, el.selector];
        if (el.text) parts.push(`"${el.text}"`);
        if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
        if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`);
        if (!el.enabled) parts.push('(disabled)');
        lines.push(`  ${parts.join(' ')}`);
      });
      lines.push('');
    }

    if (dom.forms.length > 0) {
      lines.push('--- Forms ---');
      dom.forms.forEach((form) => {
        lines.push(`  Form: ${form.selector} [action=${form.action ?? 'none'} method=${form.method ?? 'GET'}]`);
        form.fields.forEach((f) => {
          const req = f.required ? ' (required)' : '';
          const opts = f.options ? ` options=[${f.options.slice(0, 5).join(', ')}]` : '';
          lines.push(`    - ${f.selector} type=${f.type} label="${f.label ?? f.name}"${req}${opts}`);
        });
      });
      lines.push('');
    }

    if (dom.links.length > 0) {
      lines.push('--- Links (first 20) ---');
      dom.links.slice(0, 20).forEach((link) => {
        lines.push(`  ${link.text || '(no text)'} → ${link.href}`);
      });
      lines.push('');
    }

    if (dom.visibleText) {
      lines.push('--- Visible Text (excerpt) ---');
      lines.push(dom.visibleText.slice(0, 2000));
      lines.push('');
    }

    return lines.join('\n');
  }

  serializeCompact(state: BrowserState): string {
    const dom = state.domSummary;
    const alerts: string[] = [];
    if (dom.captchaDetected) alerts.push('CAPTCHA');
    if (dom.modalDetected) alerts.push('MODAL');
    if (dom.errors.length > 0) alerts.push(`${dom.errors.length} errors`);

    return [
      `URL: ${state.url}`,
      `Title: ${state.title}`,
      alerts.length > 0 ? `Alerts: ${alerts.join(', ')}` : '',
      `Elements: ${dom.interactiveElements.length} interactive, ${dom.forms.length} forms, ${dom.links.length} links`,
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
