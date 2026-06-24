// =============================================================================
// color_systems.glsl  —  OKLab <-> sRGB color conversion (shared primitive)
// =============================================================================
//
// This is the GLSL face of the ecosystem-shared `color_systems` library.
// In the full Color Lab batch this would be pulled from the shared repo; it is
// vendored here (via the #include preprocessor in shader-loader.js) so that
// mesh_gradients runs standalone. THIS is the single source of truth for color
// math in the shaders — do NOT reimplement OKLab anywhere else.
//
// The whole point of this repo: interpolate in OKLab, never in sRGB. RGB lerp
// passes through grey; OKLab lerp keeps the midpoint vivid.
//
// Reference: Björn Ottosson, "A perceptual color space for image processing"
//            https://bottosson.github.io/posts/oklab/
// =============================================================================

// --- gamma / transfer functions ---------------------------------------------

float srgb_to_linear(float c) {
    return (c <= 0.04045) ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}

vec3 srgb_to_linear(vec3 c) {
    return vec3(srgb_to_linear(c.r), srgb_to_linear(c.g), srgb_to_linear(c.b));
}

float linear_to_srgb(float c) {
    return (c <= 0.0031308) ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

vec3 linear_to_srgb(vec3 c) {
    return vec3(linear_to_srgb(c.r), linear_to_srgb(c.g), linear_to_srgb(c.b));
}

// --- linear sRGB <-> OKLab ---------------------------------------------------

vec3 linear_srgb_to_oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

    float l_ = pow(l, 1.0 / 3.0);
    float m_ = pow(m, 1.0 / 3.0);
    float s_ = pow(s, 1.0 / 3.0);

    return vec3(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

vec3 oklab_to_linear_srgb(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// --- convenience: sRGB (gamma) <-> OKLab ------------------------------------
// These are what the blend shaders call. Pass in gamma-encoded sRGB (the same
// space your #RRGGBB hex literals live in) and get OKLab back, and vice-versa.

vec3 srgb_to_oklab(vec3 srgb) {
    return linear_srgb_to_oklab(srgb_to_linear(srgb));
}

vec3 oklab_to_srgb(vec3 lab) {
    return linear_to_srgb(clamp(oklab_to_linear_srgb(lab), 0.0, 1.0));
}

// --- OKLCh (polar OKLab) -----------------------------------------------------
// Handy for hue-cycling regimes (holo_foil). C = chroma, h = hue in radians.

vec3 oklab_to_oklch(vec3 lab) {
    return vec3(lab.x, length(lab.yz), atan(lab.z, lab.y));
}

vec3 oklch_to_oklab(vec3 lch) {
    return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}
