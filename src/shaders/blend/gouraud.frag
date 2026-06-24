#version 300 es
// =============================================================================
// gouraud.frag  —  per-point colored triangle mesh, barycentric blend
// =============================================================================
// Classic Gouraud shading done in screen space: for each fragment, find the
// nearest 3 control points, compute barycentric weights from them, and blend
// their colors in OKLab. This is the "Delaunay/Voronoi mesh + barycentric
// interpolation" engine named in the repo description — a faceted, stained-glass
// cousin of the smooth IDW/RBF fields.
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"
#include "common/noise.glsl"

#define MAX_POINTS 12

uniform vec2  u_points[MAX_POINTS];
uniform vec3  u_colors[MAX_POINTS];
uniform int   u_numPoints;
uniform float u_warp;
uniform float u_time;
uniform vec2  u_resolution;

in  vec2 v_uv;
out vec4 fragColor;

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = warpUV(v_uv, u_time, u_warp);

    // find the three nearest control points
    int   i0 = -1, i1 = -1, i2 = -1;
    float d0 = 1e9, d1 = 1e9, d2 = 1e9;
    for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= u_numPoints) break;
        vec2 dv = (uv - u_points[i]) * vec2(aspect, 1.0);
        float d = dot(dv, dv);
        if (d < d0)      { d2 = d1; i2 = i1; d1 = d0; i1 = i0; d0 = d; i0 = i; }
        else if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; }
        else if (d < d2) { d2 = d; i2 = i; }
    }

    // barycentric-ish weights: inverse distance, normalized over the 3 nearest.
    // accumulate only valid indices — with <3 points i1/i2 stay -1, and reading
    // u_colors[-1] is UB / a crash on many GPUs.
    vec3  labSum = vec3(0.0);
    float ws = 0.0;
    if (i0 >= 0) { float w = 1.0 / (sqrt(d0) + 1e-4); labSum += w * srgb_to_oklab(u_colors[i0]); ws += w; }
    if (i1 >= 0) { float w = 1.0 / (sqrt(d1) + 1e-4); labSum += w * srgb_to_oklab(u_colors[i1]); ws += w; }
    if (i2 >= 0) { float w = 1.0 / (sqrt(d2) + 1e-4); labSum += w * srgb_to_oklab(u_colors[i2]); ws += w; }

    vec3 lab = (ws > 0.0) ? (labSum / ws) : vec3(0.0);
    fragColor = vec4(oklab_to_srgb(lab), 1.0);
}
