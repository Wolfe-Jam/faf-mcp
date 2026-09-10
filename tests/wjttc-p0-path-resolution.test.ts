/**
 * 🏁 WJTTC — P0 PATH-resolution fix (faf-mcp 3.0)
 *
 * `faf_trust`, `faf_clear`, and both MCP resources (`claude-faf://context`,
 * `claude-faf://status`) resolved a CLI via `cli-detector.ts`'s
 * `detectFafCli()` — `which faf` / `command -v faf` — before ever checking
 * this package's own bundled `node_modules/faf-cli`. On a host where an
 * unrelated binary named `faf` sits first on PATH, these three either
 * hard-error ("unrecognized subcommand") or — worse — silently "succeed"
 * with that unrelated tool's own output.
 *
 * This machine reproduces the bug shape live: bare `faf` on PATH resolves
 * to an unrelated Rust tool ("FAFb", confirmed via `which faf` in other
 * suites' console output — v0.9.3, not faf-cli). These tests exercise
 * faf_trust/faf_clear/both resources on THIS machine's real, poisoned PATH
 * and assert they return real faf-mcp/faf-cli-shaped data — proof the fix
 * holds even in the exact environment that reproduced the original bug,
 * not just in a mocked one.
 *
 * Static checks additionally confirm the source no longer routes these
 * three through `engineAdapter.callEngine(...)` at all (the only path that
 * could reach the ambient-PATH shell-out).
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fafCliPromise: Promise<any> = import('../node_modules/faf-cli/dist/index.js');

const ROOT = path.resolve(__dirname, '..');

const SAMPLE_FAF = [
  'faf_version: "3.0"',
  'project:',
  '  name: path-resolution-fixture',
  '  goal: P0 PATH-resolution regression fixture.',
  '  main_language: TypeScript',
  '  type: mcp',
  '',
].join('\n');

type ToolText = { content: Array<{ type: string; text?: string }>; isError?: boolean };
function firstText(res: ToolText): string {
  return (res.content?.[0]?.text ?? '') as string;
}

describe('🏁 WJTTC — P0 PATH-resolution (faf_trust / faf_clear / resources never hit ambient PATH)', () => {
  describe('static: source no longer routes these three through engineAdapter.callEngine', () => {
    const toolsSrc = fs.readFileSync(path.join(ROOT, 'src/handlers/tools.ts'), 'utf-8');
    const resourcesSrc = fs.readFileSync(path.join(ROOT, 'src/handlers/resources.ts'), 'utf-8');

    test('handleFafTrust no longer calls engineAdapter.callEngine', () => {
      const fn = toolsSrc.slice(
        toolsSrc.indexOf('private async handleFafTrust'),
        toolsSrc.indexOf('private async handleFafSync'),
      );
      expect(fn).not.toContain('engineAdapter.callEngine');
      expect(fn).toContain('fafCli');
    });

    test('handleFafClear no longer calls engineAdapter.callEngine', () => {
      const fn = toolsSrc.slice(
        toolsSrc.indexOf('private async handleFafClear'),
        toolsSrc.indexOf('private async handleFafAbout'),
      );
      expect(fn).not.toContain('engineAdapter.callEngine');
    });

    test('resources.ts no longer calls engineAdapter.callEngine for status/context', () => {
      // Slice from the actual method bodies (past the historical doc
      // comment above them, which names the old call for context).
      const bodies = resourcesSrc.slice(resourcesSrc.indexOf('private async getFafContext('));
      expect(bodies).not.toContain('engineAdapter.callEngine');
      expect(resourcesSrc).toContain('fafCli');
    });
  });

  describe('live: correct output on this machine\'s real (poisoned) PATH', () => {
    let client: Client;
    let server: FafMcpServer;
    let tmpDir: string;
    let fakeHome: string;
    let canaryLog: string;
    const savedEnv: Record<string, string | undefined> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fafCli: any;

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-path-'));
      fs.writeFileSync(path.join(tmpDir, 'project.faf'), SAMPLE_FAF);

      // Never touch the developer's real home: faf_clear removes
      // ~/.faf-cli-cache, so point HOME at a throwaway dir for this suite.
      fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-home-'));
      fs.mkdirSync(path.join(fakeHome, '.faf-cli-cache'));
      fs.writeFileSync(path.join(fakeHome, '.faf-cli-cache', 'technical-credit.json'), '{}');

      // A poisoned PATH that exists on EVERY machine, not just this one: a
      // canary `faf` first on PATH that logs any invocation. After the live
      // tests the log must not exist — proof nothing spawned a `faf`.
      const canaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-canary-'));
      canaryLog = path.join(canaryDir, 'invocations.log');
      fs.writeFileSync(path.join(canaryDir, 'faf'), `#!/bin/sh\necho "$@" >> "${canaryLog}"\necho "CANARY-FOREIGN-FAF 0.0.0"\n`, { mode: 0o755 });
      for (const k of ['HOME', 'USERPROFILE', 'PATH']) savedEnv[k] = process.env[k];
      process.env.HOME = fakeHome;
      process.env.USERPROFILE = fakeHome;
      process.env.PATH = `${canaryDir}${path.delimiter}${process.env.PATH ?? ''}`;

      server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
      const [clientT, serverT] = InMemoryTransport.createLinkedPair();
      await server.getServer().connect(serverT);
      client = new Client({ name: 'wjttc-p0-path', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientT);
      fafCli = await fafCliPromise;
    });

    afterAll(async () => {
      await client.close();
      await server.getServer().close();
      for (const k of Object.keys(savedEnv)) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(fakeHome, { recursive: true, force: true });
    });

    test('faf_trust returns real validation/score data, not a shelled-out foreign tool\'s output', async () => {
      const res = (await client.callTool({ name: 'faf_trust', arguments: {} })) as ToolText;
      const text = firstText(res);

      // Never the faf-cli "unrecognized subcommand" error a real faf-cli
      // binary would give for a nonexistent `trust` subcommand, and never
      // any sign of a foreign tool's own banner/output.
      expect(text).not.toContain('unrecognized subcommand');
      expect(text.toLowerCase()).not.toContain('fafb');
      expect(text).toContain('Trust Validation');
    });

    test('faf_trust reports honestly when pointed at the fixture .faf (real slot data)', async () => {
      const res = (await client.callTool({ name: 'faf_trust', arguments: { path: tmpDir } })) as ToolText;
      // faf_trust has no `path` param in its schema (session-context tool) —
      // set context via a path-bearing tool first, then call faf_trust.
      void res;
      await client.callTool({ name: 'faf_score', arguments: { path: tmpDir } });
      const trustRes = (await client.callTool({ name: 'faf_trust', arguments: {} })) as ToolText;
      const text = firstText(trustRes);

      const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
      const expected = fafCli.scoreFafYaml(raw);
      expect(text).toContain(`${expected.populated}/${expected.active} slots populated`);
    });

    test('faf_clear never depends on any CLI — always returns a well-formed local result', async () => {
      const res = (await client.callTool({ name: 'faf_clear', arguments: { cache: true } })) as ToolText;
      expect(res.isError).toBeFalsy();
      const text = firstText(res);
      expect(text).toContain('cache:');
      expect(text).not.toContain('unrecognized subcommand');
    });

    test('faf_clear with no flags clears the cache and claims nothing else', async () => {
      const res = (await client.callTool({ name: 'faf_clear', arguments: {} })) as ToolText;
      expect(res.isError).toBeFalsy();
      const text = firstText(res);
      expect(text).toContain('cache:');
      // todos/backups were never real stores; the schema no longer offers them.
      expect(text).not.toContain('todos:');
      expect(text).not.toContain('backups:');
    });

    test('claude-faf://status resource reports the real fixture score, not a foreign tool\'s banner', async () => {
      await client.callTool({ name: 'faf_score', arguments: { path: tmpDir } });
      const res = await client.readResource({ uri: 'claude-faf://status' });
      const text = (res.contents?.[0]?.text ?? '') as string;

      expect(text.toLowerCase()).not.toContain('fafb');
      expect(text).toContain(tmpDir.includes(path.sep) ? path.basename(tmpDir) : tmpDir);

      const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
      const expected = fafCli.scoreFafYaml(raw);
      expect(text).toContain(`${expected.score}/100`);
    });

    test('claude-faf://context resource returns real parsed .faf JSON, not a foreign tool\'s output', async () => {
      await client.callTool({ name: 'faf_score', arguments: { path: tmpDir } });
      const res = await client.readResource({ uri: 'claude-faf://context' });
      const text = (res.contents?.[0]?.text ?? '') as string;
      const parsed = JSON.parse(text);

      expect(parsed.error).toBeUndefined();
      expect(parsed.data?.project?.name).toBe('path-resolution-fixture');

      const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
      const expected = fafCli.scoreFafYaml(raw);
      expect(parsed.score).toBe(expected.score);
    });

    test('faf_clear cleared the FAKE home, and the real one was never touched', () => {
      expect(fs.existsSync(path.join(fakeHome, '.faf-cli-cache', 'technical-credit.json'))).toBe(false);
      expect(process.env.HOME).toBe(fakeHome); // still redirected while the suite runs
    });

    test('no tool or resource spawned the `faf` on PATH (canary log never written)', () => {
      expect(fs.existsSync(canaryLog)).toBe(false);
    });
  });
});
