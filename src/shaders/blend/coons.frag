#version 300 es
// =============================================================================
// coons.frag  —  Bicubic Coons patch (the SVG meshgradient primitive)
// =============================================================================
// A surface from 4 corner colors. With only corner data a Coons patch collapses
// to a bilinear blend, so — exactly like an SVG <meshgradient> — we ease the
// parameters with a cubic (smoothstep) Hermite basis to get the soft, S-curved
// edges that read as "bicubic". Corners are taken from the first 4 control
// points (CCW from bottom-left). Interpolation is in OKLab.
//
//   c01 ---- c11        v
//    |        |         ^
//    |        |         |
//   c00 ---- c10        +---> u
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"
#include "common/noise.glsl"

#define MAX_POINTS 12

uniform vec3  u_colors[MAX_POINTS];  // uses [0..3]
uniform int   u_numPoints;
uniform float u_warp;
uniform float u_time;

in  vec2 v_uv;
out vec4 fragColor;

// cubic Hermite ease — the "bi-CUBIC" in bicubic
float ease(float t) { return t * t * (3.0 - 2.0 * t); }

void main() {
    vec2 uv = clamp(warpUV(v_uv, u_time, u_warp), 0.0, 1.0);
    float u = ease(uv.x);
    float v = ease(uv.y);

    // corner colors → OKLab. clamp the index ≥ 0 so u_numPoints == 0 can't
    // index u_colors[-1] (out of bounds).
    int maxIdx = max(0, u_numPoints - 1);
    vec3 c00 = srgb_to_oklab(u_colors[0]);
    vec3 c10 = srgb_to_oklab(u_colors[min(maxIdx, 1)]);
    vec3 c01 = srgb_to_oklab(u_colors[min(maxIdx, 2)]);
    vec3 c11 = srgb_to_oklab(u_colors[min(maxIdx, 3)]);

    // bilinear blend of eased params == Coons patch for corner-only data
    vec3 bottom = mix(c00, c10, u);
    vec3 top    = mix(c01, c11, u);
    vec3 lab    = mix(bottom, top, v);

    fragColor = vec4(oklab_to_srgb(lab), 1.0);
}
