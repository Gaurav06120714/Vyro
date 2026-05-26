import { ipcMain, session } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { IPC } from '../../shared/ipc-channels';
import { WindowManager } from '../window-manager';

type PermissionCallback = (granted: boolean) => void;
const pendingCallbacks = new Map<string, PermissionCallback>();

export function registerPermissionsIpc(wm: WindowManager): void {
  // Override the default session permission handler to prompt the UI
  const defaultSession = session.defaultSession;

  defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const requestId = uuidv4();
    pendingCallbacks.set(requestId, callback);

    const win = wm.getMain();
    if (win) {
      win.webContents.send(IPC.PERMISSION_REQUEST, {
        requestId,
        permission,
        origin: details.requestingUrl,
      });
    } else {
      // No window to prompt — deny
      pendingCallbacks.delete(requestId);
      callback(false);
    }
  });

  ipcMain.handle(IPC.PERMISSION_RESPOND, (_event, { requestId, granted }: { requestId: string; granted: boolean }) => {
    const cb = pendingCallbacks.get(requestId);
    if (cb) {
      pendingCallbacks.delete(requestId);
      cb(granted);
    }
    return { ok: true };
  });
}
