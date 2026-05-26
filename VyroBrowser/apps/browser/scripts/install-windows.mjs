// ─────────────────────────────────────────────────────────────────────────────
// install-windows.mjs — Post-build install script for Windows.
// Copies the unpacked Vyro app to %LOCALAPPDATA%\Programs\Vyro\
// and creates Start Menu + Desktop shortcuts.
// Run via: npm run install-app:win
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcDir  = path.join(root, 'dist', 'win-unpacked');
const destDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\Public', 'Programs', 'Vyro');
const exePath = path.join(destDir, 'Vyro.exe');

// ── 1. Verify build output exists ────────────────────────────────────────────
if (!fs.existsSync(srcDir)) {
  console.error('❌  Build output not found at:', srcDir);
  console.error('    Run "npm run package:win:dir" first.');
  process.exit(1);
}

// ── 2. Copy app to install directory ─────────────────────────────────────────
console.log('📦  Installing Vyro to:', destDir);

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.cpSync(srcDir, destDir, { recursive: true });
console.log('✅  Copied app files.');

// ── 3. Create Desktop shortcut (PowerShell) ───────────────────────────────────
const desktopShortcut = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Public',
  'Desktop', 'Vyro.lnk'
);

const startMenuDir = path.join(
  process.env.APPDATA || '',
  'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Vyro'
);
const startMenuShortcut = path.join(startMenuDir, 'Vyro.lnk');

const psScript = `
$ws = New-Object -ComObject WScript.Shell

# Desktop shortcut
$s = $ws.CreateShortcut('${desktopShortcut.replace(/\\/g, '\\\\')}')
$s.TargetPath = '${exePath.replace(/\\/g, '\\\\')}'
$s.WorkingDirectory = '${destDir.replace(/\\/g, '\\\\')}'
$s.Description = 'Vyro Browser'
$s.Save()

# Start Menu shortcut
New-Item -ItemType Directory -Force -Path '${startMenuDir.replace(/\\/g, '\\\\')}' | Out-Null
$s2 = $ws.CreateShortcut('${startMenuShortcut.replace(/\\/g, '\\\\')}')
$s2.TargetPath = '${exePath.replace(/\\/g, '\\\\')}'
$s2.WorkingDirectory = '${destDir.replace(/\\/g, '\\\\')}'
$s2.Description = 'Vyro Browser'
$s2.Save()

Write-Host 'Shortcuts created.'
`;

try {
  execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log('✅  Desktop & Start Menu shortcuts created.');
} catch {
  console.warn('⚠️   Could not create shortcuts (run as admin if needed).');
}

// ── 4. Done ───────────────────────────────────────────────────────────────────
console.log('');
console.log('🎉  Vyro Browser installed successfully!');
console.log('    Location :', destDir);
console.log('    Run      :', exePath);
console.log('');
console.log('    You can also find Vyro in your Start Menu and Desktop.');
