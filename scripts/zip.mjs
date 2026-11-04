// Zips dist/<browser>/ into release/<browser>/malisa-<browser>-<version>.(zip|xpi)
// Usage: node scripts/zip.mjs [chrome|firefox]
import { createWriteStream, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const browser = process.argv[2] ?? 'firefox';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'dist', browser);
const outDir = path.join(root, 'release', browser);

const manifest = JSON.parse(await readFile(path.join(src, 'manifest.json'), 'utf8'));
const ext = browser === 'firefox' ? 'xpi' : 'zip';
const outPath = path.join(outDir, `malisa-${browser}-${manifest.version}.${ext}`);

await mkdir(outDir, { recursive: true });
const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });
const done = new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
});
archive.pipe(output);

function add(dir, base = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) add(abs, rel);
    else if (statSync(abs).isFile()) archive.file(abs, { name: rel });
  }
}
add(src);

await archive.finalize();
await done;
console.log(`Created ${outPath}`);
