// ─────────────────────────────────────────────────────────────────────────────
// shortcuts.ts — Global keyboard shortcut registration.
//
// Uses Cmd on macOS and Ctrl on Windows/Linux for all shortcuts.
// Pushes shortcut:action events to the renderer so the existing
// handleShortcutAction() logic in App.tsx processes them.
// ─────────────────────────────────────────────────────────────────────────────
import { globalShortcut, BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels';

const mod = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';

interface ShortcutDef {
  accelerator: string;
  action: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { accelerator: `${mod}+T`,           action: 'new-tab' },
  { accelerator: `${mod}+W`,           action: 'close-tab' },
  { accelerator: `${mod}+R`,           action: 'reload' },
  { accelerator: `${mod}+Shift+R`,     action: 'hard-reload' },
  { accelerator: `${mod}+[`,           action: 'go-back' },
  { accelerator: `${mod}+]`,           action: 'go-forward' },
  { accelerator: `${mod}+F`,           action: 'find' },
  { accelerator: `${mod}+Alt+I`,       action: 'devtools' },
  { accelerator: `${mod}+L`,           action: 'focus-address-bar' },
  { accelerator: `${mod}+K`,           action: 'command-palette' },
  { accelerator: `${mod}+Shift+Left`,  action: 'go-back' },
  { accelerator: `${mod}+Shift+Right`, action: 'go-forward' },
  // Tab switching
  { accelerator: `${mod}+Tab`,         action: 'next-tab' },
  { accelerator: `${mod}+Shift+Tab`,   action: 'prev-tab' },
];

let registered = false;

export function registerShortcuts(window: BrowserWindow): void {
  if (registered) return;
  registered = true;

  for (const { accelerator, action } of SHORTCUTS) {
    try {
      globalShortcut.register(accelerator, () => {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC.SHORTCUT_ACTION, action);
        }
      });
    } catch {
      // Some accelerators may conflict with OS-level shortcuts — skip silently
      console.warn(`[shortcuts] Could not register: ${accelerator}`);
    }
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
  registered = false;
}
