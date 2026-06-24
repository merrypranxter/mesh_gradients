#version 300 es
// =============================================================================
// display.frag  —  house post-finisher
// =============================================================================
// Second pass. Samples the rendered field (u_scene) and applies, in order:
//   1. soft 9-tap blur          (u_blur)      — melts banding, that liquid sheen
//   2. holo iridescence hook    (u_holo)      — OKLCh hue rotation that drifts
//                                               across the frame; the seam where
//                                               `thin_film_iridescence` plugs in
//   3. vignette                 (u_vignette)  — pull the corners down
//   4. film grain               (u_grain)     — break up 8-bit banding
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"

uniform sampler2D u_scene;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_blur;       // 0..1
uniform float u_holo;       // 0..1 iridescence amount
uniform float u_vignette;   // 0..1
uniform float u_grain;      // 0..1

in  vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 texel = 1.0 / u_resolution;

    // --- 1. separable-ish 9-tap blur ---
    vec3 col = vec3(0.0);
    float r = u_blur * 2.5;
    float wsum = 0.0;
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            float w = (x == 0 && y == 0) ? 4.0 : ((x == 0 || y == 0) ? 2.0 : 1.0);
            col += w * texture(u_scene, v_uv + vec2(float(x), float(y)) * texel * r).rgb;
            wsum += w;
        }
    }
    col /= wsum;

    // --- 2. holo iridescence: rotate hue in OKLCh by a drifting field ---
    if (u_holo > 0.001) {
        vec3 lch = oklab_to_oklch(srgb_to_oklab(col));
        float shift = (v_uv.x * 4.0 + v_uv.y * 2.0 + u_time * 0.6);
        lch.z += u_holo * 1.2 * sin(shift);
        lch.y *= 1.0 + u_holo * 0.25 * cos(shift * 1.3);   // pump chroma too
        col = oklab_to_srgb(oklch_to_oklab(lch));
    }

    // --- 3. vignette ---
    vec2 d = v_uv - 0.5;
    float vig = 1.0 - u_vignette * dot(d, d) * 1.8;
    col *= clamp(vig, 0.0, 1.0);

    // --- 4. grain ---
    float g = (hash(v_uv * u_resolution + u_time) - 0.5) * u_grain * 0.08;
    col += g;

    fragColor = vec4(col, 1.0);
}
