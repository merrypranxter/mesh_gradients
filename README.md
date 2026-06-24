# mesh_gradients

> gradients with more than two ends. drag the color around like it's wet.

## what it does

Freeform multi-point gradients — Coons patches / gradient mesh — the warpable Stripe/Apple "liquid blob" aesthetic. Smooth impossible multi-color blends you can drag. Interpolate in OKLab (`color_systems`) so midpoints don't go muddy-grey.

## engines

- `coons.glsl` — bicubic Coons patch, 4-corner colors (the SVG meshgradient primitive).
- `gouraud.glsl` — per-vertex colored triangle mesh.
- `idw.glsl` — inverse-distance / Shepard weighting from N color points → the blob look.
- `rbf.glsl` — Gaussian RBF blend, smoothest.
- `voronoi_soft.glsl` — Voronoi color regions, softened edges. Flags unbuilt `voronoi_systems`.
- domain-warp module: add Perlin/Simplex to UV before sampling → the liquid wobble.

## pipeline

1. define control points (position + color), draggable.
2. interpolate the field via chosen engine — in OKLab (convert corner colors → OKLab → interpolate → back to sRGB via `color_systems`).
3. domain-warp the UVs (noise) for the wobble.
4. animate control points (slow drift + mouse-drag raycast).
5. soft blur, house post.

## aesthetic regimes

- `stripe_mesh` — 6 pts, pastel, slow drift.
- `liquid_blob` — IDW, 4 pts, heavy domain warp. lava-lamp.
- `aurora` — vertical bands, OKLab, vertical drift.
- `holo_foil` — hue-cycling + iridescence hook (`thin_film_iridescence`).
- `acid_mesh` — maximalist neon, fast warp. on-brand.

## parameters

```
engine: coons | gouraud | idw | rbf | voronoi_soft
points: 2–12 control points
warp: 0.0–1.0 (domain warp strength)
drift: 0.0–1.0 (point drift speed)
mode: stripe_mesh | liquid_blob | aurora | holo_foil | acid_mesh
```

## gotchas

- **RGB lerp goes muddy through grey — interpolate in OKLab/OKLCH** (the single most important rule here, via `color_systems`).
- bicubic Coons math is fiddly — give Copilot the patch formula.
- N-point IDW fine for small N.
- mouse-drag = raycast control points.
- seamless tiling optional.

## running

Shaders are loaded with `fetch` (so `#include` works), which browsers block on
`file://`. Serve the folder over http:

```bash
python3 -m http.server 8080      # or: npm start
# open http://localhost:8080
```

Keys `1`–`7` switch regimes, drag to move points, scroll to push the warp.
Standalone snippets live in `examples/` (`examples/02-idw-minimal.html` runs
straight from `file://`).

## structure

```
src/
  js/   color-systems.js · gl-utils.js · shader-loader.js
        control-points.js · domain-warp.js · main.js
  shaders/
    common/  color_systems.glsl · noise.glsl
    blend/   idw · rbf · coons · gouraud · voronoi-soft .frag
    fullscreen.vert · display.frag
  data/   presets.json (+ schema)
examples/ 01–06  · docs/ math-reference · blend-math · visual-targets
```

`color_systems` is vendored under `src/shaders/common/` and `src/js/` (clearly
marked) so the repo runs standalone; in the full batch it comes from the shared
repo. It is the single source of truth for color math — don't reimplement OKLab.

## ecosystem

**Consumes:** `color_systems` (OKLab blends — critical)  
**Consumed by:** none  
**Adjacent:** `color_fields`, `liquid_light_show`, `thin_film_iridescence`  
**Flags:** `voronoi_systems` (unbuilt)  
**Lane:** 2 (color as math)
