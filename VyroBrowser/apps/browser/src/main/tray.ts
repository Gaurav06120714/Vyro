import { Tray, Menu, nativeImage, app, BrowserWindow, NativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

let tray: Tray | null = null;

/** Resolve the best tray icon for the current platform and DPI. */
function getTrayIcon(): NativeImage {
  const base = path.join(__dirname, '../../assets');

  if (process.platform === 'win32') {
    // Windows: use .ico — Windows scales it automatically for all DPIs
    try {
      const ico = path.join(base, 'icon.ico');
      if (fs.existsSync(ico)) {
        const img = nativeImage.createFromPath(ico);
        if (!img.isEmpty()) return img;
      }
    } catch {
      // fall through to PNG fallbacks
    }
  }

  if (process.platform === 'linux') {
    // Try multiple icon sizes — prefer larger sizes for HiDPI displays
    for (const size of [256, 48, 32, 16]) {
      try {
        const p = path.join(base, 'icons', `${size}x${size}.png`);
        if (fs.existsSync(p)) {
          const img = nativeImage.createFromPath(p);
          if (!img.isEmpty()) return img.resize({ width: 22, height: 22 });
        }
      } catch {
        // try next size
      }
    }
    // Final Linux fallback: empty image with colored tint is not possible via
    // nativeImage API, so return a 16x16 blank image to prevent crash
    return nativeImage.createEmpty();
  }

  // macOS / Windows fallback: use the 32px PNG
  try {
    const png32 = path.join(base, 'icons', '32x32.png');
    if (fs.existsSync(png32)) {
      const img32 = nativeImage.createFromPath(png32);
      if (!img32.isEmpty()) return img32.resize({ width: 22, height: 22 });
    }
  } catch {
    // fall through
  }

  // Ultimate fallback: resize icon.png
  try {
    const iconPng = path.join(base, 'icon.png');
    if (fs.existsSync(iconPng)) {
      return nativeImage.createFromPath(iconPng).resize({ width: 22, height: 22 });
    }
  } catch {
    // fall through
  }

  return nativeImage.createEmpty();
}

export function createTray(getWindow: () => BrowserWindow | null): void {
  if (process.platform !== 'win32' && process.platform !== 'linux') return;
  if (tray) return;

  let icon: NativeImage;
  try {
    icon = getTrayIcon();
  } catch {
    icon = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(icon);
  } catch (err) {
    // Tray creation failed (e.g. no system tray on this Linux session) — ignore
    console.warn('Failed to create system tray:', err);
    return;
  }
  tray.setToolTip('Vyro Browser');

  const rebuild = () => {
    const win = getWindow();
    const isVisible = win?.isVisible() ?? false;
    const menu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Vyro' : 'Show Vyro',
        click: () => {
          const w = getWindow();
          if (!w) return;
          if (w.isVisible()) { w.hide(); } else { w.show(); w.focus(); }
          rebuild();
        },
      },
      { type: 'separator' },
      {
        label: 'New Tab',
        click: () => {
          const w = getWindow();
          if (!w) return;
          w.show(); w.focus();
          w.webContents.send('app:new-tab');
        },
      },
      {
        label: 'New Window',
        click: () => {
          const w = getWindow();
          if (w) { w.show(); w.focus(); }
        },
      },
      { type: 'separator' },
      { label: 'Quit Vyro', click: () => app.quit() },
    ]);
    tray!.setContextMenu(menu);
  };

  rebuild();

  tray.on('click', () => {
    const w = getWindow();
    if (!w) return;
    if (w.isVisible()) { w.focus(); } else { w.show(); w.focus(); }
    rebuild();
  });

  tray.on('double-click', () => {
    const w = getWindow();
    if (!w) return;
    w.show(); w.focus();
  });
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
