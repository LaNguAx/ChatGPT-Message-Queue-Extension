// Zip the production build in dist/ into a Chrome Web Store-ready archive.
// Run with: npm run build && npm run package
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

// archiver is CommonJS; load it through require so its export resolves cleanly
// from this ESM script regardless of Node's interop heuristics.
const require = createRequire(import.meta.url);
const archiver = require('archiver');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distDir = join(root, 'dist');
const releasesDir = join(root, 'releases');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(join(distDir, 'manifest.json'))) {
  console.error('dist/manifest.json not found. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(releasesDir, { recursive: true });

const outPath = join(releasesDir, `${pkg.name}-${pkg.version}.zip`);
const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (statSync(outPath).size / 1024).toFixed(1);
  console.log(`wrote ${outPath} (${kb} kB)`);
});
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') console.warn(err);
  else throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
// Zip the CONTENTS of dist/ at the archive root (no leading dist/ folder),
// which is what the Chrome Web Store expects.
archive.directory(distDir, false);
await archive.finalize();
