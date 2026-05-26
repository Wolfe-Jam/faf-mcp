/**
 * faf-cli bridge — single re-export point for faf-cli's typed public API.
 *
 * Why this file exists:
 *   faf-cli 6.7.1's `exports` map sets a `bun` condition pointing at a
 *   non-shipped `src/index.ts`. Bun's resolver always picks the `bun`
 *   condition (verified: `--conditions=node` ADDS to the set, doesn't
 *   replace), so `from 'faf-cli'` blows up at module-load in bun-test.
 *   Subpath imports (`faf-cli/dist/index.js`) are ALSO blocked because
 *   faf-cli's exports map only exports `.`.
 *
 *   Static relative paths don't survive tsc compilation either: a literal
 *   `../../node_modules/...` written in `src/utils/` resolves to the wrong
 *   place when the compiled file lands at `dist/src/utils/` (one level
 *   deeper, so the relative escape comes up short).
 *
 * How this bridge works:
 *   At runtime, walk upward from `__dirname` (which is `src/utils/` when
 *   bun loads TS source and `dist/src/utils/` when Node loads compiled
 *   CJS) until we find a `node_modules/faf-cli` directory. Then
 *   `require()` the absolute path to `dist/index.js`. Absolute-path
 *   `require()` bypasses the exports map entirely in both runtimes.
 *
 *   The type info comes via `import type` — purely a compile-time
 *   declaration. esbuild/tsc strip it at load time, so the `bun` condition
 *   never fires for types either.
 *
 *   This is intentionally a TEMPORARY workaround tied to faf-cli's bun
 *   exports bug. Once faf-cli ships `src/` OR drops the `bun` condition,
 *   this whole file becomes `export * from 'faf-cli'` and can be inlined
 *   back into call sites. Tracked alongside the AERO test's matching
 *   workaround comment in tests/wjttc-bun.test.ts.
 *
 *   Doctrine: silent-drift = fail = forbidden. The bridge is loud and
 *   localized — one file, fully commented — not scattered ts-ignores or
 *   silent type-casts.
 */

import * as path from 'path';
import * as fs from 'fs';
import type * as FafCli from 'faf-cli';

function findFafCliDist(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', 'faf-cli', 'dist', 'index.js');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(
    `faf-cli/dist/index.js not found in any ancestor node_modules of ${startDir}. ` +
      `faf-mcp requires faf-cli as a direct dependency — check installation.`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const _fafCli: typeof FafCli = require(findFafCliDist(__dirname));

export const findFafFile = _fafCli.findFafFile;
export const readFaf = _fafCli.readFaf;
export const readFafRaw = _fafCli.readFafRaw;
export const scoreFafYaml = _fafCli.scoreFafYaml;
export const getNextTier = _fafCli.getNextTier;
export const generateProjectHtml = _fafCli.generateProjectHtml;
