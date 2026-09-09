/**
 * 🏁 WJTTC — score truth (faf-mcp 3.0, audit cluster 4)
 *
 * BRAKE tier. "One score function, period" — every percentage a tool prints
 * is faf-cli's scoreFafYaml on the bytes on disk. The 3.0 audit found three
 * tools still doing their own arithmetic after the P0 unification:
 *
 *   faf_go       an 8-field filled/total ratio with its own emptiness list
 *                (50% where faf_score said 65% on the same file)
 *   faf_bi_sync  "FAF Score: 0%" from a `faf_score` key nothing writes
 *   faf_dna      the score stored in .faf-dna at birth, forever ("5% — you
 *                are here" after faf_auto had taken the file to 65%)
 *
 * Each case compares the tool's printed number with scoreFafYaml on the file.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fafCli as fafCliPromise } from '../src/utils/faf-cli-bridge.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';

const WEAK_FAF = `faf_version: "3.0"
project:
  name: score-truth-fixture
  goal: ""
  main_language: TypeScript
  type: cli
stack:
  runtime: Node.js
human_context:
  who: ""
  what: ""
  why: ""
`;

describe('🏁 WJTTC — score truth', () => {
  let client: Client;
  let server: FafMcpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fafCli: any;
  const dirs: string[] = [];
  const mk = (): string => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-score-truth-')); dirs.push(d); return d; };
  const realScore = (dir: string): number => fafCli.scoreFafYaml(fafCli.readFafRaw(path.join(dir, 'project.faf'))).score;

  beforeAll(async () => {
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-score-truth', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    fafCli = await fafCliPromise;
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  test('faf_go currentScore is the real score, and its questions follow the scorer\'s emptiness rule', async () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, 'project.faf'), WEAK_FAF);
    const res = (await client.callTool({ name: 'faf_go', arguments: { path: dir } })) as ToolText;
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(firstText(res));
    expect(body.needsInput).toBe(true);
    expect(body.currentScore).toBe(realScore(dir));
    const asked = body.questions.map((q: { field: string }) => q.field);
    expect(asked).toContain('human_context.who');
    expect(asked).not.toContain('project.name'); // populated
  });

  test('faf_go "New Score" after answers is the score of the file it wrote', async () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, 'project.faf'), WEAK_FAF);
    const before = realScore(dir);
    const res = (await client.callTool({
      name: 'faf_go',
      arguments: { path: dir, answers: { 'human_context.who': 'Maintainers of this fixture', 'human_context.why': 'Because the number must be true', 'human_context.where': 'n/a' } },
    })) as ToolText;
    expect(res.isError).toBeFalsy();
    const printed = parseInt(firstText(res).match(/New Score:\s*(\d{1,3})%/)![1], 10);
    const written = realScore(dir);
    expect(printed).toBe(written);
    expect(written).toBeGreaterThan(before);
    // 'n/a' is a placeholder to the scorer, so it must still be asked next time.
    const again = JSON.parse(firstText((await client.callTool({ name: 'faf_go', arguments: { path: dir } })) as ToolText));
    expect(again.questions.map((q: { field: string }) => q.field)).toContain('human_context.where');
  });

  test('faf_bi_sync prints the real score, never "0%" from a key nothing writes', async () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, 'project.faf'), WEAK_FAF);
    const res = (await client.callTool({ name: 'faf_bi_sync', arguments: { path: dir } })) as ToolText;
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    expect(text).toContain(`FAF Score: ${realScore(dir)}%`);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
  });

  test('faf_dna reports the live score and records growth, not the birth score forever', async () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, 'project.faf'), WEAK_FAF);
    const birth = firstText((await client.callTool({ name: 'faf_dna', arguments: { path: dir } })) as ToolText);
    const birthScore = realScore(dir);
    expect(birth).toContain(`Birth DNA: ${birthScore}%`);

    // The file improves outside faf_dna's view.
    fs.writeFileSync(path.join(dir, 'project.faf'), WEAK_FAF
      .replace('goal: ""', 'goal: Prove faf_dna reads the file, not its memory')
      .replace('who: ""', 'who: Maintainers').replace('what: ""', 'what: A fixture').replace('why: ""', 'why: Truth'));
    const live = realScore(dir);
    expect(live).toBeGreaterThan(birthScore);

    const journey = firstText((await client.callTool({ name: 'faf_dna', arguments: { path: dir } })) as ToolText);
    expect(journey).toContain(`${birthScore}% → ${live}%`);
    expect(journey).toContain(`Total Growth: +${live - birthScore}%`);
    expect(journey).toContain(`sync: ${live}% ← You are here!`);
    const stored = JSON.parse(fs.readFileSync(path.join(dir, '.faf-dna'), 'utf-8'));
    expect(stored.current.score).toBe(live);
  });
});
