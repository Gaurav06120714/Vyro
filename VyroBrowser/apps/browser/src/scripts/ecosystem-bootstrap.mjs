#!/usr/bin/env node
// ecosystem-bootstrap.mjs — Sets up all Vyro ecosystem apps

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const ECOSYSTEM_DIR = join(homedir(), 'VyroEcosystem');
const APPS = [
  {
    id: 'VyroCoding',
    repo: 'https://github.com/Gaurav06120714/VyroCoding.git',
    port: 3002,
    startCmd: 'cd apps/web && PORT=3002 npm run dev',
    setupCmds: ['npm install'],
    envFile: '.env',
    envContent: `DATABASE_URL=postgresql://vyro:vyro@localhost:5432/vyro_coding
REDIS_URL=redis://localhost:6379
JWT_SECRET=vyro-local-dev-secret-min-32-chars-long
JUDGE0_API_URL=https://ce.judge0.com
NEXT_PUBLIC_API_URL=http://localhost:3003`,
  },
  {
    id: 'VyroMusic',
    repo: 'https://github.com/Gaurav06120714/VyroMusic.git',
    port: 3005,
    startCmd: 'npm run dev --workspace=apps/web',
    setupCmds: ['npm install'],
    envFile: 'apps/api/.env',
    envContent: `PORT=3006
NODE_ENV=development
DATABASE_URL=postgresql://vyro:vyro@localhost:5432/vyro_music
REDIS_URL=redis://localhost:6379
JWT_SECRET=vyro-music-local-dev-secret
JWT_REFRESH_SECRET=vyro-music-refresh-secret
FRONTEND_URL=http://localhost:3005`,
  },
  {
    id: 'VyroNotes',
    repo: 'https://github.com/Gaurav06120714/VyroNotes.git',
    port: 3001,
    startCmd: 'npm run dev',
    setupCmds: ['npm install'],
    envFile: '.env.local',
    envContent: `NEXT_PUBLIC_API_URL=http://localhost:3001`,
  },
  {
    id: 'VyroPortify',
    repo: 'https://github.com/Gaurav06120714/VyroPortify.git',
    port: 3007,
    startCmd: 'npm run dev',
    setupCmds: ['npm install'],
    envFile: '.env.local',
    envContent: `NEXT_PUBLIC_API_URL=http://localhost:3007`,
  },
];

const log = (msg) => console.log(`\x1b[36m[Vyro]\x1b[0m ${msg}`);
const ok  = (msg) => console.log(`\x1b[32m[✓]\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m[!]\x1b[0m ${msg}`);
const err = (msg) => console.log(`\x1b[31m[✗]\x1b[0m ${msg}`);

async function run() {
  console.log('\n\x1b[1m\x1b[35m  Vyro Ecosystem Bootstrap\x1b[0m\n');
  log(`Setting up ecosystem in: ${ECOSYSTEM_DIR}`);

  if (!existsSync(ECOSYSTEM_DIR)) {
    mkdirSync(ECOSYSTEM_DIR, { recursive: true });
    ok(`Created ${ECOSYSTEM_DIR}`);
  }

  let setupCount = 0;
  let skipCount = 0;

  for (const app of APPS) {
    const appDir = join(ECOSYSTEM_DIR, app.id);

    if (existsSync(appDir)) {
      ok(`${app.id} already exists — skipping clone`);
      skipCount++;
    } else {
      log(`Cloning ${app.id}...`);
      try {
        execSync(`git clone ${app.repo} "${appDir}"`, { stdio: 'pipe' });
        ok(`Cloned ${app.id}`);
      } catch (e) {
        warn(`Could not clone ${app.id} (no internet or repo private) — skipping`);
        continue;
      }
    }

    // Write env file if it doesn't exist
    const envPath = join(appDir, app.envFile);
    if (!existsSync(envPath)) {
      try {
        mkdirSync(join(envPath, '..'), { recursive: true });
        writeFileSync(envPath, app.envContent);
        ok(`Created ${app.envFile} for ${app.id}`);
      } catch (e) {
        warn(`Could not write ${app.envFile} for ${app.id}: ${e.message}`);
      }
    }

    // Run npm install if node_modules missing
    if (!existsSync(join(appDir, 'node_modules'))) {
      log(`Installing ${app.id} dependencies...`);
      try {
        execSync('npm install --legacy-peer-deps', { cwd: appDir, stdio: 'pipe', timeout: 120000 });
        ok(`Installed ${app.id}`);
        setupCount++;
      } catch (e) {
        warn(`npm install failed for ${app.id} — you may need to run it manually`);
      }
    } else {
      ok(`${app.id} dependencies already installed`);
    }
  }

  // Write registry file
  const registry = {
    ecosystemDir: ECOSYSTEM_DIR,
    apps: APPS.map(a => ({
      id: a.id.replace('Vyro', '').toLowerCase(),
      dir: join(ECOSYSTEM_DIR, a.id),
      port: a.port,
    })),
    bootstrappedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(ECOSYSTEM_DIR, 'registry.json'),
    JSON.stringify(registry, null, 2)
  );
  ok('Wrote ecosystem registry');

  console.log('\n\x1b[1m\x1b[32m  Bootstrap complete!\x1b[0m');
  console.log(`  Setup: ${setupCount} apps  ·  Skipped: ${skipCount} apps\n`);
  console.log('  Start VyroBrowser to launch the full ecosystem.\n');
}

run().catch(e => { err(e.message); process.exit(1); });
