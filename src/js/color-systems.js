// =============================================================================
// color-systems.js  —  JS face of the shared `color_systems` primitive
// =============================================================================
// Mirrors common/color_systems.glsl for the CPU side (parsing hex, building
// presets). Same caveat: vendored here so mesh_gradients runs standalone; in
// the full batch this comes from the shared color_systems repo. Single source
// of truth for JS color math — don't reimplement OKLab elsewhere.
// =============================================================================

/** "#RRGGBB" → [r,g,b] in gamma sRGB, 0..1. */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** [r,g,b] 0..1 gamma sRGB → "#RRGGBB". */
export function rgbToHex([r, g, b]) {
  const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const srgbToLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const linearToSrgb = (c) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/** gamma sRGB [r,g,b] → OKLab [L,a,b]. */
export function srgbToOklab([r, g, b]) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** OKLab [L,a,b] → gamma sRGB [r,g,b], clamped to gamut. */
export function oklabToSrgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)]
    .map((c) => Math.max(0, Math.min(1, c)));
}

/**
 * THE rule this whole repo exists for. Blend two sRGB colors through OKLab so
 * the midpoint stays vivid instead of going muddy-grey.
 * @param {number[]} c1 gamma sRGB
 * @param {number[]} c2 gamma sRGB
 * @param {number} t 0..1
 * @returns {number[]} gamma sRGB
 */
export function mixOklab(c1, c2, t) {
  const a = srgbToOklab(c1), b = srgbToOklab(c2);
  return oklabToSrgb([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

/** Naïve sRGB lerp — provided ONLY so demos can show how muddy it looks. */
export function mixSrgb(c1, c2, t) {
  return [0, 1, 2].map((i) => c1[i] + (c2[i] - c1[i]) * t);
}
