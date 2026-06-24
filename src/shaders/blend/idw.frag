#version 300 es
// =============================================================================
// idw.frag  —  Inverse-Distance Weighting (Shepard) blend
// =============================================================================
// The "blob" look. N color points, weight ∝ 1/dᵖ. Higher power = sharper
// transitions / more defined blobs. All accumulation happens in OKLab so the
// blend never passes through grey. This is the easiest engine — start here.
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"
#include "common/noise.glsl"

#define MAX_POINTS 12

uniform vec2  u_points[MAX_POINTS];  // [0,1] positions, y-up
uniform vec3  u_colors[MAX_POINTS];  // sRGB (gamma) colors
uniform int   u_numPoints;
uniform float u_power;               // ∈ [1,4]
uniform float u_warp;                // domain-warp strength
uniform float u_time;
uniform vec2  u_resolution;

in  vec2 v_uv;
out vec4 fragColor;

void main() {
    // aspect-correct so distances are circular, not stretched
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = warpUV(v_uv, u_time, u_warp);

    vec3  labSum    = vec3(0.0);
    float weightSum = 0.0;

    for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= u_numPoints) break;
        vec2 d2 = (uv - u_points[i]) * vec2(aspect, 1.0);
        float d = length(d2);
        if (d < 0.0001) {            // sitting on a point → take its color exactly
            fragColor = vec4(u_colors[i], 1.0);
            return;
        }
        float w = 1.0 / pow(d, u_power);
        labSum    += w * srgb_to_oklab(u_colors[i]);
        weightSum += w;
    }

    // guard u_numPoints == 0 (init/transition): 0/0 → NaN → black/white screen
    vec3 lab = labSum / max(weightSum, 1e-5);
    fragColor = vec4(oklab_to_srgb(lab), 1.0);
}
