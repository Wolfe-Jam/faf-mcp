/**
 * 🏁 WJTTC — compose faf-cli, never port it (faf-mcp 3.0, audit cluster 7)
 *
 * BRAKE tier. faf-mcp used to carry hand-ported copies of faf-cli's AGENTS.md /
 * GEMINI.md / .cursorrules renderers, its own block injector, a pre-v3
 * CLAUDE.md template, and its own project.faf merge + YAML writer. They
 * drifted: thinner AGENTS.md (no repo enrichment), a CLAUDE.md that dropped
 * Stack and every human_context slot, a runtime `_meta` block serialized into
 * project.faf, and docker-compose facts lost to a slot-ignore pass faf-cli's
 * own `faf auto` does not run on existing files.
 *
 * Since faf-cli 7.12.0 every one of those is a public export. This suite pins
 * that faf-mcp's tools write the SAME BYTES the exports write, and that the
 * ported modules are gone.
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
const FIXTURE = path.join(__dirname, 'fixtures', 'polyglot-p0');
const SEED = [
  'project:', '  name: hand-name', '  goal: ""', '  type: backend',
  'human_context:', '  who: Real hand-written who', '  what: ""',
  'stack:', '  hosting: Fly.io', '  database: ""', '',
].join('\n');
const stripTs = (s: string): string => s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<TS>');

function copyFixture(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-compose-'));
  for (const e of fs.readdirSync(FIXTURE)) fs.cpSync(path.join(FIXTURE, e), path.join(d, e), { recursive: true });
  return d;
}

describe('🏁 WJTTC — compose faf-cli', () => {
  let client: Client;
  let server: FafMcpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cli: any;
  const dirs: string[] = [];

  beforeAll(async () => {
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-compose', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    cli = await fafCliPromise;
  });
  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  test('the ported modules are gone and nothing under src/ renders interop files itself', () => {
    const src = path.join(__dirname, '..', 'src');
    expect(fs.existsSync(path.join(src, 'faf-core', 'parsers', 'interop-render.ts'))).toBe(false);
    expect(fs.existsSync(path.join(src, 'faf-core', 'inject.ts'))).toBe(false);
    const walk = (d: string, out: string[] = []): string[] => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : p.endsWith('.ts') && out.push(p); } return out; };
    const offenders = walk(src).filter(f => /## Guardrails|## Definition of Done|Authored from project\.faf|fafToClaudeMd/.test(fs.readFileSync(f, 'utf-8'))).map(f => path.relative(src, f));
    expect(offenders).toEqual([]);
  });

  test('faf_agents / faf_gemini / faf_cursor write exactly what faf-cli\'s exports write', async () => {
    const mine = copyFixture(); const theirs = copyFixture(); dirs.push(mine, theirs);
    for (const d of [mine, theirs]) fs.writeFileSync(path.join(d, 'project.faf'), SEED);
    for (const tool of ['faf_agents', 'faf_gemini', 'faf_cursor']) {
      const res = (await client.callTool({ name: tool, arguments: { path: mine, action: 'export', force: true } })) as ToolText;
      expect(res.isError).toBeFalsy();
    }
    const data = cli.readFaf(path.join(theirs, 'project.faf'));
    cli.writeAgentsMd(theirs, cli.enrichFromRepo(theirs, data));
    cli.writeGeminiMd(theirs, cli.enrichFromRepo(theirs, data));
    cli.writeCursorrules(theirs, data);
    for (const f of ['AGENTS.md', 'GEMINI.md', '.cursorrules']) {
      expect(fs.readFileSync(path.join(mine, f), 'utf-8')).toBe(fs.readFileSync(path.join(theirs, f), 'utf-8'));
    }
    // Repo enrichment flowed: the Makefile/package.json commands are in AGENTS.md.
    expect(fs.readFileSync(path.join(mine, 'AGENTS.md'), 'utf-8')).toContain('## Setup & build');
  });

  test('.cursorrules round-trip: the project name survives faf-cli\'s `# Stack` comment lines', async () => {
    const { parseCursorRules } = await import('../src/faf-core/parsers/cursorrules-parser');
    const rendered = cli.renderCursorrules({ project: { name: 'round-trip-name', main_language: 'TypeScript' }, stack: { backend: 'Express', package_manager: 'npm' } });
    const wrapped = `# faf:start\n${rendered.trim()}\n# faf:end\n\n# Team rules\n- keep it simple\n`;
    const parsed = parseCursorRules(wrapped);
    expect(parsed.projectName).toBe('round-trip-name'); // was "Package Manager: npm"
  });

  test('faf_claude writes faf-cli\'s CLAUDE.md (Stack + human context present, not the pre-v3 template)', async () => {
    const mine = copyFixture(); const theirs = copyFixture(); dirs.push(mine, theirs);
    for (const d of [mine, theirs]) fs.writeFileSync(path.join(d, 'project.faf'), SEED);
    const res = (await client.callTool({ name: 'faf_claude', arguments: { path: mine } })) as ToolText;
    expect(res.isError).toBeFalsy();
    cli.writeClaudeMd(theirs, cli.renderClaudeMd(cli.readFaf(path.join(theirs, 'project.faf'))));
    const got = fs.readFileSync(path.join(mine, 'CLAUDE.md'), 'utf-8');
    expect(stripTs(got)).toBe(stripTs(fs.readFileSync(path.join(theirs, 'CLAUDE.md'), 'utf-8')));
    expect(got).toContain('Real hand-written who');
    expect(got).not.toContain('Tyre Compound');
    expect(got).not.toContain('instant_context');
  });

  test('faf_init writes exactly what `faf init` writes, reports its real score, and the next tools accept it', async () => {
    // `faf init` = assembleFreshFaf → writeFaf → scoreFafYaml (faf-cli src/commands/init.ts).
    // faf_init used to write its own template: no faf_version, `project:` as a
    // string, 0% on any folder, rejected by faf_trust, crashed faf_go.
    const mine = copyFixture(); const theirs = copyFixture(); dirs.push(mine, theirs);
    const res = (await client.callTool({ name: 'faf_init', arguments: { path: mine } })) as ToolText;
    expect(res.isError).toBeFalsy();
    cli.writeFaf(path.join(theirs, 'project.faf'), cli.assembleFreshFaf(theirs));
    const got = fs.readFileSync(path.join(mine, 'project.faf'), 'utf-8');
    expect(stripTs(got)).toBe(stripTs(fs.readFileSync(path.join(theirs, 'project.faf'), 'utf-8')));
    expect(got).toContain('faf_version');
    expect(got).not.toContain('The Formula');
    const real = cli.scoreFafYaml(got);
    expect(real.score).toBeGreaterThan(0); // the fixture has facts; the old template scored 0 on it
    expect(res.content[0].text).toContain(`${real.score}/100`);

    // faf_trust takes no path: it checks the current project, which faf_init just set.
    const trust = (await client.callTool({ name: 'faf_trust', arguments: {} })) as ToolText;
    expect(trust.isError).toBeFalsy();
    expect(trust.content[0].text).toContain(`${real.score}/100`);
    const go = (await client.callTool({ name: 'faf_go', arguments: { path: mine, answers: { 'human_context.why': 'Parity test' } } })) as ToolText;
    expect(go.isError).toBeFalsy();
    expect(fs.readFileSync(path.join(mine, 'project.faf'), 'utf-8')).toContain('Parity test');
  });

  test('faf_auto on an existing file is faf-cli\'s own update chain: hand values win, docker-compose facts flow, no _meta', async () => {
    const mine = copyFixture(); const theirs = copyFixture(); dirs.push(mine, theirs);
    for (const d of [mine, theirs]) fs.writeFileSync(path.join(d, 'project.faf'), SEED);
    const res = (await client.callTool({ name: 'faf_auto', arguments: { path: mine } })) as ToolText;
    expect(res.isError).toBeFalsy();
    cli.writeFaf(path.join(theirs, 'project.faf'), cli.updateExistingFaf(theirs, cli.readFaf(path.join(theirs, 'project.faf'))));
    const got = fs.readFileSync(path.join(mine, 'project.faf'), 'utf-8');
    expect(got).toBe(fs.readFileSync(path.join(theirs, 'project.faf'), 'utf-8'));
    expect(got).not.toContain('_meta');
    const data = cli.readFaf(path.join(mine, 'project.faf'));
    expect(data.project.name).toBe('hand-name');
    expect(data.human_context.who).toBe('Real hand-written who');
    expect(data.stack.database).toBe('PostgreSQL');
    expect(data.stack.cache).toBe('Redis'); // used to arrive as `slotignored`
    // and CLAUDE.md came along, rendered by faf-cli
    expect(fs.readFileSync(path.join(mine, 'CLAUDE.md'), 'utf-8')).toContain('<!-- faf:start -->');
  });

  test('faf_auto on a fresh dir writes what faf-cli writes and reports the score of that file', async () => {
    const mine = copyFixture(); const theirs = copyFixture(); dirs.push(mine, theirs);
    const res = (await client.callTool({ name: 'faf_auto', arguments: { path: mine } })) as ToolText;
    expect(res.isError).toBeFalsy();
    cli.writeFaf(path.join(theirs, 'project.faf'), cli.assembleFreshFaf(theirs));
    const got = fs.readFileSync(path.join(mine, 'project.faf'), 'utf-8');
    expect(stripTs(got)).toBe(stripTs(fs.readFileSync(path.join(theirs, 'project.faf'), 'utf-8')));
    const after = parseInt((res.content[0].text ?? '').match(/After:\s*(\d{1,3})%/)![1], 10);
    expect(after).toBe(cli.scoreFafYaml(got).score);
  });
});
