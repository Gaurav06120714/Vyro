#!/usr/bin/env node
/**
 * Vyro Browser — Icon Generation Pipeline
 *
 * Generates all required platform icons from SVG source definitions.
 * Requires: sips (macOS built-in), iconutil (macOS built-in), and either
 * `sharp` or the system python3 for PNG manipulation.
 *
 * Run from apps/browser/:
 *   node resources/icons/generate-icons.mjs
 */

import { execSync, spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname);

// ── SVG sources ─────────────────────────────────────────────────────────────

/** macOS icon: circular, dark bg, silver rim, neon-V logo */
const MAC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0a0a14"/>
    </radialGradient>
    <radialGradient id="rim" cx="50%" cy="50%" r="50%">
      <stop offset="85%" stop-color="transparent"/>
      <stop offset="90%" stop-color="#6b7280"/>
      <stop offset="95%" stop-color="#d1d5db"/>
      <stop offset="98%" stop-color="#9ca3af"/>
      <stop offset="100%" stop-color="#6b7280"/>
    </radialGradient>
    <linearGradient id="vLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="60%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="wave2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="circle">
      <circle cx="512" cy="512" r="490"/>
    </clipPath>
  </defs>

  <!-- Circular background -->
  <circle cx="512" cy="512" r="490" fill="url(#bg)"/>

  <!-- Inner subtle highlight -->
  <circle cx="512" cy="512" r="490" fill="url(#rim)"/>

  <!-- Logo group clipped to circle -->
  <g clip-path="url(#circle)" filter="url(#glow)">
    <!-- V left stroke -->
    <polygon points="270,270 340,270 512,580 440,580"
      fill="url(#vLeft)" opacity="0.95"/>
    <!-- V right stroke -->
    <polygon points="684,270 754,270 582,580 512,580"
      fill="url(#vLeft)" opacity="0.85"/>

    <!-- Wave ribbons -->
    <path d="M 200 480 Q 320 420 440 500 Q 560 580 680 480 Q 760 420 820 460"
      stroke="url(#wave1)" stroke-width="28" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M 200 530 Q 320 470 440 550 Q 560 630 680 530 Q 760 470 820 510"
      stroke="url(#wave2)" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M 200 575 Q 320 515 440 595 Q 560 675 680 575 Q 760 515 820 555"
      stroke="url(#wave1)" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.5"/>
  </g>

  <!-- Rim ring overlay -->
  <circle cx="512" cy="512" r="490" fill="none" stroke="#9ca3af" stroke-width="8" opacity="0.6"/>
  <circle cx="512" cy="512" r="482" fill="none" stroke="#d1d5db" stroke-width="3" opacity="0.3"/>
</svg>`;

/** Windows icon: rounded-square, deep blue bg, neon-V logo */
const WIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="wbg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e2a5e"/>
      <stop offset="60%" stop-color="#0f1535"/>
      <stop offset="100%" stop-color="#080d1f"/>
    </radialGradient>
    <linearGradient id="wv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="40%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="ww1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="60%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="ww2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="wglow">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.6"/>
    </linearGradient>
    <clipPath id="rrect">
      <rect width="512" height="512" rx="110" ry="110"/>
    </clipPath>
  </defs>

  <!-- Rounded square background -->
  <rect width="512" height="512" rx="110" ry="110" fill="url(#wbg)"/>

  <!-- Subtle inner glow at top-left -->
  <radialGradient id="shine" cx="30%" cy="25%" r="50%">
    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="transparent"/>
  </radialGradient>
  <rect width="512" height="512" rx="110" ry="110" fill="url(#shine)"/>

  <!-- Logo group -->
  <g clip-path="url(#rrect)" filter="url(#wglow)">
    <!-- V left stroke -->
    <polygon points="130,130 168,130 256,295 218,295"
      fill="url(#wv)" opacity="0.95"/>
    <!-- V right stroke -->
    <polygon points="344,130 382,130 294,295 256,295"
      fill="url(#wv)" opacity="0.85"/>

    <!-- Wave ribbons -->
    <path d="M 96 240 Q 160 210 220 250 Q 290 295 350 240 Q 390 210 416 228"
      stroke="url(#ww1)" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M 96 268 Q 160 238 220 278 Q 290 323 350 268 Q 390 238 416 256"
      stroke="url(#ww2)" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M 96 292 Q 160 262 220 302 Q 290 347 350 292 Q 390 262 416 280"
      stroke="url(#ww1)" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.5"/>
  </g>

  <!-- Border glow -->
  <rect width="512" height="512" rx="110" ry="110"
    fill="none" stroke="url(#border)" stroke-width="3"/>
</svg>`;

