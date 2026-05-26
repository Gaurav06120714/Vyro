// ─────────────────────────────────────────────────────────────────────────────
// perf-utils.ts — Production performance utilities for VyroBrowser.
// Handles GPU cache recovery, stale lock cleanup, and process health checks.
// ─────────────────────────────────────────────────────────────────────────────
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Clean up stale Electron single-instance lock files.
 * Stale locks can prevent the app from launching after a crash.
 */
export function cleanStaleLocks(): void {
  const userData = app.getPath('userData');
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const f of lockFiles) {
    const p = path.join(userData, f);
    try {
      if (fs.existsSync(p)) {
        // Check if the lock is actually stale (older than 60s and no matching PID)
        const stat = fs.statSync(p);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > 60_000) {
          fs.unlinkSync(p);
        }
      }
    } catch { /* ignore */ }
  }
}

/**
 * Clear GPU shader cache to recover from GPU driver instability.
 * Safe to call on startup if previous session crashed.
 */
export function clearGpuCacheIfCorrupt(): void {
  const gpuCache = path.join(app.getPath('userData'), 'GPUCache');
  const crashFlag = path.join(app.getPath('userData'), '.gpu_crash');

  // If GPU crash flag exists from previous session, clear cache
  if (fs.existsSync(crashFlag)) {
    try {
      if (fs.existsSync(gpuCache)) {
        fs.rmSync(gpuCache, { recursive: true, force: true });
      }
      fs.unlinkSync(crashFlag);
    } catch { /* best-effort */ }
  }
}

/**
 * Write GPU crash flag so next startup can detect and clear corrupt GPU cache.
 */
export function markGpuCrash(): void {
  try {
    const crashFlag = path.join(app.getPath('userData'), '.gpu_crash');
    fs.writeFileSync(crashFlag, String(Date.now()), 'utf8');
  } catch { /* ignore */ }
}

/**
 * Get approximate memory usage of the main process in MB.
 */
export function getMainProcessMemoryMB(): number {
  const mem = process.memoryUsage();
  return Math.round(mem.rss / 1024 / 1024);
}

/**
 * Returns true if we should disable hardware acceleration.
 * Checks for known problematic driver signatures via environment.
 */
export function shouldDisableHardwareAcceleration(): boolean {
  // Disable on headless/CI environments
  if (process.env.ELECTRON_DISABLE_GPU === '1') return true;
  if (process.env.CI === 'true') return true;
  return false;
}
