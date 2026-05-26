/**
 * faf-cli bridge — single re-export point for faf-cli's typed public API.
 *
 * Why this file exists:
 *   faf-cli 6.7.1's `exports` map sets a `bun` condition pointing at a
 *   non-shipped `src/index.ts`. Bun's resolver picks that first and fails.
 *   Node (production runtime) picks `default` → `dist/index.js` — works fine.
 *   By importing via the explicit dist path here, BOTH runtimes resolve the
 *   same compiled module. The relative `../../node_modules/...` path is OK
 *   because faf-cli is a direct dependency (declared in package.json), so
 *   it's always hoisted to this repo's node_modules root.
 *
 *   This is intentionally a TEMPORARY workaround tied to faf-cli's bun
 *   exports bug. Once faf-cli ships `src/` OR drops the `bun` condition,
 *   this file becomes a one-liner `export * from 'faf-cli'` and can be
 *   inlined back into the call sites. Tracked alongside the AERO test's
 *   matching workaround comment in tests/wjttc-bun.test.ts.
 *
 *   Doctrine: silent-drift = fail = forbidden. The bridge is loud and
 *   localized — one file, fully commented — not silent type-cast scattered
 *   across handlers.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — relative import to the published dist (see file header).
export {
  findFafFile,
  readFaf,
  readFafRaw,
  scoreFafYaml,
  getNextTier,
  generateProjectHtml,
} from '../../node_modules/faf-cli/dist/index.js';
