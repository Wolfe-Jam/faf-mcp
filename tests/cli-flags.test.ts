/**
 * WJTTC: --version / --help answer and exit; they never start the server (#94).
 *
 * Before 4.0.1, both flags were ignored: the server started on stdio and
 * printed nothing. Each run has stdin closed and a time limit, so a flag that
 * starts the server again fails here instead of hanging.
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { readFileSync } from 'fs';

const ROOT = join(import.meta.dir, '..');
const ENTRY = join(ROOT, 'src', 'index.ts');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version;

function run(...args: string[]) {
  return spawnSync(process.execPath, [ENTRY, ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    timeout: 60_000,
  });
}

describe('BRAKE: CLI flags (#94)', () => {
  for (const flag of ['--version', '-v', '-V']) {
    test(`${flag} prints the name and version, exits 0`, () => {
      const r = run(flag);
      expect(r.error).toBeUndefined();
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`faf-mcp ${VERSION}`);
    });
  }

  for (const flag of ['--help', '-h']) {
    test(`${flag} prints usage and a client config, exits 0`, () => {
      const r = run(flag);
      expect(r.error).toBeUndefined();
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('Usage:');
      expect(r.stdout).toContain('--version');
      expect(r.stdout).toContain('"mcpServers"');
    });
  }
});
