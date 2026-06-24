// =============================================================================
// example 04 — export a 4-corner Coons patch as an SVG <meshgradient>
// =============================================================================
// SVG 2 has a native <meshgradient> (the Coons patch primitive). It interpolates
// in sRGB, though — so a 1×1 patch of saturated corners goes muddy in the middle,
// exactly like CSS. The fix: subdivide into an n×n grid of small patches whose
// corners we pre-sample in OKLab. Each sub-patch is then small enough that its
// internal sRGB interpolation can't drift far. This is the standard trick for
// "OKLab mesh gradient" in a format that only knows sRGB.
//
//   node examples/04-svg-meshgradient.js > mesh.svg
// =============================================================================

import { pathToFileURL } from 'node:url';
import { hexToRgb, rgbToHex, oklabToSrgb, srgbToOklab } from '../src/js/color-systems.js';

// bilinear-in-OKLab sample of the 4 corner colors at (u,v) ∈ [0,1]²
function sampleCorner(corners, u, v) {
  const [c00, c10, c01, c11] = corners.map(hexToRgb).map(srgbToOklab);
  const lab = [0, 1, 2].map((k) => {
    const bottom = c00[k] + (c10[k] - c00[k]) * u;
    const top = c01[k] + (c11[k] - c01[k]) * u;
    return bottom + (top - bottom) * v;
  });
  return rgbToHex(oklabToSrgb(lab));
}

/**
 * @param {string[]} corners [c00, c10, c01, c11]  (bottom-left, bottom-right, top-left, top-right)
 * @param {object} opts { size=512, divisions=4 }
 * @returns {string} an SVG document string
 */
export function bakeSvgMesh(corners, opts = {}) {
  const { size = 512, divisions = 4 } = opts;
  const step = size / divisions;
  const rows = [];

  for (let r = 0; r < divisions; r++) {
    const patches = [];
    for (let c = 0; c < divisions; c++) {
      // top-left corner color of this sub-patch (SVG meshrows go top→bottom)
      const u = c / divisions, v = 1 - r / divisions;
      const stop = sampleCorner(corners, u, v);
      patches.push(
        `      <meshpatch>
        <stop path="l ${step},0" stop-color="${stop}"/>
        <stop path="l 0,${step}" stop-color="${sampleCorner(corners, (c + 1) / divisions, v)}"/>
        <stop path="l -${step},0" stop-color="${sampleCorner(corners, (c + 1) / divisions, v - 1 / divisions)}"/>
        <stop path="l 0,-${step}" stop-color="${sampleCorner(corners, u, v - 1 / divisions)}"/>
      </meshpatch>`);
    }
    rows.push(`    <meshrow>\n${patches.join('\n')}\n    </meshrow>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <meshgradient id="coons" x="0" y="0" gradientUnits="userSpaceOnUse">
${rows.join('\n')}
    </meshgradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#coons)"/>
</svg>`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  // coons_quad preset corners
  process.stdout.write(bakeSvgMesh(['#FF6B9D', '#6B9DFF', '#FFD66B', '#6BFFB8'], { divisions: 6 }));
}
