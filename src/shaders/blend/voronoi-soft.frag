#version 300 es
// =============================================================================
// voronoi-soft.frag  —  Voronoi color regions with softened edges
// =============================================================================
// Hard Voronoi = each fragment takes the color of its nearest point (flat
// cells, crisp borders). We soften it with a softmin over OKLab so the cell
// borders bleed into each other — color regions that still read as distinct but
// melt at the seams.
//
// FLAG: a proper implementation would consume the unbuilt `voronoi_systems`
// repo for jitter/relaxation. Until that exists this is a self-contained
// softmin approximation. See README "Flags".
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"
#include "common/noise.glsl"

#define MAX_POINTS 12

uniform vec2  u_points[MAX_POINTS];
uniform vec3  u_colors[MAX_POINTS];
uniform int   u_numPoints;
uniform float u_softness;  // edge bleed, ~[0.01, 0.25]; 0 → hard cells
uniform float u_warp;
uniform float u_time;
uniform vec2  u_resolution;

in  vec2 v_uv;
out vec4 fragColor;

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = warpUV(v_uv, u_time, u_warp);
    float k = max(u_softness, 0.0001);

    // softmin weighting: exp(-d/k) heavily favors the nearest cell but lets
    // neighbors leak in within ~k of the border.
    float minD = 1e9;
    for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= u_numPoints) break;
        vec2 dv = (uv - u_points[i]) * vec2(aspect, 1.0);
        minD = min(minD, length(dv));
    }

    vec3  labSum = vec3(0.0);
    float wSum   = 0.0;
    for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= u_numPoints) break;
        vec2 dv = (uv - u_points[i]) * vec2(aspect, 1.0);
        float d = length(dv);
        float w = exp(-(d - minD) / k);
        labSum += w * srgb_to_oklab(u_colors[i]);
        wSum   += w;
    }

    fragColor = vec4(oklab_to_srgb(labSum / wSum), 1.0);
}
