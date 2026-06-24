# Examples

Standalone snippets that each isolate one idea. Everything except `02` imports
from `../src/js/`, so **serve the repo over http** to run them
(`python3 -m http.server 8080`, then open `/examples/...`). `02` is fully inline
and runs from `file://`.

| file | what it shows | run |
|------|---------------|-----|
| `01-oklab-vs-rgb.html`   | the core thesis: sRGB lerp goes muddy, OKLab stays vivid (side-by-side bars) | open in browser |
| `02-idw-minimal.html`    | the entire OKLab IDW field in ~60 inline lines — the "hello world", no server | open in browser |
| `03-css-gradient-export.js` | bake an OKLab-correct CSS `linear-`/`conic-gradient` string for use anywhere | `node examples/03-css-gradient-export.js` |
| `04-svg-meshgradient.js` | export a Coons patch as a subdivided SVG `<meshgradient>` (OKLab-sampled corners) | `node examples/04-svg-meshgradient.js > mesh.svg` |
| `05-export-png.js`       | `saveCanvasPng()` for the live app + `renderStill()` to bake a hi-res poster | import / console |
| `06-gallery.html`        | every preset baked to a still thumbnail — a one-glance visual audit | open in browser |

## Quick starts

```bash
# CSS string for a Stripe-style hero background
node examples/03-css-gradient-export.js

# a 6×6 OKLab-correct SVG mesh you can drop in Figma/Illustrator
node examples/04-svg-meshgradient.js > mesh.svg
```

```js
// in the browser console on the live page (index.html):
import('./examples/05-export-png.js').then(m => m.saveCanvasPng(document.getElementById('gl')));
```
