// Packs the source needed to rebuild the Firefox add-on, for AMO review.
// Output: release/firefox/malisa-firefox-<version>-source.zip
// Usage: node scripts/source-zip.mjs
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'release', 'firefox');
const outPath = path.join(outDir, `malisa-firefox-${version}-source.zip`);

const files = ['package.json', 'package-lock.json', 'LICENSE', 'SOURCE_BUILD.md'];
const dirs = ['chrome', 'scripts'];

await mkdir(outDir, { recursive: true });
const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });
const done = new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
});
archive.pipe(output);
for (const f of files) {
  if (!existsSync(path.join(root, f))) throw new Error(`Missing ${f}`);
  archive.file(path.join(root, f), { name: f });
}
for (const d of dirs) archive.glob('**/*', { cwd: path.join(root, d), ignore: ['node_modules/**'], dot: false }, { prefix: d });
await archive.finalize();
await done;
console.log(`Created ${outPath}`);
