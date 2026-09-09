/**
 * 🏁 WJTTC — tool schema truth (faf-mcp 3.0, audit cluster 3)
 *
 * BRAKE tier. Every property a tool declares in tools/list must be read by
 * the handler that serves it, and every description must describe what the
 * handler does. The 3.0 audit found four contracts that lied:
 *
 *   faf_bi_sync  — advertised auto / watch / force; none was ever read
 *   faf_clear    — advertised todos / backups; no such stores exist
 *   faf_sync     — said it syncs CLAUDE.md; it reconciles project.faf with
 *                  package.json/git and never touches CLAUDE.md
 *   faf_debug    — reported whatever `which faf` found and advertised a
 *                  faf_enhance tool that does not exist
 *
 * The first test is the general guard: it parses the dispatch table in
 * tools.ts, slices each handler's body, and checks every declared property
 * name appears in that body. The rest pin the four repaired contracts via a
 * real tools/list -> callTool round trip.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';

const SAMPLE_FAF = `faf_version: "3.0"
project:
  name: schema-truth-fixture
  goal: Fixture for the tool schema truth suite.
  main_language: TypeScript
  type: cli
stack:
  runtime: Node.js
  build: tsc
human_context:
  who: maintainers
  what: a fixture
`;

describe('🏁 WJTTC — tool schema truth', () => {
  let client: Client;
  let server: FafMcpServer;
  let tmpDir: string;
  let tools: Array<{ name: string; description?: string; inputSchema: { properties?: Record<string, unknown> } }>;
  const prevTools = process.env.FAF_TOOLS;

  beforeAll(async () => {
    process.env.FAF_TOOLS = 'all'; // audit the whole surface, not just the Core tier
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-schema-truth-'));
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), SAMPLE_FAF);
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'schema-truth-fixture', version: '0.0.1', description: 'Fixture for the tool schema truth suite.' }));

    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-schema-truth', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    tools = (await client.listTools()).tools as typeof tools;
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevTools === undefined) delete process.env.FAF_TOOLS; else process.env.FAF_TOOLS = prevTools;
  });

  test('every declared inputSchema property is read by the handler that serves the tool', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');
    const fileHandlerSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'fileHandler.ts'), 'utf-8');
    // Dispatch table: case 'faf_x': return await this.handleFoo(args)
    //             or: case 'faf_x': return await fileHandlers.faf_x(args)
    const dispatch = new Map<string, string>();
    for (const m of src.matchAll(/case '(faf_[a-z_]+)':(?:\s*\{)?\s*(?:\/\/[^\n]*\n\s*)*return (?:await )?this\.(handle\w+)\(/g)) {
      dispatch.set(m[1], m[2]);
    }
    const viaFileHandlers = new Set<string>();
    for (const m of src.matchAll(/case '(faf_[a-z_]+)':\s*return (?:await )?fileHandlers\.\1\(/g)) viaFileHandlers.add(m[1]);
    const offenders: string[] = [];
    for (const tool of tools) {
      const props = Object.keys(tool.inputSchema?.properties ?? {});
      if (!props.length) continue;
      if (viaFileHandlers.has(tool.name)) {
        for (const p of props) if (!new RegExp(`\\b${p}\\b`).test(fileHandlerSrc)) offenders.push(`${tool.name}.${p} (declared, absent from fileHandler.ts)`);
        continue;
      }
      const handler = dispatch.get(tool.name);
      if (!handler) {
        // Tools dispatched through a shared path (e.g. a block with its own
        // logic) are checked against the whole file instead of one body.
        for (const p of props) if (!new RegExp(`args\\??\\.${p}\\b|args\\??\\[['"]${p}['"]\\]|\\b${p}\\b\\s*[,}]`).test(src)) offenders.push(`${tool.name}.${p} (no handler found, absent from tools.ts)`);
        continue;
      }
      const start = src.indexOf(`private async ${handler}(`);
      expect(start).toBeGreaterThan(-1);
      const next = src.indexOf('\n  private ', start + 1);
      const body = src.slice(start, next === -1 ? undefined : next);
      for (const p of props) {
        const read = new RegExp(`args\\??\\.${p}\\b|args\\??\\[['"]${p}['"]\\]|\\{[^}]*\\b${p}\\b[^}]*\\}\\s*=\\s*args`).test(body);
        if (!read) offenders.push(`${tool.name}.${p} (declared, never read in ${handler})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every faf_* tool name mentioned in handler output text is a tool that exists', () => {
    // The audit found seven user-facing mentions of faf_enhance, retired two
    // releases earlier, and faf_init pointing users at faf_sync "to create
    // CLAUDE.md". A tool that tells you to run a tool must name a real one.
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8')
      + fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'fileHandler.ts'), 'utf-8');
    const registered = new Set(tools.map(x => x.name));
    // faf_chat: dispatched for back-compat but deliberately not advertised.
    const allow = new Set(['faf_chat']);
    const unknown = [...new Set(src.match(/\bfaf_[a-z_]+\b/g) ?? [])].filter(n => !registered.has(n) && !allow.has(n));
    expect(unknown).toEqual([]);
  });

  test('faf_bi_sync no longer promises auto / watch / force, and says which direction it writes', () => {
    const t = tools.find(x => x.name === 'faf_bi_sync')!;
    const props = Object.keys(t.inputSchema.properties ?? {});
    expect(props).not.toContain('auto');
    expect(props).not.toContain('watch');
    expect(props).not.toContain('force');
    expect(props).toEqual(expect.arrayContaining(['agents', 'cursor', 'gemini', 'all', 'path']));
    expect(t.description ?? '').not.toMatch(/bi-direction/i);
    expect(t.description ?? '').toContain('.faf → CLAUDE.md');
  });

  test('faf_clear only offers the store that exists', async () => {
    const t = tools.find(x => x.name === 'faf_clear')!;
    const props = Object.keys(t.inputSchema.properties ?? {});
    expect(props.sort()).toEqual(['all', 'cache']);
    const res = (await client.callTool({ name: 'faf_clear', arguments: {} })) as ToolText;
    expect(res.isError).toBeFalsy();
    expect(firstText(res)).toContain('cache:');
    expect(firstText(res)).not.toMatch(/todos|backups/);
  });

  test('faf_sync describes a dry-run reconcile and never touches CLAUDE.md', async () => {
    const t = tools.find(x => x.name === 'faf_sync')!;
    expect(t.description ?? '').toContain('Dry-run');
    expect(t.description ?? '').toContain('Does not touch CLAUDE.md');
    expect(Object.keys(t.inputSchema.properties ?? {}).sort()).toEqual(['apply', 'path']);

    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# hand-written\n\nkeep-me\n');
    const fafBefore = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');

    const dry = (await client.callTool({ name: 'faf_sync', arguments: { path: tmpDir } })) as ToolText;
    expect(dry.isError).toBeFalsy();
    expect(fs.readFileSync(claudePath, 'utf-8')).toBe('# hand-written\n\nkeep-me\n');
    expect(fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8')).toBe(fafBefore); // dry-run wrote nothing

    const applied = (await client.callTool({ name: 'faf_sync', arguments: { path: tmpDir, apply: true } })) as ToolText;
    expect(applied.isError).toBeFalsy();
    expect(fs.readFileSync(claudePath, 'utf-8')).toBe('# hand-written\n\nkeep-me\n'); // still untouched
  });

  test('faf_debug reports the bundled faf-cli and advertises only tools that exist', async () => {
    const res = (await client.callTool({ name: 'faf_debug', arguments: {} })) as ToolText;
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    expect(text).toMatch(/faf-cli \(bundled\): v\d+\.\d+\.\d+/);
    expect(text).not.toContain('faf_enhance');
    expect(text).not.toContain('npm install -g faf-cli');
    expect(text).not.toContain('FAF CLI Path');
    const names = new Set(tools.map(x => x.name));
    for (const mentioned of text.match(/faf_[a-z_]+/g) ?? []) expect(names.has(mentioned)).toBe(true);
  });
});
