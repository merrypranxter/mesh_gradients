// =============================================================================
// example 03 — export an OKLab-correct CSS gradient string
// =============================================================================
// CSS `linear-gradient(#a, #b)` interpolates in sRGB → muddy midpoints (the same
// bug this whole repo fights). Modern browsers support `in oklab`, but support
// is uneven. This baker side-steps both: it samples the blend in OKLab on the
// CPU and emits *many* hard sRGB stops, so the muddiness is gone everywhere.
//
//   node examples/03-css-gradient-export.js
//   …or import { bakeCssGradient } and use it in a build step.
// =============================================================================

import { hexToRgb, rgbToHex, mixOklab } from '../src/js/color-systems.js';

/**
 * @param {string[]} stops  e.g. ['#FF6B9D','#6B9DFF','#6BFFB8']
 * @param {object}   opts   { angle=90, samples=12, type='linear' }
 * @returns {string} a CSS gradient with pre-baked OKLab stops
 */
export function bakeCssGradient(stops, opts = {}) {
  const { angle = 90, samples = 12, type = 'linear' } = opts;
  const segs = stops.length - 1;
  const out = [];
  for (let s = 0; s <= samples; s++) {
    const g = s / samples;             // 0..1 across the whole gradient
    const tt = g * segs;
    const i = Math.min(Math.floor(tt), segs - 1);
    const col = mixOklab(hexToRgb(stops[i]), hexToRgb(stops[i + 1]), tt - i);
    out.push(`${rgbToHex(col)} ${(g * 100).toFixed(1)}%`);
  }
  const head = type === 'conic' ? `conic-gradient(from ${angle}deg` : `linear-gradient(${angle}deg`;
  return `${head}, ${out.join(', ')})`;
}

// --- demo when run directly under node -------------------------------------
const isMain = import.meta.url === `file://${process?.argv?.[1]}`;
if (isMain) {
  const stripe = ['#FF6B9D', '#C66BFF', '#6B9DFF', '#6BFFB8', '#FFD66B', '#FF8C6B'];
  console.log('/* stripe_mesh, OKLab-baked: */');
  console.log(`background: ${bakeCssGradient(stripe, { angle: 120, samples: 16 })};`);
}
