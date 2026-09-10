/**
 * 🏁 WJTTC — tool truth, checker list (G1: src/handlers/tools.ts)
 *
 * BRAKE tier. Every tool string says what the handler does, and every
 * annotation matches what the handler touches. Each test below fails on the
 * pre-fix tools.ts:
 *
 *   faf_check    — "locks" fields; nothing reads _protected_fields
 *   faf_sync     — dry-run printed raw JSON, no field names
 *   faf_guide    — taught CLI commands and a personal path
 *   faf_dna      — readOnlyHint:true, yet it writes .faf-dna
 *   faf_context  — promised every later faf_ call resolves against it
 *   faf_clear    — said it removed the directory; it removes one file
 *   faf_auto     — "sync" + "complete project.faf"
 *   faf_quick    — wrote main_language: TypeScript by default, no faf_version
 *   faf_write / faf_conductor / faf_git — destructiveHint:false
 *   faf_git      — no force; silent overwrite
 *   faf_about / faf_what / faf_score — banned word, CLI pointers
 *   interop merge/force props — described behaviour the commands lack
 *   faf_go       — named a Claude Code host tool
 *   faf_debug    — wrote a probe file into the workspace
 *   faf_read / faf_write / faf_list titles — ".faf File(s)"
 *   faf_formats  — a second "score" next to faf_score's
 *   faf_doctor   — "prioritized", "championship"
 *   faf_claude   — raw result JSON
 *   faf_trust    — "structurally sound" overclaim
 *   faf_auto     — car talk in the header
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import YAML from 'yaml';
import { FafMcpServer } from '../src/server.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fafCli as fafCliPromise } from '../src/utils/faf-cli-bridge.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
type ListedTool = {
  name: string;
  description?: string;
  annotations?: { title?: string; readOnlyHint?: boolean; destructiveHint?: boolean };
  inputSchema: { properties?: Record<string, { description?: string }> };
};
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';

// 5/21 populated (24%): human slots and stack slots left empty.
const PARTIAL_FAF = `faf_version: "3.0"
project:
  name: tool-truth-fixture
  goal: Fixture for the tool truth suite.
  main_language: TypeScript
human_context:
  who: maintainers of the fixture
  what: a fixture for the tool truth suite
`;

// 9/21 populated (43%): lands faf_doctor in its 30–69 warning band.
const MID_FAF = `faf_version: "3.0"
project:
  name: doctor-mid
  goal: Fixture for the doctor band.
  main_language: TypeScript
human_context:
  who: maintainers of the fixture
  what: a fixture for the doctor
  why: to pin the doctor fix text
  where: local disks only
  when: every test run
  how: bun test on this file
`;

// 100%: every active slot populated, the rest slotignored.
const FULL_FAF = `faf_version: "3.0"
project:
  name: doctor-full
  goal: Fixture that reaches a high score for the doctor.
  main_language: TypeScript
  type: cli
stack:
  frontend: slotignored
  css_framework: slotignored
  ui_library: slotignored
  state_management: slotignored
  backend: slotignored
  api_type: slotignored
  runtime: Node.js
  database: slotignored
  connection: slotignored
  hosting: npm
  build: tsc
  cicd: GitHub Actions
  package_manager: npm
human_context:
  who: maintainers of the fixture
  what: a fixture for the doctor suite
  why: to prove the doctor healthy line
  where: npm registry and local disks
  when: every release of the fixture
  how: npm install then run the tests
`;

describe('🏁 WJTTC — tool truth (checker list, tools.ts)', () => {
  let client: Client;
  let server: FafMcpServer;
  let tools: ListedTool[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cli: any;
  const dirs: string[] = [];
  const prevTools = process.env.FAF_TOOLS;
  const toolsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');

  const tool = (name: string): ListedTool => {
    const t = tools.find(x => x.name === name);
    if (!t) throw new Error(`tool ${name} not listed`);
    return t;
  };
  const call = async (name: string, args: Record<string, unknown> = {}): Promise<ToolText> =>
    (await client.callTool({ name, arguments: args })) as ToolText;
  const tmp = (files: Record<string, string> = {}): string => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-302-tool-truth-'));
    dirs.push(d);
    for (const [f, body] of Object.entries(files)) fs.writeFileSync(path.join(d, f), body);
    return d;
  };
  const handlerBody = (handler: string): string => {
    const start = toolsSrc.indexOf(`private async ${handler}(`);
    expect(start).toBeGreaterThan(-1);
    const next = toolsSrc.indexOf('\n  private ', start + 1);
    return toolsSrc.slice(start, next === -1 ? undefined : next);
  };

  beforeAll(async () => {
    process.env.FAF_TOOLS = 'all'; // the whole surface, not just the Core tier
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-302-tool-truth', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    tools = (await client.listTools()).tools as ListedTool[];
    cli = await fafCliPromise;
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    if (prevTools === undefined) delete process.env.FAF_TOOLS; else process.env.FAF_TOOLS = prevTools;
  });

  // ── [#3] faf_check ───────────────────────────────────────────────────────
  test('faf_check says _protected_fields is advisory, never that it locks anything', async () => {
    const t = tool('faf_check');
    expect(t.description).toContain('_protected_fields');
    expect(t.description).toContain('advisory');
    expect(t.description).not.toMatch(/\block/i);
    expect(t.description).not.toContain('excellent');
    expect(t.inputSchema.properties?.protect?.description).toContain('advisory');
    expect(t.inputSchema.properties?.protect?.description).not.toMatch(/\block/i);

    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    const res = await call('faf_check', { path: dir, protect: true });
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    expect(text).toContain('_protected_fields');
    expect(text).toMatch(/advisory/i);
    expect(text).not.toMatch(/^✅ Protected/m);
    expect(YAML.parse(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8'))._protected_fields).toEqual(['who', 'what']);

    const report = firstText(await call('faf_check', { path: dir }));
    expect(report).toContain('advisory');
    expect(report).not.toContain('🔒 Protected:');

    const unlocked = firstText(await call('faf_check', { path: dir, unlock: true }));
    expect(unlocked).not.toContain('unlocked');
  });

  // ── [#4/#28] faf_sync ────────────────────────────────────────────────────
  test('faf_sync dry-run lists each field it would change, one line per field', async () => {
    const seen: string[][] = [];
    const data = {
      success: true, changesDetected: 2, changesApplied: 0,
      message: 'Would update 2 field(s). Pass apply: true to write them.',
      changes: [
        { path: 'project.name', oldValue: 'old-name', newValue: 'new-name' },
        { path: 'stack.frontend', oldValue: '', newValue: 'React' },
      ],
    };
    const stub = {
      callEngine: async (_c: string, a: string[]) => { seen.push(a); return { success: true, data, duration: 1 }; },
      getWorkingDirectory: () => os.tmpdir(),
      setWorkingDirectory: () => {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new FafToolHandler(stub as any);
    const text = firstText((await handler.callTool('faf_sync', {})) as ToolText);
    expect(text).toContain('Would update 2 field(s). Pass apply: true to write them.');
    expect(text).toContain('• project.name: old-name → new-name');
    expect(text).toContain('• stack.frontend: (empty) → React');
    expect(text).not.toContain('"changesDetected"');
    expect(seen[0]).toEqual([]); // no apply → no --auto
  });

  test('faf_sync keeps the JSON fallback when there is no change list', async () => {
    const data = { success: true, changesDetected: 0, changesApplied: 0, message: 'project.faf file is up to date' };
    const stub = {
      callEngine: async () => ({ success: true, data, duration: 1 }),
      getWorkingDirectory: () => os.tmpdir(),
      setWorkingDirectory: () => {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new FafToolHandler(stub as any);
    const text = firstText((await handler.callTool('faf_sync', {})) as ToolText);
    expect(text).toContain('"message": "project.faf file is up to date"');
  });

  test('faf_sync round trip: a renamed package.json shows up as a named field, and nothing is written', async () => {
    const dir = tmp({
      'project.faf': PARTIAL_FAF,
      'package.json': JSON.stringify({ name: 'tool-truth-renamed', version: '0.0.1' }),
    });
    const before = fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');
    const res = await call('faf_sync', { path: dir });
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    expect(text).toContain('• project.name: tool-truth-fixture → tool-truth-renamed');
    expect(text).toContain('apply: true');
    expect(text).not.toContain('--auto');
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(before);
  });

  // ── [#5/#29/#48] faf_guide ───────────────────────────────────────────────
  test('faf_guide teaches MCP tools, not CLI commands, and carries no personal path', async () => {
    const text = firstText(await call('faf_guide'));
    for (const name of ['faf_init', 'faf_auto', 'faf_score', 'faf_go', 'faf_sync', 'faf_claude']) expect(text).toContain(`\`${name}\``);
    expect(text).toContain('apply: true');
    expect(text).toContain('all: true');
    expect(text).toContain('~/Projects/my-app/');
    expect(text).not.toContain('/Users/wolfejam');
    expect(text).not.toContain('faf init new');
    expect(text).not.toContain('faf quick');
    expect(text).not.toContain('Extensions');
    expect(text).not.toMatch(/bi-directional/i);
  });

  // ── [#6/#38] faf_dna ─────────────────────────────────────────────────────
  test('faf_dna is not read-only: it says it creates .faf-dna and records milestones', () => {
    const t = tool('faf_dna');
    expect(t.annotations?.readOnlyHint).toBe(false);
    expect(t.annotations?.destructiveHint).toBe(false);
    expect(t.description).toContain('.faf-dna');
    expect(t.description).toMatch(/milestone/);
  });

  // ── [#7] faf_context ─────────────────────────────────────────────────────
  test('faf_context does not promise that faf_read / faf_write resolve against it', async () => {
    const t = tool('faf_context');
    expect(t.description).not.toContain('later faf_ calls resolve against');
    expect(t.description).toContain('faf_read');
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    const text = firstText(await call('faf_context', { path: dir }));
    expect(text).not.toContain('Subsequent faf_* calls will use this context');
    expect(text).toContain('faf_read / faf_write');
  });

  // ── [#8] faf_clear ───────────────────────────────────────────────────────
  test('faf_clear describes the one file it removes', () => {
    const t = tool('faf_clear');
    expect(t.description).toContain('technical-credit.json');
    expect(t.description).not.toContain('persists nothing');
    expect(t.description).not.toMatch(/Remove the ~\/\.faf-cli-cache directory/);
  });

  // ── [#10] faf_auto description ───────────────────────────────────────────
  test('faf_auto no longer claims a sync step or a complete project.faf', () => {
    const d = tool('faf_auto').description ?? '';
    expect(d).toContain('init or merge, stack detection, CLAUDE.md, and score');
    expect(d).toContain('faf_go closes the human slots');
    expect(d).not.toMatch(/\bsync\b/);
    expect(d).not.toMatch(/complete/);
  });

  // ── [#11] faf_quick ──────────────────────────────────────────────────────
  test('faf_quick writes only the language it was given, plus faf_version, and passes faf_trust', async () => {
    const dir = tmp();
    const res = await call('faf_quick', { path: dir, input: 'py-api, REST API for data' });
    expect(res.isError).toBeFalsy();
    const written = YAML.parse(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8'));
    expect(written.faf_version).toBe('3.0');
    expect(written.project.main_language).toBeUndefined();
    expect(written.generated).toBeUndefined(); // banned word, and faf-cli's own init writes no such key
    expect(firstText(res)).not.toContain('TypeScript');

    // faf_quick set the context; faf_trust checks that project.
    const trust = await call('faf_trust');
    expect(firstText(trust)).not.toContain('Missing required field: faf_version');
    expect(trust.isError).toBeFalsy();

    const given = tmp();
    await call('faf_quick', { path: given, input: 'go-cli, developer productivity tool, Go' });
    expect(YAML.parse(fs.readFileSync(path.join(given, 'project.faf'), 'utf-8')).project.main_language).toBe('Go');
  });

  test('faf_quick usage says the rest is optional, not auto-detected', async () => {
    const text = firstText(await call('faf_quick', { path: tmp() }));
    expect(text).toContain('Rest is optional.');
    expect(text).not.toContain('auto-detected');
  });

  // ── [#12] destructiveHint ────────────────────────────────────────────────
  test('faf_write, faf_conductor and faf_git are marked destructive', () => {
    for (const name of ['faf_write', 'faf_conductor', 'faf_git']) {
      expect(tool(name).annotations?.destructiveHint).toBe(true);
    }
  });

  // ── faf_git force ────────────────────────────────────────────────────────
  test('faf_git declares force and passes --force as the last engine arg only when asked', async () => {
    expect(tool('faf_git').inputSchema.properties?.force?.description).toContain('faf_git refuses');
    const seen: string[][] = [];
    const stub = {
      callEngine: async (_c: string, a: string[]) => { seen.push(a); return { success: true, data: { message: 'ok' }, duration: 1 }; },
      getWorkingDirectory: () => os.tmpdir(),
      setWorkingDirectory: () => {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new FafToolHandler(stub as any);
    const dir = tmp();
    await handler.callTool('faf_git', { url: 'owner/repo', path: dir, force: true });
    await handler.callTool('faf_git', { url: 'owner/repo', path: dir });
    await handler.callTool('faf_git', { url: 'owner/repo', force: true });
    expect(seen[0].length).toBe(3);
    expect(seen[0][0]).toBe('owner/repo');
    expect(seen[0][2]).toBe('--force');
    expect(seen[1]).not.toContain('--force');
    expect(seen[1].length).toBe(2);
    expect(seen[2]).toEqual(['owner/repo', '--force']);
  });

  // ── [#15/#43] faf_about ──────────────────────────────────────────────────
  test('faf_about says portable, not universal', async () => {
    const text = firstText(await call('faf_about'));
    expect(text).toContain('Just like JPEG makes images portable,');
    expect(text).not.toMatch(/universal/i);
  });

  // ── [#16] CLI pointers + force prop ──────────────────────────────────────
  test('faf_what points at MCP tools, not a PATH `faf`', async () => {
    const text = firstText(await call('faf_what'));
    expect(text).toContain('Run faf_init or faf_auto on any project');
    expect(text).not.toContain("Run 'faf'");
  });

  test('faf_score details no longer points at the CLI', async () => {
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    const text = firstText(await call('faf_score', { path: dir, details: true }));
    expect(text).toContain('Tip:');
    expect(text).not.toContain('(CLI)');
    expect(text).not.toContain('\x1b'); // the strip regex once missed the ESC byte
  });

  test('interop force says it updates the faf-managed block; conductor keeps overwrite', () => {
    for (const name of ['faf_agents', 'faf_cursor', 'faf_gemini']) {
      const d = tool(name).inputSchema.properties?.force?.description ?? '';
      expect(d).toBe('Update the faf-managed block in an existing file (content outside it is preserved)');
    }
    expect(tool('faf_conductor').inputSchema.properties?.force?.description).toContain('overwrite');
  });

  // ── [#9/#39] merge prop ──────────────────────────────────────────────────
  test('interop merge says it writes into project.faf, and that import alone writes nothing', () => {
    for (const name of ['faf_agents', 'faf_cursor', 'faf_gemini', 'faf_conductor']) {
      const d = tool(name).inputSchema.properties?.merge?.description ?? '';
      expect(d).toBe('Write the imported data into project.faf (without it, import only reports the section count and writes nothing)');
      expect(d).not.toContain('instead of replacing');
    }
  });

  // ── [#17] faf_go ─────────────────────────────────────────────────────────
  test('faf_go instructions name no host-specific tool', async () => {
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    const body = JSON.parse(firstText(await call('faf_go', { path: dir })));
    expect(body.needsInput).toBe(true);
    expect(body.instructions).toBe('Ask the user these questions, then call faf_go again with the answers parameter.');
    expect(toolsSrc).not.toContain('AskUserQuestion');
  });

  // ── [#18] faf_debug ──────────────────────────────────────────────────────
  test('faf_debug checks write access without writing a probe file', async () => {
    expect(handlerBody('handleFafDebug')).not.toMatch(/writeFileSync|unlinkSync|\.claude-faf-test/);
    expect(handlerBody('handleFafDebug')).toContain('accessSync');

    // A directory named like the old probe file made the write probe fail
    // (EISDIR) and report a writable folder as not writable.
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    fs.mkdirSync(path.join(dir, '.claude-faf-test'));
    await call('faf_context', { path: dir });
    const text = firstText(await call('faf_debug'));
    expect(text).toContain('Write Permissions: ✅ writable');
    expect(fs.readdirSync(dir).sort()).toEqual(['.claude-faf-test', 'project.faf']);
  });

  // ── [#19] titles + roots ─────────────────────────────────────────────────
  test('faf_read / faf_write / faf_list titles and roots say what the tools do', () => {
    expect(tool('faf_read').annotations?.title).toBe('Read Project File');
    expect(tool('faf_write').annotations?.title).toBe('Write Project File');
    expect(tool('faf_list').annotations?.title).toBe('List Directories');
    for (const name of ['faf_read', 'faf_write']) {
      expect(tool(name).description).toContain('(cwd, the OS temp dir, or FAF_ALLOWED_ROOTS)');
    }
  });

  // ── [#20] faf_formats ────────────────────────────────────────────────────
  test('faf_formats shows no second score, and its JSON names the priority sum for what it is', async () => {
    expect(tool('faf_formats').description).toContain("faf-cli's slot-fill hints");
    expect(tool('faf_formats').description).not.toContain('stack slots to fill');
    const dir = tmp({
      'package.json': JSON.stringify({ name: 't', devDependencies: { typescript: '^5' } }),
      'tsconfig.json': '{}',
      'index.ts': 'export const x = 1\n',
    });
    const text = firstText(await call('faf_formats', { path: dir }));
    expect(text).toContain('Stack Signature');
    expect(text).not.toContain('Intelligence Score');
    const json = JSON.parse(firstText(await call('faf_formats', { path: dir, json: true })));
    expect(typeof json.formatPriorityTotal).toBe('number');
    expect(json.formatPriorityTotal).toBeGreaterThan(0);
    expect(json).not.toHaveProperty('totalIntelligenceScore');
    expect(Array.isArray(json.discoveredFormats)).toBe(true);
  });

  // ── [#21] faf_doctor description ─────────────────────────────────────────
  test('faf_doctor describes a checklist with slot counts, not a prioritized list of weak slots', () => {
    const d = tool('faf_doctor').description ?? '';
    expect(d).toContain('populated/active slot counts');
    expect(d).toContain('Returns a checklist.');
    expect(d).not.toContain('prioritized');
    expect(d).not.toContain('empty or weak slots');
  });

  // ── [#22] faf_claude ─────────────────────────────────────────────────────
  test('faf_claude prints the message and the files written, not the raw result object', async () => {
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    const res = await call('faf_claude', { path: dir, agents: true });
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    const real = cli.scoreFafYaml(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).score;
    expect(text).toContain(`FAF Score: ${real}%`);
    expect(text).toContain('• CLAUDE.md');
    expect(text).toContain('• AGENTS.md');
    expect(text).not.toContain('"filesChanged"');
    expect(text).not.toContain('"direction"');
    expect(text).not.toContain('"conflicts"');
  });

  // ── [#23] faf_trust ──────────────────────────────────────────────────────
  test('faf_trust claims only what the validator checked', async () => {
    expect(tool('faf_trust').description).toBe(
      "Validate a project.faf's required fields (faf_version, project.name) and about.* block with faf-cli's validator, and report its real score.",
    );
    const dir = tmp({ 'project.faf': PARTIAL_FAF });
    await call('faf_context', { path: dir });
    const text = firstText(await call('faf_trust'));
    expect(text).toContain('✅ Required fields present (faf_version, project.name) — no validation errors.');
    expect(text).not.toContain('Structurally sound');
  });

  // ── [#24/#44] car talk + the 70% target ──────────────────────────────────
  test('faf_auto headers carry no car talk', async () => {
    const dir = tmp({ 'package.json': JSON.stringify({ name: 'auto-header', version: '0.0.1' }) });
    const text = firstText(await call('faf_auto', { path: dir }));
    expect(text.startsWith('⚡️ FAF AUTO\n')).toBe(true);
    expect(text).not.toMatch(/CHAMPIONSHIP/i);
    expect(text).not.toContain('🏎️');
    expect(handlerBody('handleFafAuto')).toContain('⚡️ FAF Auto:');
    expect(handlerBody('handleFafAuto')).not.toContain('🏎️');
  });

  test('faf_doctor sets the target at 100% and calls a clean run healthy, not championship-ready', async () => {
    const mid = tmp({ 'project.faf': MID_FAF, 'CLAUDE.md': '# c\n', 'package.json': '{"name":"doctor-mid"}' });
    const warn = firstText(await call('faf_doctor', { path: mid }));
    expect(warn).toContain('Score could be better');
    expect(warn).toContain('Run faf_go — the target is 100%');
    expect(warn).not.toContain('Target 70%');

    const full = tmp({ 'project.faf': FULL_FAF, 'CLAUDE.md': '# c\n', 'package.json': '{"name":"doctor-full"}' });
    const ok = firstText(await call('faf_doctor', { path: full }));
    expect(ok).toContain('✅ Perfect health — no issues found.');
    expect(ok).not.toMatch(/championship/i);
  });
});
