// =============================================================================
// control-points.js  —  draggable color control points + slow drift
// =============================================================================
// Owns the list of {x, y, color} points. Positions are normalized [0,1] with
// y-up (origin bottom-left) to match the shader UV convention. Handles:
//   • mouse/touch raycast drag (grab nearest within GRAB_RADIUS)
//   • slow random-walk drift when not held (the "living" motion)
//   • packing into flat Float32Arrays for u_points / u_colors uniforms
// =============================================================================

import { hexToRgb } from './color-systems.js';

const GRAB_RADIUS = 0.06;   // normalized units
const MAX_POINTS = 12;      // must match #define MAX_POINTS in the shaders

export class ControlPoints {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.points = [];       // { x, y, color:[r,g,b], vx, vy }
    this.dragging = null;
    this.driftSpeed = 1.0;

    const down = (e) => this._onDown(this._norm(e));
    const move = (e) => this._onMove(this._norm(e));
    const up = () => { this.dragging = null; };

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); down(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e.touches[0]); }, { passive: false });
    window.addEventListener('touchend', up);
  }

  /** Add a point. color may be a "#hex" string or [r,g,b] array. */
  add(x, y, color) {
    if (this.points.length >= MAX_POINTS) return;
    const rgb = typeof color === 'string' ? hexToRgb(color) : color;
    this.points.push({ x, y, color: rgb, vx: 0, vy: 0 });
  }

  clear() { this.points = []; this.dragging = null; }

  get count() { return this.points.length; }

  /** Replace all points from a preset: { colors:[...], layout?:'grid'|'ring' }. */
  load(colors, layout = 'ring') {
    this.clear();
    const n = colors.length;
    colors.forEach((c, i) => {
      let x, y;
      if (layout === 'grid') {
        const cols = Math.ceil(Math.sqrt(n));
        x = ((i % cols) + 0.5) / cols;
        y = (Math.floor(i / cols) + 0.5) / Math.ceil(n / cols);
      } else if (layout === 'vertical') {
        x = 0.5; y = (i + 0.5) / n;
      } else { // ring
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        x = 0.5 + Math.cos(a) * 0.32;
        y = 0.5 + Math.sin(a) * 0.32;
      }
      this.add(x, y, c);
    });
  }

  /** Advance drift. dt in seconds. */
  update(dt) {
    for (let i = 0; i < this.points.length; i++) {
      if (i === this.dragging) continue;
      const p = this.points[i];
      p.vx += (Math.random() - 0.5) * 0.02 * this.driftSpeed;
      p.vy += (Math.random() - 0.5) * 0.02 * this.driftSpeed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // soft-bounce off the edges instead of clamping dead
      if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.max(0, Math.min(1, p.x)); }
      if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.max(0, Math.min(1, p.y)); }
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
  }

  /** Float32Array of [x0,y0, x1,y1, ...] for u_points. */
  positionsArray() {
    const a = new Float32Array(MAX_POINTS * 2);
    this.points.forEach((p, i) => { a[i * 2] = p.x; a[i * 2 + 1] = p.y; });
    return a;
  }

  /** Float32Array of [r0,g0,b0, ...] for u_colors. */
  colorsArray() {
    const a = new Float32Array(MAX_POINTS * 3);
    this.points.forEach((p, i) => { a.set(p.color, i * 3); });
    return a;
  }

  // --- input plumbing --------------------------------------------------------
  _norm(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: 1 - (e.clientY - r.top) / r.height, // flip to y-up
    };
  }

  _onDown({ x, y }) {
    let best = null, bestD = GRAB_RADIUS;
    this.points.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    this.dragging = best;
  }

  _onMove({ x, y }) {
    if (this.dragging === null) return;
    const p = this.points[this.dragging];
    p.x = Math.max(0, Math.min(1, x));
    p.y = Math.max(0, Math.min(1, y));
    p.vx = 0; p.vy = 0;
  }
}

export { MAX_POINTS };
