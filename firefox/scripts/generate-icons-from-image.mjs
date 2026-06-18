import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'assets', 'malisa-source.png');
const outDir = join(root, 'icons');

mkdirSync(outDir, { recursive: true });
mkdirSync(dirname(src), { recursive: true });

const sizes = [16, 48, 128];

for (const size of sizes) {
  await sharp(src)
    .resize(600, 600, { fit: 'cover', position: 'top' })
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon${size}.png`));
  console.log(`Created icon${size}.png`);
}
