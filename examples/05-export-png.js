// =============================================================================
// example 05 — grab the live render as a PNG (and a still-frame baker)
// =============================================================================
// Two recipes:
//   A. saveCanvasPng(canvas)      — snapshot whatever main.js is rendering now.
//   B. renderStill({...})         — render ONE high-res frame offscreen, no app,
//                                    no animation. Good for wallpapers/posters.
// Both run in the browser. Drop a button into index.html and call saveCanvasPng,
// or open the console on the live page and paste it in.
// =============================================================================

import { loadShader } from '../src/js/shader-loader.js';
import { createProgram, createFullscreenQuad, makeUniformSetter } from '../src/js/gl-utils.js';
import { ControlPoints } from '../src/js/control-points.js';

/** A. Download the current contents of a canvas. preserveDrawingBuffer must
 *  be true on the context, OR call this synchronously inside the render loop. */
export function saveCanvasPng(canvas, filename = 'mesh_gradient.png') {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

/** B. Render a single static frame at arbitrary resolution and return a data URL.
 *  @param {object} opts { engine='rbf', colors, width=2048, height=2048,
 *                         power=2, radius=0.32, warp=0.25, time=8 } */
export async function renderStill(opts = {}) {
  const {
    engine = 'rbf',
    colors = ['#FF6B9D', '#C66BFF', '#6B9DFF', '#6BFFB8', '#FFD66B', '#FF8C6B'],
    layout = 'ring',
    width = 2048, height = 2048,
    power = 2, radius = 0.32, softness = 0.06, warp = 0.25, time = 8,
  } = opts;

  const ENGINE_PATH = {
    idw: 'blend/idw.frag', rbf: 'blend/rbf.frag', coons: 'blend/coons.frag',
    gouraud: 'blend/gouraud.frag', voronoi_soft: 'blend/voronoi-soft.frag',
  };

  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  const prog = createProgram(gl, await loadShader('fullscreen.vert'), await loadShader(ENGINE_PATH[engine]));
  const quad = createFullscreenQuad(gl);

  const pts = new ControlPoints(canvas);
  pts.load(colors, layout);
  for (let i = 0; i < 200; i++) pts.update(time / 200); // settle the drift

  gl.useProgram(prog);
  const u = makeUniformSetter(gl, prog);
  u.v2a('u_points', pts.positionsArray());
  u.v3a('u_colors', pts.colorsArray());
  u.i('u_numPoints', pts.count);
  u.f('u_power', power); u.f('u_radius', radius); u.f('u_softness', softness);
  u.f('u_warp', warp); u.f('u_time', time);
  u.v2('u_resolution', width, height);

  gl.viewport(0, 0, width, height);
  gl.bindVertexArray(quad);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const dataUrl = canvas.toDataURL('image/png');

  // release GPU resources + the context itself. Browsers cap live WebGL
  // contexts at ~8–16; without this the gallery (one renderStill per preset)
  // exhausts the limit and later renders fail with context-lost.
  gl.deleteProgram(prog);
  gl.deleteVertexArray(quad);
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  return dataUrl;
}
