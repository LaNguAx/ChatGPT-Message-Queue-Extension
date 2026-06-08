// Rasterize branding/icon.svg into the PNG sizes the manifest references.
// The SVG lives outside public/ so it is not copied into the shipped build.
// Run with: npm run icons
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const iconsDir = join(root, 'public', 'icons');
const svgPath = join(root, 'branding', 'icon.svg');

const SIZES = [16, 32, 48, 128];

const svg = await readFile(svgPath);

for (const size of SIZES) {
  const out = join(iconsDir, `icon-${size}.png`);
  // Render the vector at high density first, then downscale for crisp edges.
  await sharp(svg, { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`wrote ${out} (${size}x${size})`);
}
