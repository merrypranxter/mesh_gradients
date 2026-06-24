# Blend Math

The deep-dive companion to `math-reference.md`. Everything here is implemented
in `src/shaders/blend/*.frag`, accumulating in **OKLab** and converting back to
sRGB exactly once, at the end. The one law: never average colors in sRGB.

## Why OKLab (not RGB, not HSL)

sRGB is gamma-encoded *and* perceptually non-uniform. The straight average of
two saturated complementary colors lands near the achromatic axis → grey.

```
mix(#FF0066, #00E0FF, 0.5)  in sRGB   → #7F70B2   (desaturated, muddy)
mix(#FF0066, #00E0FF, 0.5)  in OKLab  → #B96EC8   (stays vivid)
```

OKLab is a perceptual space where the L axis is lightness and (a, b) are
opponent chroma. Linear interpolation there tracks how we *see* a blend, so the
midpoint keeps its chroma. HSL "fixes" hue but distorts lightness; OKLab is the
right tool. See `examples/01-oklab-vs-rgb.html` for a side-by-side.

## Engines

| engine          | weight function                  | character              | key param           |
|-----------------|----------------------------------|------------------------|---------------------|
| `idw`           | wᵢ = 1 / dᵢᵖ                     | blobs, lava-lamp       | `power` ∈ [1,4]     |
| `rbf`           | wᵢ = exp(−(dᵢ/r)²)               | smoothest, liquid      | `radius` ∈ [.15,.6] |
| `gouraud`       | barycentric over 3 nearest       | faceted, stained-glass | —                   |
| `voronoi_soft`  | softmin: exp(−(dᵢ − dₘᵢₙ)/k)     | melting color cells    | `softness` ∈ [0,.25]|
| `coons`         | bicubic (eased bilinear) corners | 4-corner SVG patch     | —                   |

All N-point engines (`idw`, `rbf`, `gouraud`, `voronoi_soft`) share the
normalize-by-sum form:

```
C(p) = Σ wᵢ · OKLab(Cᵢ)  /  Σ wᵢ        then OKLab → sRGB
```

### IDW (Shepard)
`power` controls falloff sharpness. p→1 is gauzy and soft; p→4 gives crisp,
defined blobs. There's a singularity at each point (d→0 ⇒ w→∞); the shader
short-circuits to the exact color within ε to avoid NaNs.

### RBF (Gaussian)
No singularity, so it's the only engine that stays smooth when two points
overlap. `radius` is the Gaussian σ in aspect-corrected UV units. Far from all
points the weight sum underflows — the shader floors it at 1e-5.

### Gouraud / barycentric
The "Delaunay/Voronoi mesh + barycentric interpolation" of the repo tagline,
done per-fragment: pick the 3 nearest points and inverse-distance blend. A full
Delaunay triangulation would give exact triangle barycentrics; the 3-nearest
approximation is good enough for ≤12 points and needs no CPU triangulator.

### Voronoi (soft)
Hard Voronoi assigns each fragment its nearest point's color (flat cells). The
softmin lets neighbors within ~`softness` of a cell border leak in, so seams
melt. **FLAG:** real cell relaxation/jitter belongs in the unbuilt
`voronoi_systems` repo — this is a standalone approximation until then.

### Coons patch
With only corner colors a Coons patch reduces algebraically to bilinear, so we
ease u and v through a cubic Hermite (`smoothstep`) to recover the soft S-curved
edges of a real SVG `<meshgradient>`. Corners are control points 0–3, CCW from
bottom-left. Export path: `examples/05-svg-meshgradient.js`.

## Domain warp

Before any engine samples the field, `common/noise.glsl::warpUV` offsets the UV
by two decorrelated simplex lookups scaled by `u_warp`. This is what turns a
static field into the liquid wobble. Warp is a *coordinate* distortion, not a
color one — it never touches the OKLab math, so colors stay correct.

## Aspect correction

Distances are measured in `uv * vec2(aspect, 1.0)` so blobs stay circular on
wide viewports instead of stretching into ellipses.
