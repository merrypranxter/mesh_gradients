#version 300 es
// =============================================================================
// rbf.frag  —  Gaussian Radial Basis Function blend
// =============================================================================
// Smoothest of all the engines. weight_i = exp(-(d/r)²). Larger radius = softer,
// more liquid. Unlike IDW there is no singularity at the control points, so it
// stays smooth even when you drag two points on top of each other.
// =============================================================================
precision highp float;

#include "common/color_systems.glsl"
#include "common/noise.glsl"

#define MAX_POINTS 12

uniform vec2  u_points[MAX_POINTS];
uniform vec3  u_colors[MAX_POINTS];
uniform int   u_numPoints;
uniform float u_radius;   // Gaussian falloff radius, ~[0.15, 0.6]
uniform float u_warp;
uniform float u_time;
uniform vec2  u_resolution;

in  vec2 v_uv;
out vec4 fragColor;

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = warpUV(v_uv, u_time, u_warp);

    vec3  labSum    = vec3(0.0);
    float weightSum = 0.0;

    for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= u_numPoints) break;
        vec2 d2 = (uv - u_points[i]) * vec2(aspect, 1.0);
        float d = length(d2) / max(u_radius, 0.0001);
        float w = exp(-d * d);
        labSum    += w * srgb_to_oklab(u_colors[i]);
        weightSum += w;
    }

    // weightSum can underflow far from every point; floor it so we don't divide
    // by zero. In that far-field regime labSum is ~0 too, so the result trends
    // to black — keep the radius large enough that the field always reaches.
    vec3 lab = labSum / max(weightSum, 1e-5);
    fragColor = vec4(oklab_to_srgb(lab), 1.0);
}
