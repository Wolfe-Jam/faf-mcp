#!/usr/bin/env node
/**
 * faf-mcp · style-sheet drift check
 *
 * Contract: docs/style-sheet.html is the canonical visual vROM.
 * Every surface carries a sentinel-wrapped copy of the :root token block.
 * This gate verifies the BRAND SIGNATURE (token name→value map, whitespace
 * & case normalized) is identical across surfaces — fast, non-visual.
 *
 * It checks the vocabulary (right tokens, right values, none missing, none
 * extra). It does NOT check which element uses which token — that needs
 * rendering, which is deliberately out of scope. Vocabulary integrity at
 * zero cost.
 *
 * Exit 1 on drift. Rogue off-palette hex outside the token block = warn only.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = 'docs/style-sheet.html';
const SURFACES = ['docs/index.html', 'api/index.ts'];

const OPEN = '/* === faf-mcp:stylesheet canonical';
const CLOSE = '/* === /faf-mcp:stylesheet canonical === */';

function extractBlock(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const i = text.indexOf(OPEN);
  const j = text.indexOf(CLOSE);
  if (i === -1 || j === -1 || j < i) {
    return null; // surface not wired
  }
  return text.slice(i, j + CLOSE.length);
}

// name -> normalized value (whitespace stripped, lowercased)
function signature(block) {
  const map = {};
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[2].replace(/\s+/g, '').toLowerCase();
  }
  return map;
}

function diff(srcSig, surfSig) {
  const out = [];
  const keys = new Set([...Object.keys(srcSig), ...Object.keys(surfSig)]);
  for (const k of [...keys].sort()) {
    if (!(k in surfSig)) out.push(`  - missing --${k} (source: ${srcSig[k]})`);
    else if (!(k in srcSig)) out.push(`  - extra   --${k} (surface: ${surfSig[k]})`);
    else if (srcSig[k] !== surfSig[k])
      out.push(`  - drift   --${k}: source ${srcSig[k]} ≠ surface ${surfSig[k]}`);
  }
  return out;
}

const srcBlock = extractBlock(SOURCE);
if (!srcBlock) {
  console.error(`✗ canonical block not found in source ${SOURCE}`);
  process.exit(1);
}
const srcSig = signature(srcBlock);
const palette = new Set(
  Object.values(srcSig)
    .join(' ')
    .match(/#[0-9a-f]{3,8}/g) || []
);

let failed = false;
for (const surface of SURFACES) {
  const block = extractBlock(surface);
  if (!block) {
    console.error(`✗ ${surface}: canonical block missing — surface not wired`);
    failed = true;
    continue;
  }
  const d = diff(srcSig, signature(block));
  if (d.length) {
    console.error(`✗ ${surface}: brand signature drift\n${d.join('\n')}`);
    failed = true;
  } else {
    console.log(`✓ ${surface}: brand signature matches canonical`);
  }

  // warn-only: off-palette hex outside the token block.
  // Only meaningful for single-surface .html files; a multi-page server
  // file (.ts) legitimately hosts sibling pages with their own palettes,
  // so the signature gate above is the real check there.
  if (surface.endsWith('.html')) {
    const text = readFileSync(join(ROOT, surface), 'utf8');
    const i = text.indexOf(OPEN);
    const j = text.indexOf(CLOSE);
    const outside = text.slice(0, i) + text.slice(j + CLOSE.length);
    const rogue = [
      ...new Set(
        (outside.match(/#[0-9a-fA-F]{6}\b/g) || []).map((h) => h.toLowerCase())
      ),
    ].filter((h) => !palette.has(h));
    if (rogue.length) {
      console.warn(`  ⚠ ${surface}: off-palette hex outside token block: ${rogue.join(', ')}`);
    }
  }
}

if (failed) {
  console.error('\nstyle-sheet drift gate FAILED — edit docs/style-sheet.html only, then re-sync surfaces.');
  process.exit(1);
}
console.log('\nstyle-sheet drift gate PASSED — all surfaces derive from canonical.');
