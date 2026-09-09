/**
 * 🏁 WJTTC — engine adapter: in-process only, failures carry their reason
 *
 * BRAKE tier. faf-mcp 3.0 P2 removed the `which faf` detector, the exec
 * fallback and 22 → 7 engine branches (archive tag archive/pre-p2-dead-code).
 * The 3.0 audit had found the detector spawning an unrelated Rust binary at
 * every server start on a machine where `faf` on PATH was not faf-cli, and
 * bundled branches that returned success:false with no reason, so handlers
 * printed "❌ undefined".
 *
 *   - nothing under src/ may touch child_process again
 *   - an unknown engine command is an error, never a shell-out
 *   - a bundled command's failure message reaches the tool's text
 *   - startup with faf-cli missing fails per call, not at startup (probed
 *     manually over stdio; the bridge's rejection is handled)
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';
const SRC = path.join(__dirname, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('🏁 WJTTC — engine adapter', () => {
  let client: Client;
  let server: FafMcpServer;
  let dir: string;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-adapter-'));
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: adapter-fixture\n  goal: Adapter fixture.\n  main_language: TypeScript\n  type: cli\n');
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-adapter', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('BRAKE: nothing under src/ imports child_process — every tool is in-process', () => {
    const offenders = walk(SRC).filter(f => {
      const code = fs.readFileSync(f, 'utf-8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''); // strip comments
      return /child_process|execSync\(|spawnSync\(|\bexec\(|\bspawn\(/.test(code);
    }).map(f => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  test('an unknown engine command is a clear error, not a fallback to a CLI', async () => {
    const adapter = new FafEngineAdapter();
    const res = await adapter.callEngine('score', [dir]);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unknown engine command 'score'");
    expect(res.error).toContain('in-process');
  });

  test('a bundled command that fails reports why — never "❌ undefined"', async () => {
    const first = (await client.callTool({ name: 'faf_agents', arguments: { path: dir, action: 'export' } })) as ToolText;
    expect(first.isError).toBeFalsy();
    const second = (await client.callTool({ name: 'faf_agents', arguments: { path: dir, action: 'export' } })) as ToolText;
    expect(second.isError).toBe(true);
    expect(firstText(second)).toContain('AGENTS.md already exists');
    expect(firstText(second)).not.toContain('undefined');

    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-adapter-empty-'));
    try {
      const res = (await client.callTool({ name: 'faf_bi_sync', arguments: { path: empty } })) as ToolText;
      expect(res.isError).toBe(true);
      expect(firstText(res)).toContain('No project.faf file found');
      expect(firstText(res)).not.toContain('undefined');
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  test('the retired tool surface is really gone from the package', () => {
    for (const gone of ['handlers/championship-tools.ts', 'handlers/cloud-handler.ts', 'utils/cli-detector.ts', 'test-all-functions.ts', 'faf-core/compiler/faf-compiler.ts']) {
      expect(fs.existsSync(path.join(SRC, gone))).toBe(false);
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    expect(pkg.scripts.postinstall).toBeUndefined();
    expect(pkg.scripts.prebuild).toContain('rmSync'); // stale dist emit must not ship
    expect(pkg.files).not.toContain('.faf');
  });
});
