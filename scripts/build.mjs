// Builds dist/chrome/ and dist/firefox/ from the single source in chrome/.
// - Chrome keeps the ES-module service worker (background.service_worker).
// - Firefox gets a bundled iife background script (background.scripts) plus
//   browser_specific_settings.gecko, since FF 115+ lacks module workers.
// Usage: node scripts/build.mjs [chrome|firefox] (default: both)
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'chrome');
const dist = path.join(root, 'dist');

const SKIP = new Set([
  'node_modules',
  'tsconfig.json',
  'vite.config.ts',
  'scripts',
  'public',
  '.gitignore',
]);

async function copySource(dest) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  const { readdir } = await import('node:fs/promises');
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    await cp(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true });
  }
}

async function buildChrome() {
  const dest = path.join(dist, 'chrome');
  await copySource(dest);
  console.log(`dist/chrome/ ready — load unpacked from chrome/ or ${dest}`);
}

async function buildFirefox() {
  const dest = path.join(dist, 'firefox');
  await copySource(dest);

  await esbuild.build({
    entryPoints: [path.join(src, 'background/background.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'firefox115',
    outfile: path.join(dest, 'background/bundle.js'),
    logLevel: 'warning',
  });

  const manifestPath = path.join(dest, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.background = { scripts: ['background/bundle.js'] };
  manifest.browser_specific_settings = {
    gecko: {
      id: 'malisa@translator.extension',
      strict_min_version: '115.0',
    },
  };
  // options_page needs FF 126+; options_ui works on FF 115+.
  manifest.options_ui = { page: manifest.options_page, open_in_tab: true };
  delete manifest.options_page;
  // optional_host_permissions needs FF 128+; host_permission requests for
  // custom provider URLs are guarded at runtime instead.
  delete manifest.optional_host_permissions;
  delete manifest.minimum_chrome_version;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`dist/firefox/ ready — load via about:debugging or web-ext run`);
}

const targets = process.argv.slice(2);
const all = !targets.length;
if (all || targets.includes('chrome')) await buildChrome();
if (all || targets.includes('firefox')) await buildFirefox();
