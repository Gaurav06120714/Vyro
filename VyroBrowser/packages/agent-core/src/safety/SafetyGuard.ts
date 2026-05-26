import type { BrowserAction, SafetyCheckResult } from '@vyro/shared-types';

const DANGEROUS_ACTION_TYPES = new Set(['human_approval']);

const SENSITIVE_ACTION_TYPES = new Set([
  'type', // Could be entering passwords — check context
]);

const ALWAYS_APPROVE_ACTION_TYPES = new Set(['upload']);

const DANGEROUS_URL_PATTERNS = [
  /^https?:\/\/localhost/,
  /^https?:\/\/127\.\d+\.\d+\.\d+/,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\.\d+\.\d+\.\d+/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/,
  /^https?:\/\/192\.168\.\d+\.\d+/,
  /^https?:\/\/169\.254\.\d+\.\d+/,
  /^file:\/\//,
];

const PAYMENT_URL_PATTERNS = [
  /checkout/i,
  /payment/i,
  /billing/i,
  /stripe\.com/i,
  /paypal\.com/i,
  /pay\.google\.com/i,
];

const SENSITIVE_FORM_KEYWORDS = [
  'password',
  'credit card',
  'card number',
  'cvv',
  'ssn',
  'social security',
  'bank account',
  'routing number',
];

export interface SafetyConfig {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireApprovalFor?: string[];
}

/**
 * SafetyGuard validates browser actions before execution.
 * It enforces domain policies, detects dangerous actions, and
 * identifies when human approval is required.
 */
export class SafetyGuard {
  private readonly config: SafetyConfig;
  private readonly blockedDomainPatterns: RegExp[];
  private readonly allowAll: boolean;

  constructor(config: SafetyConfig = {}) {
    this.config = config;
    this.allowAll = !config.allowedDomains || config.allowedDomains.includes('*');

    this.blockedDomainPatterns = (config.blockedDomains ?? []).map(
      (d) => new RegExp(d.replace(/\./g, '\\.').replace(/\*/g, '.*'), 'i')
    );
  }

  checkAction(action: BrowserAction, currentUrl?: string): SafetyCheckResult {
    // Always-block: human_approval is a meta-action, never executed directly
    if (DANGEROUS_ACTION_TYPES.has(action.type)) {
      return { allowed: false, reason: 'This action type is handled by the approval system' };
    }

    // Check requiresApproval flag set by AI
    if (action.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Action marked as requiring approval',
      };
    }

    // Check always-approve types
    if (ALWAYS_APPROVE_ACTION_TYPES.has(action.type)) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'File upload actions require human approval',
      };
    }

    // Domain check for navigation
    if (action.type === 'navigate' && action.url) {
      const domainCheck = this.checkUrl(action.url);
      if (!domainCheck.allowed) return domainCheck;

      // Check if navigating to payment page
      if (PAYMENT_URL_PATTERNS.some((p) => p.test(action.url!))) {
        return {
          allowed: true,
          requiresApproval: true,
          reason: 'Navigation to payment/checkout page requires human approval',
        };
      }
    }

    // Sensitive form fields
    if (action.type === 'type' && action.value) {
      const valueLower = action.description.toLowerCase();
      if (SENSITIVE_FORM_KEYWORDS.some((k) => valueLower.includes(k))) {
        return {
          allowed: true,
          requiresApproval: true,
          reason: `Typing into sensitive field (${action.description}) requires human approval`,
        };
      }
    }

    // Custom approval list from task options
    if (this.config.requireApprovalFor?.includes(action.type)) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Action type "${action.type}" is in the approval list for this task`,
      };
    }

    return { allowed: true };
  }

  checkUrl(url: string): SafetyCheckResult {
    // Block internal network addresses always
    if (DANGEROUS_URL_PATTERNS.some((p) => p.test(url))) {
      return {
        allowed: false,
        reason: `Navigation to internal/private network address is blocked: ${url}`,
      };
    }

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return { allowed: false, reason: `Invalid URL: ${url}` };
    }

    // Check blocked domains
    if (this.blockedDomainPatterns.some((p) => p.test(hostname))) {
      return { allowed: false, reason: `Domain "${hostname}" is blocked` };
    }

    // Check allowed domains
    if (!this.allowAll) {
      const allowed = (this.config.allowedDomains ?? []).some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
      if (!allowed) {
        return {
          allowed: false,
          reason: `Domain "${hostname}" is not in the allowed list`,
        };
      }
    }

    return { allowed: true };
  }

  isSensitiveAction(action: BrowserAction): boolean {
    return (
      SENSITIVE_ACTION_TYPES.has(action.type) ||
      action.requiresApproval === true ||
      PAYMENT_URL_PATTERNS.some((p) => p.test(action.url ?? ''))
    );
  }
}
