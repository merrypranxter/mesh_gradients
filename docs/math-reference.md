# Math Reference

## Coons Patch (Bicubic)
```
P(u,v) = bilinear_corner_blend + edge_correction_terms
```
4 corners, cubic edges, bilinear interior. Interpolate colors in OKLab.

## IDW (Shepard)
```
weight_i = 1 / d_i^p
C = Σ(w_i * C_i) / Σ(w_i)
```
p ∈ [1,4]. Higher = sharper transitions.

## RBF (Gaussian)
```
weight_i = exp(-(d_i/r)²)
C = Σ(w_i * C_i) / Σ(w_i)
```
Smoothest blend. Almost liquid.

## OKLab Interpolation (CRITICAL)
```
Lab = mix(Lab1, Lab2, t)  // NOT RGB mix
```
RGB mix → grey midpoint. OKLab mix → vivid midpoint.
