#!/usr/bin/env node
/*
  Bundles sub-app static outputs into the landing site's `out/` folder
  so paths like /valora, /venuevr, /business-now, /diy work without env.
*/
const { execSync } = require('node:child_process');
const { existsSync, mkdirSync, cpSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', '..'); // apps/
const landingOut = join(__dirname, '..', 'out');

function run(cmd, cwd) {
  execSync(cmd, { stdio: 'inherit', cwd });
}

// Build Valora (Vite) and stage into /public/valora
const valoraDir = join(root, 'valora-web');
if (existsSync(valoraDir)) {
  run('npm ci', valoraDir);
  run('npm run build', valoraDir);
  const src = join(valoraDir, 'dist');
  const dest = join(__dirname, '..', 'public', 'valora');
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// Note: Next sub-app routes (/venuevr, /business-now, /crm) are
// exported by the landing app itself (we added pages for them), so
// no need to build/copy those apps here. Keeping this script lean
// prevents flaky monorepo builds on Netlify.

console.log('Sub-apps bundled into out/');
