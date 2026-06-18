async function main() {
  const version = await readVersion();
  const outDir = path.join(root, 'release');
  await mkdir(outDir, { recursive: true });
  const files = await collectFiles(root);

  const zipName = `malisa-ai-translator-${version}.zip`;
  const zipPath = path.join(outDir, zipName);
  const bytes = await createZip(zipPath, files);
  console.log(`Created ${zipPath} (${bytes} bytes)`);
}