// ── Helper: write SVG and rasterize to PNG ───────────────────────────────────

function svgToPng(svgContent, outPath, size) {
  const tmpSvg = outPath.replace('.png', '.tmp.svg');
  writeFileSync(tmpSvg, svgContent);

  // Use sips to convert (macOS built-in) — needs a raster first
  // We use python3 + cairosvg if available, otherwise fall back to rsvg-convert
  // Primary: rsvg-convert | qlmanage | sips workaround via Quartz
  const converters = [
    // rsvg-convert (brew install librsvg)
    `rsvg-convert -w ${size} -h ${size} -o "${outPath}" "${tmpSvg}"`,
    // Inkscape
    `inkscape --export-filename="${outPath}" -w ${size} -h ${size} "${tmpSvg}"`,
    // Python cairosvg
    `python3 -c "import cairosvg; cairosvg.svg2png(url='${tmpSvg}', write_to='${outPath}', output_width=${size}, output_height=${size})"`,
  ];

  let converted = false;
  for (const cmd of converters) {
    try {
      execSync(cmd, { stdio: 'pipe' });
      converted = true;
      break;
    } catch {
      // try next
    }
  }

  if (!converted) {
    // Last resort: copy existing icon.png and resize with sips
    console.warn(`  ⚠  No SVG renderer found for ${outPath} — using sips resize from existing icon`);
    const existing = join(__dirname, '../../assets/icon.png');
    execSync(`cp "${existing}" "${outPath}"`, { stdio: 'pipe' });
    execSync(`sips -z ${size} ${size} "${outPath}"`, { stdio: 'pipe' });
  }

  try { rmSync(tmpSvg); } catch {}
}

// ── Step 1: Generate macOS iconset ───────────────────────────────────────────

