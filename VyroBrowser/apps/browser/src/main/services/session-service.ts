import { session, Session } from 'electron';
import { WEBVIEW_PARTITION_PREFIX } from '../../shared/constants';

const sessionCache = new Map<string, Session>();

export class SessionService {
  getSession(profileId: string): Session {
    if (sessionCache.has(profileId)) {
      return sessionCache.get(profileId)!;
    }
    const s = session.fromPartition(`${WEBVIEW_PARTITION_PREFIX}${profileId}`, { cache: true });
    sessionCache.set(profileId, s);
    return s;
  }

  configureSession(profileId: string): void {
    const s = this.getSession(profileId);

    // Set a modern Chrome user agent
    s.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );

    // Default permission handler: deny sensitive permissions unless granted
    s.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowedByDefault = ['notifications', 'media', 'geolocation', 'clipboard-read'];
      if (allowedByDefault.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });

    // Download handler: allow all downloads (electron-builder sets savePath)
    s.on('will-download', (_event, item) => {
      // Let the download proceed; the download IPC handler manages state
      item.on('updated', (_e, state) => {
        if (state === 'interrupted') {
          console.warn('Download interrupted', item.getURL());
        }
      });
    });
  }

  async clearSession(profileId: string): Promise<void> {
    const s = this.getSession(profileId);
    await s.clearStorageData();
    await s.clearCache();
  }
}
