import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outRoot = path.resolve(root, '..', 'malisa-chrome-webstore', 'release');

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'release', '.git']);
const EXCLUDE_FILES = new Set(['package-lock.json', 'malisa-icon-source.png']);

async function readVersion() {
  const raw = await readFile(path.join(root, 'manifest.json'), 'utf8');
  return JSON.parse(raw).version;
}

async function collectFiles(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      files.push(...(await collectFiles(path.join(dir, entry.name), rel)));
    } else if (!EXCLUDE_FILES.has(entry.name) && !entry.name.endsWith('.zip')) {
      if (base === 'assets' && entry.name.endsWith('-source.png')) continue;
      files.push(rel);
    }
  }
  return files;
}

async function main() {
  const version = await readVersion();
  await mkdir(outRoot, { recursive: true });
  const zipPath = path.join(outRoot, `malisa-chrome-${version}.zip`);
  const output = createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });
  archive.pipe(output);
  for (const rel of (await collectFiles(root)).sort()) {
    const abs = path.join(root, rel);
    if ((await stat(abs)).isFile()) archive.file(abs, { name: rel.replace(/\\/g, '/') });
  }
  await archive.finalize();
  await done;
  console.log(`Created ${zipPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
