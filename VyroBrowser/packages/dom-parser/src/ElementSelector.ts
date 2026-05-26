/**
 * ElementSelector provides utilities for generating stable, readable
 * CSS selectors for elements identified by various attributes.
 */

export class ElementSelector {
  /**
   * Generate the most stable selector for an element, in priority order:
   * 1. ID
   * 2. data-testid
   * 3. aria-label
   * 4. name attribute (for form fields)
   * 5. role + text
   * 6. tag + text
   */
  static generateSelector(element: {
    id?: string;
    testId?: string;
    ariaLabel?: string;
    name?: string;
    role?: string;
    tagName: string;
    text?: string;
    type?: string;
  }): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.testId) {
      return `[data-testid="${element.testId}"]`;
    }

    if (element.ariaLabel) {
      return `[aria-label="${element.ariaLabel}"]`;
    }

    const tag = element.tagName.toLowerCase();

    if (element.name && ['input', 'select', 'textarea'].includes(tag)) {
      return `${tag}[name="${element.name}"]`;
    }

    if (element.role && element.text) {
      return `[role="${element.role}"]:has-text("${element.text.slice(0, 40)}")`;
    }

    if (element.text && ['button', 'a', 'label'].includes(tag)) {
      return `${tag}:has-text("${element.text.slice(0, 40)}")`;
    }

    if (element.type && tag === 'input') {
      return `input[type="${element.type}"]`;
    }

    return tag;
  }

  /**
   * Validates that a selector string is syntactically reasonable.
   * Returns false for clearly dynamic selectors.
   */
  static isStableSelector(selector: string): boolean {
    // Red flags: pure numeric classes, generated hashes
    if (/\.\w*\d{4,}\w*/.test(selector)) return false; // .css-1h2i3j
    if (/nth-child\(\d+\)/.test(selector)) return false;
    if (/nth-of-type\(\d+\)/.test(selector)) return false;
    return true;
  }
}
