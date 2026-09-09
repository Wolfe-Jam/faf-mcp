/**
 * 🏁 WJTTC — P0 score parity (faf-mcp 3.0)
 *
 * THE regression test for the headline faf-mcp 3.0 bug: `faf_auto` used a
 * local `calculateSimpleScore` pseudo-scorer while `faf_score` (correctly)
 * composed faf-cli's real `scoreFafYaml` — two engines, two answers, same
 * server, same file. Verified live pre-fix on a polyglot fixture:
 *   faf_auto  → "Before: 25% | After: 48%"
 *   faf_score → "FAF SCORE: 19/100 (19%)"
 * A 29-point, two-tier disagreement one call apart.
 *
 * `calculateSimpleScore` also fed `faf_dna`'s birth-certificate score and
 * `faf_doctor`'s health-check score — this file proves parity for all
 * three, not just `faf_auto`.
 *
 * Fixture: tests/fixtures/polyglot-p0/ — a real two-language repo
 * (Node/TypeScript + Python), docker-compose (Postgres + Redis), and a
 * Makefile — so faf-cli's interrogation layer has real facts to find
 * (matches the shape the original bug was reproduced against). Copied into
 * a fresh temp dir per test so faf_auto/faf_dna can write into it without
 * mutating the committed fixture.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Same workaround as tests/wjttc-bun.test.ts — faf-cli's `bun` exports
// condition points at a non-shipped src/; load the published dist directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fafCliPromise: Promise<any> = import('../node_modules/faf-cli/dist/index.js');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/polyglot-p0');

function copyFixtureToTmp(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-polyglot-'));
  for (const entry of fs.readdirSync(FIXTURE)) {
    fs.cpSync(path.join(FIXTURE, entry), path.join(tmp, entry), { recursive: true });
  }
  return tmp;
}

type ToolText = { content: Array<{ type: string; text?: string }>; isError?: boolean };

function firstText(res: ToolText): string {
  return (res.content?.[0]?.text ?? '') as string;
}

describe('🏁 WJTTC — P0 score parity (faf_auto / faf_dna / faf_doctor == faf_score)', () => {
  let client: Client;
  let server: FafMcpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fafCli: any;

  beforeAll(async () => {
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-p0-parity', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    fafCli = await fafCliPromise;
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
  });

  test('the fixture is a real polyglot repo (docker-compose + Makefile + two languages)', () => {
    expect(fs.existsSync(path.join(FIXTURE, 'docker-compose.yml'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE, 'Makefile'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE, 'requirements.txt'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE, 'service-py/worker.py'))).toBe(true);
  });

  describe('faf_auto == faf_score (the headline v2.x bug)', () => {
    let tmpDir: string;

    beforeAll(() => {
      tmpDir = copyFixtureToTmp();
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('faf_auto composes real facts (assembleFreshFaf), not a bootstrap template', async () => {
      const res = await client.callTool({ name: 'faf_auto', arguments: { path: tmpDir } });
      expect(res.isError).toBeFalsy();

      const fafPath = fafCli.findFafFile(tmpDir);
      expect(fafPath).toBeTruthy();
      const data = fafCli.readFaf(fafPath);

      // Real docker-compose + Makefile facts, not the old hand-rolled
      // bootstrap YAML (which only ever wrote project/type/context/version —
      // never a populated `stack` block).
      expect(data.stack?.database).toBe('PostgreSQL');
      expect(data.commands?.test).toBe('make test');
    });

    test('faf_auto "After" score equals faf_score on the resulting file (THE parity receipt)', async () => {
      const autoRes = (await client.callTool({
        name: 'faf_auto',
        arguments: { path: tmpDir },
      })) as ToolText;
      expect(autoRes.isError).toBeFalsy();
      const autoText = firstText(autoRes);

      const afterMatch = autoText.match(/After:\s*(\d{1,3})%/);
      expect(afterMatch).not.toBeNull();
      const autoAfterScore = parseInt(afterMatch![1], 10);

      const scoreRes = (await client.callTool({
        name: 'faf_score',
        arguments: { path: tmpDir },
      })) as ToolText;
      expect(scoreRes.isError).toBeFalsy();
      const scoreText = firstText(scoreRes);
      const scoreMatch = scoreText.match(/(?:FAF SCORE:\s*|\b)(\d{1,3})\s*(?:%|\/\s*100)/);
      expect(scoreMatch).not.toBeNull();
      const realScore = parseInt(scoreMatch![1], 10);

      // THE regression: pre-fix this was a 29-point, two-tier gap (25%/48%
      // from faf_auto vs 19% from faf_score, verified live on a polyglot
      // fixture). Post-fix, both read the same scoreFafYaml call.
      expect(autoAfterScore).toBe(realScore);

      // Independent cross-check against faf-cli's own scorer on the exact
      // bytes faf_auto wrote — not just "the two tools agree with each
      // other", but "both agree with the real engine".
      const fafPath = fafCli.findFafFile(tmpDir);
      const trueScore = fafCli.scoreFafYaml(fafCli.readFafRaw(fafPath)).score;
      expect(autoAfterScore).toBe(trueScore);

      // Non-trivial fixture — 0 and 100 would pass this assertion trivially.
      expect(realScore).toBeGreaterThan(0);
      expect(realScore).toBeLessThan(100);
    });

    test('faf_auto is non-destructive on a second run (existing values preserved, score never drops)', async () => {
      const first = (await client.callTool({
        name: 'faf_auto',
        arguments: { path: tmpDir },
      })) as ToolText;
      const firstAfter = parseInt(firstText(first).match(/After:\s*(\d{1,3})%/)![1], 10);

      const fafPath = fafCli.findFafFile(tmpDir);
      // Hand-edit a field faf_auto should never clobber.
      const data = fafCli.readFaf(fafPath);
      data.project.goal = 'HAND-EDITED — must survive a second faf_auto run';
      fs.writeFileSync(fafPath, (await import('yaml')).stringify(data), 'utf-8');

      const second = (await client.callTool({
        name: 'faf_auto',
        arguments: { path: tmpDir },
      })) as ToolText;
      expect(second.isError).toBeFalsy();
      const secondAfter = parseInt(firstText(second).match(/After:\s*(\d{1,3})%/)![1], 10);

      const finalData = fafCli.readFaf(fafPath);
      expect(finalData.project.goal).toBe('HAND-EDITED — must survive a second faf_auto run');
      expect(secondAfter).toBeGreaterThanOrEqual(firstAfter);
    });
  });

  describe('faf_dna birth score == faf_score (calculateSimpleScore also fed faf_dna)', () => {
    let tmpDir: string;

    beforeAll(async () => {
      tmpDir = copyFixtureToTmp();
      const yamlLib = await import('yaml');
      const fresh = fafCli.assembleFreshFaf(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'project.faf'), yamlLib.stringify(fresh), 'utf-8');
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('faf_dna birth DNA equals scoreFafYaml on the same file', async () => {
      const res = (await client.callTool({ name: 'faf_dna', arguments: { path: tmpDir } })) as ToolText;
      expect(res.isError).toBeFalsy();
      const text = firstText(res);

      const m = text.match(/Birth DNA:\s*(\d{1,3})%/);
      expect(m).not.toBeNull();
      const birthScore = parseInt(m![1], 10);

      const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
      const realScore = fafCli.scoreFafYaml(raw).score;
      expect(birthScore).toBe(realScore);
    });
  });

  describe('faf_doctor score == faf_score (calculateSimpleScore also fed faf_doctor)', () => {
    let tmpDir: string;

    beforeAll(async () => {
      tmpDir = copyFixtureToTmp();
      const yamlLib = await import('yaml');
      const fresh = fafCli.assembleFreshFaf(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'project.faf'), yamlLib.stringify(fresh), 'utf-8');
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('faf_doctor reported score equals scoreFafYaml on the same file', async () => {
      const res = (await client.callTool({ name: 'faf_doctor', arguments: { path: tmpDir } })) as ToolText;
      expect(res.isError).toBeFalsy();
      const text = firstText(res);

      const m = text.match(/(?:Score too low|Score could be better|Great score):\s*(\d{1,3})%/);
      expect(m).not.toBeNull();
      const doctorScore = parseInt(m![1], 10);

      const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
      const realScore = fafCli.scoreFafYaml(raw).score;
      expect(doctorScore).toBe(realScore);
    });
  });
});
