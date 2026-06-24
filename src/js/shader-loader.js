// =============================================================================
// shader-loader.js  —  fetch GLSL + resolve `#include "..."` directives
// =============================================================================
// WebGL has no native include, so we do a tiny recursive preprocessor. Includes
// are resolved relative to src/shaders/ and de-duplicated (so color_systems.glsl
// pulled in by two shaders is only inlined once). Requires the page to be served
// over http(s) — fetch can't read file:// in most browsers. See README.
// =============================================================================

const SHADER_ROOT = new URL('../shaders/', import.meta.url);
const cache = new Map();

async function fetchText(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(new URL(path, SHADER_ROOT));
  if (!res.ok) throw new Error(`shader fetch failed: ${path} (${res.status})`);
  const text = await res.text();
  cache.set(path, text);
  return text;
}

const INCLUDE_RE = /^\s*#include\s+"([^"]+)"\s*$/;

async function resolveIncludes(src, seen) {
  const out = [];
  for (const line of src.split('\n')) {
    const m = line.match(INCLUDE_RE);
    if (!m) { out.push(line); continue; }
    const inc = m[1];
    if (seen.has(inc)) { out.push(`// (already included: ${inc})`); continue; }
    seen.add(inc);
    const incSrc = await fetchText(inc);
    out.push(`// ---- begin ${inc} ----`);
    out.push(await resolveIncludes(incSrc, seen));
    out.push(`// ---- end ${inc} ----`);
  }
  return out.join('\n');
}

/**
 * Load a shader file and inline its includes.
 * The `#version` line (if present) is hoisted to the very top, since GLSL ES
 * requires it before any other token.
 * @param {string} path e.g. "blend/idw.frag"
 * @returns {Promise<string>}
 */
export async function loadShader(path) {
  const raw = await fetchText(path);
  const resolved = await resolveIncludes(raw, new Set());

  const lines = resolved.split('\n');
  const vIdx = lines.findIndex((l) => l.trim().startsWith('#version'));
  if (vIdx > 0) {
    const [version] = lines.splice(vIdx, 1);
    lines.unshift(version);
  }
  return lines.join('\n');
}
