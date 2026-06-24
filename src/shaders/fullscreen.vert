#version 300 es
// Fullscreen triangle. Position comes in as clip-space [-1,1]; we hand the
// fragment stage a [0,1] UV with origin at bottom-left (matches control points,
// which are stored y-up).
layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
