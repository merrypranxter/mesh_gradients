// =============================================================================
// domain-warp.js  —  JS-side warp state (the shader does the actual noise)
// =============================================================================
// The heavy lifting (simplex noise) lives in common/noise.glsl. This module is
// just the tunable controller for the u_warp uniform: a target strength plus
// smoothing so scroll-wheel changes ease in instead of snapping.
// =============================================================================

export class DomainWarp {
  constructor(strength = 0.2) {
    this.target = strength;   // where we want to be (0..1)
    this.value = strength;    // smoothed current value sent to the shader
    this.min = 0;
    this.max = 1;
  }

  /** Nudge the target, e.g. from a scroll-wheel delta. */
  nudge(delta) {
    this.target = clamp(this.target + delta, this.min, this.max);
  }

  set(strength) { this.target = clamp(strength, this.min, this.max); }

  /** Ease toward target. Call once per frame. */
  update(dt) {
    this.value += (this.target - this.value) * Math.min(1, dt * 6);
    return this.value;
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
