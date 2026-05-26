/**
 * SessionService — simplified stub.
 * Browser sessions are managed by BrowserManager (packages/browser-engine).
 * This service exists for API route compatibility.
 */

export class SessionService {
  async getActiveSession(taskId: string): Promise<{ taskId: string; status: string } | null> {
    // In the simplified local architecture, session state lives in BrowserManager
    // This is a lightweight proxy
    return { taskId, status: 'active' };
  }
}