function buildMacIcns() {
  console.log('\n📦 Building macOS .icns...');
  const iconsetDir = join(ROOT, 'mac', 'icon.iconset');
  mkdirSync(iconsetDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const master = join(ROOT, 'mac', 'icon-1024.png');

  // Generate master 1024px PNG
  svgToPng(MAC_SVG, master, 1024);
  console.log('  ✓ icon-1024.png');

  // Generate all iconset sizes from master using sips
  const iconsetFiles = [
    ['icon_16x16.png',      16],
    ['icon_16x16@2x.png',   32],
    ['icon_32x32.png',      32],
    ['icon_32x32@2x.png',   64],
    ['icon_128x128.png',   128],
    ['icon_128x128@2x.png',256],
    ['icon_256x256.png',   256],
    ['icon_256x256@2x.png',512],
    ['icon_512x512.png',   512],
    ['icon_512x512@2x.png',1024],
  ];

  for (const [filename, size] of iconsetFiles) {
    const out = join(iconsetDir, filename);
    execSync(`sips -z ${size} ${size} "${master}" --out "${out}"`, { stdio: 'pipe' });
    process.stdout.write(`  ✓ ${filename}\n`);
  }

  // Convert iconset → .icns
  const icnsOut = join(ROOT, 'mac', 'icon.icns');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`, { stdio: 'inherit' });
  console.log('  ✓ icon.icns');

  // Clean up iconset directory
  rmSync(iconsetDir, { recursive: true, force: true });
}

// ── Step 2: Generate Windows icons ───────────────────────────────────────────

function buildWinIco() {
  console.log('\n📦 Building Windows .ico...');
  const winDir = join(ROOT, 'win');

  // Master 512px PNG
  const master = join(winDir, 'icon-512.png');
  svgToPng(WIN_SVG, master, 512);
  console.log('  ✓ icon-512.png');

  // Generate intermediate PNGs for .ico
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngPaths = [];
  for (const size of sizes) {
    const p = join(winDir, `icon-${size}.tmp.png`);
    execSync(`sips -z ${size} ${size} "${master}" --out "${p}"`, { stdio: 'pipe' });
    pngPaths.push(p);
  }

  // Build .ico using Python struct packing (no external deps)
  const icoScript = `
import struct, os, sys

files = ${JSON.stringify(pngPaths)}
sizes = ${JSON.stringify(sizes)}
out_path = ${JSON.stringify(join(winDir, 'icon.ico'))}

images = []
for f in files:
    with open(f, 'rb') as fh:
        images.append(fh.read())

# ICO header
num = len(images)
header = struct.pack('<HHH', 0, 1, num)

# Directory entries — offset starts after header (6) + directory (num * 16)
offset = 6 + num * 16
entries = b''
for i, data in enumerate(images):
    w = sizes[i] if sizes[i] < 256 else 0
    h = sizes[i] if sizes[i] < 256 else 0
    entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(data), offset)
    offset += len(data)

with open(out_path, 'wb') as fh:
    fh.write(header + entries + b''.join(images))

print('  ✓ icon.ico written with', num, 'sizes')
`;

  writeFileSync(join(winDir, 'make_ico.py'), icoScript);
  execSync(`python3 "${join(winDir, 'make_ico.py')}"`, { stdio: 'inherit' });
  rmSync(join(winDir, 'make_ico.py'));

  // Copy icon.ico as installer.ico (same icon used for installer branding)
  execSync(`cp "${join(winDir, 'icon.ico')}" "${join(winDir, 'installer.ico')}"`, { stdio: 'pipe' });
  console.log('  ✓ installer.ico');

  // Clean temp files
  for (const p of pngPaths) {
    try { rmSync(p); } catch {}
  }
}

// ── Step 3: Generate Linux icons ─────────────────────────────────────────────

function buildLinuxIcons() {
  console.log('\n📦 Building Linux icons...');
  const linuxDir = join(ROOT, 'linux');
  mkdirSync(linuxDir, { recursive: true });

  const master = join(ROOT, 'mac', 'icon-1024.png');
  const sizes = [16, 32, 48, 64, 128, 256, 512];

  for (const size of sizes) {
    const out = join(linuxDir, `${size}x${size}.png`);
    execSync(`sips -z ${size} ${size} "${master}" --out "${out}"`, { stdio: 'pipe' });
    process.stdout.write(`  ✓ ${size}x${size}.png\n`);
  }
}

// ── Step 4: Generate web/UI favicons ─────────────────────────────────────────

function buildFavicons() {
  console.log('\n📦 Building web favicons...');
  const pngDir = join(ROOT, 'png');
  const master = join(ROOT, 'mac', 'icon-1024.png');

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const size of sizes) {
    const out = join(pngDir, `favicon-${size}.png`);
    execSync(`sips -z ${size} ${size} "${master}" --out "${out}"`, { stdio: 'pipe' });
    process.stdout.write(`  ✓ favicon-${size}.png\n`);
  }

  // logo-transparent.png — 512px version
  execSync(`cp "${join(pngDir, 'favicon-512.png')}" "${join(pngDir, 'logo-transparent.png')}"`, { stdio: 'pipe' });
  console.log('  ✓ logo-transparent.png');
}

// ── Step 5: Copy to assets/ (electron-builder source) ───────────────────────

function copyToAssets() {
  console.log('\n📦 Copying to assets/...');
  const assetsDir = join(__dirname, '../../assets');
  mkdirSync(join(assetsDir, 'icons'), { recursive: true });

  execSync(`cp "${join(ROOT, 'mac/icon.icns')}" "${join(assetsDir, 'icon.icns')}"`, { stdio: 'pipe' });
  execSync(`cp "${join(ROOT, 'mac/icon-1024.png')}" "${join(assetsDir, 'icon.png')}"`, { stdio: 'pipe' });
  execSync(`cp "${join(ROOT, 'win/icon.ico')}" "${join(assetsDir, 'icon.ico')}"`, { stdio: 'pipe' });

  // Linux icons dir
  const linuxTarget = join(assetsDir, 'icons');
  const linuxSrc = join(ROOT, 'linux');
  execSync(`cp -r "${linuxSrc}/." "${linuxTarget}/"`, { stdio: 'pipe' });

  console.log('  ✓ assets/icon.icns');
  console.log('  ✓ assets/icon.png');
  console.log('  ✓ assets/icon.ico');
  console.log('  ✓ assets/icons/ (Linux sizes)');
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('🎨 Vyro Browser — Icon Generation Pipeline');
console.log('==========================================');

buildMacIcns();
buildWinIco();
buildLinuxIcons();
buildFavicons();
copyToAssets();

console.log('\n✅ All icons generated successfully.\n');
console.log('Files written to:');
console.log('  resources/icons/mac/    — .icns, icon-1024.png');
console.log('  resources/icons/win/    — .ico, installer.ico, icon-512.png');
console.log('  resources/icons/linux/  — 16–512px PNGs');
console.log('  resources/icons/png/    — favicons, logo-transparent');
console.log('  assets/                 — deployed to electron-builder source');
