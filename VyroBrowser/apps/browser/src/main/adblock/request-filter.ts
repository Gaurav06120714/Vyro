import { Session } from 'electron';
import { initBlocker, resetBlocker } from './engine';
import { SettingsService } from '../services/settings-service';

export interface AdblockStats {
  totalBlocked: number;
  trackersBlocked: number;
  sessionBlocked: number;
  totalAllowed: number;
}

const SITE_RULE_PREFIX = 'adblock:site:';

const stats: AdblockStats = { totalBlocked: 0, trackersBlocked: 0, sessionBlocked: 0, totalAllowed: 0 };

// In-memory cache populated from DB on startup
const siteOverridesCache = new Map<string, boolean>(); // origin → enabled

let statsListenerAttached = false;

export async function setupAdblocking(sess: Session): Promise<void> {
  const blocker = await initBlocker();

  // Attach stats listeners once — the blocker is a singleton, so multiple sessions
  // should not register duplicate handlers.
  if (!statsListenerAttached) {
    statsListenerAttached = true;
    blocker.on('request-blocked', () => {
      stats.totalBlocked++;
      stats.sessionBlocked++;
    });
    blocker.on('request-allowed', () => {
      stats.totalAllowed++;
    });
  }

  blocker.enableBlockingInSession(sess);
}

export async function reloadBlocklists(sess: Session): Promise<void> {
  const { getBlocker } = await import('./engine');
  const currentBlocker = getBlocker();
  if (currentBlocker) {
    currentBlocker.disableBlockingInSession(sess);
  }
  resetBlocker();
  statsListenerAttached = false; // Reset so new blocker gets listeners attached
  const newBlocker = await initBlocker();
  // Re-attach stats listeners on new blocker instance
  statsListenerAttached = true;
  newBlocker.on('request-blocked', () => {
    stats.totalBlocked++;
    stats.sessionBlocked++;
  });
  newBlocker.on('request-allowed', () => {
    stats.totalAllowed++;
  });
  newBlocker.enableBlockingInSession(sess);
}

export function incrementBlocked(isTracker = false): void {
  stats.totalBlocked++;
  stats.sessionBlocked++;
  if (isTracker) stats.trackersBlocked++;
}

export function getStats(): AdblockStats & { blocked: number; allowed: number; total: number } {
  return {
    ...stats,
    blocked: stats.totalBlocked,
    allowed: stats.totalAllowed,
    total: stats.totalBlocked + stats.totalAllowed,
  };
}

export function setSiteOverride(origin: string, enabled: boolean, settingsService?: SettingsService): void {
  siteOverridesCache.set(origin, enabled);
  if (settingsService) {
    // Use a special profile key for global adblock site rules
    const key = `${SITE_RULE_PREFIX}${origin}`;
    // We store in the default profile since adblock rules are global
    settingsService.setRaw('default', key, enabled);
  }
}

export function getSiteOverride(origin: string): boolean | undefined {
  return siteOverridesCache.get(origin);
}

export function getAllSiteOverrides(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  siteOverridesCache.forEach((val, key) => { result[key] = val; });
  return result;
}

/**
 * Load all adblock:site:* rules from SettingsService into the in-memory cache.
 * Call this once at startup.
 */
export function loadSiteRulesFromDb(settingsService: SettingsService): void {
  const rules = settingsService.getAllByPrefix('default', SITE_RULE_PREFIX);
  for (const [key, value] of Object.entries(rules)) {
    const origin = key.slice(SITE_RULE_PREFIX.length);
    if (origin) siteOverridesCache.set(origin, Boolean(value));
  }
}
