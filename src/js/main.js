// =============================================================================
// main.js  —  orchestrator: load shaders, run the render loop, wire input
// =============================================================================
// Pass order (per repo_seed.txt):
//   1. control points (position + sRGB color), draggable
//   2. interpolate the field in OKLab via the chosen engine  → scene FBO
//   3. domain-warp the UVs (inside the engine shader)
//   4. animate control points (drift + drag)
//   5. post finisher (blur / holo / vignette / grain)         → screen
// =============================================================================

import { loadShader } from './shader-loader.js';
import {
  createProgram, createFullscreenQuad, createRenderTarget, makeUniformSetter,
} from './gl-utils.js';
import { ControlPoints } from './control-points.js';
import { DomainWarp } from './domain-warp.js';

const ENGINES = {
  idw:          'blend/idw.frag',
  rbf:          'blend/rbf.frag',
  coons:        'blend/coons.frag',
  gouraud:      'blend/gouraud.frag',
  voronoi_soft: 'blend/voronoi-soft.frag',
};

const canvas = document.getElementById('gl');
const overlay = document.getElementById('overlay');
const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
if (!gl) throw new Error('WebGL2 not available in this browser.');

const quad = createFullscreenQuad(gl);
const warp = new DomainWarp();
const points = new ControlPoints(canvas);

let programs = {};       // engine name → WebGL program
let setters = {};        // engine name → cached uniform setter
let displayProgram = null;
let displaySetter = null;
let displaySceneLoc = null;
let sceneRT = null;
let presets = null;
let current = null;      // active preset object
let startTime = performance.now();
let lastTime = startTime;

async function init() {
  // compile every engine + the display pass
  const vert = await loadShader('fullscreen.vert');
  for (const [name, path] of Object.entries(ENGINES)) {
    programs[name] = createProgram(gl, vert, await loadShader(path));
    setters[name] = makeUniformSetter(gl, programs[name]); // cache per program
  }
  displayProgram = createProgram(gl, vert, await loadShader('display.frag'));
  displaySetter = makeUniformSetter(gl, displayProgram);
  displaySceneLoc = gl.getUniformLocation(displayProgram, 'u_scene');

  presets = await (await fetch(new URL('../data/presets.json', import.meta.url))).json();
  resize();
  window.addEventListener('resize', resize);

  applyPreset(presets.keymap['1']);
  wireInput();
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  if (sceneRT) { gl.deleteTexture(sceneRT.tex); gl.deleteFramebuffer(sceneRT.fbo); }
  sceneRT = createRenderTarget(gl, canvas.width, canvas.height);
}

function applyPreset(key) {
  const p = presets.presets[key];
  if (!p) return;
  current = { key, ...p };
  points.load(p.colors, p.layout);
  points.driftSpeed = p.drift ?? 0.5;
  warp.set(p.warp ?? 0.2);
  if (overlay) {
    overlay.textContent =
      `mesh_gradients | ${p.label} · ${p.engine} · ${p.colors.length}pts | ` +
      `1:stripe 2:blob 3:aurora 4:holo 5:acid 6:voronoi 7:coons | drag:points scroll:warp`;
  }
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const t = (now - startTime) / 1000;

  points.update(dt);
  const warpVal = warp.update(dt);

  // ---- pass 2/3/4: render the field into the scene FBO ----
  const prog = programs[current.engine];
  gl.useProgram(prog);
  const u = setters[current.engine];   // cached at init, not per-frame
  u.v2a('u_points', points.positionsArray());
  u.v3a('u_colors', points.colorsArray());
  u.i('u_numPoints', points.count);
  u.f('u_warp', warpVal);
  u.f('u_time', t);
  u.v2('u_resolution', canvas.width, canvas.height);
  // engine-specific params (harmless if the shader doesn't declare them)
  const pr = current.params || {};
  u.f('u_power', pr.power ?? 2.0);
  u.f('u_radius', pr.radius ?? 0.3);
  u.f('u_softness', pr.softness ?? 0.06);

  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneRT.fbo);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.bindVertexArray(quad);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // ---- pass 5: post finisher to the screen ----
  gl.useProgram(displayProgram);
  const d = displaySetter;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneRT.tex);
  gl.uniform1i(displaySceneLoc, 0);
  d.v2('u_resolution', canvas.width, canvas.height);
  d.f('u_time', t);
  const post = current.post || {};
  d.f('u_blur', post.blur ?? 0.4);
  d.f('u_holo', post.holo ?? 0.0);
  d.f('u_vignette', post.vignette ?? 0.2);
  d.f('u_grain', post.grain ?? 0.25);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  requestAnimationFrame(frame);
}

function wireInput() {
  window.addEventListener('keydown', (e) => {
    const key = presets.keymap[e.key];
    if (key) applyPreset(key);
  });
  window.addEventListener('wheel', (e) => {
    warp.nudge(-Math.sign(e.deltaY) * 0.05);
  }, { passive: true });
}

init().catch((err) => {
  console.error(err);
  if (overlay) overlay.textContent = `error: ${err.message} (serve over http — see README)`;
});
