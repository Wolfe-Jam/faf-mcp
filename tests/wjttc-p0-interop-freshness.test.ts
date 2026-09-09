/**
 * 🏁 WJTTC — P0 interop freshness (faf-mcp 3.0)
 *
 * faf_agents / faf_cursor / faf_gemini / faf_bi_sync were vendored copies
 * frozen at faf-cli's "v4.5.0 Interop Edition" (Feb 2026) — missing
 * Guardrails (3-tier Always/Ask-first/Never), Definition of Done, When
 * Stuck, Security & secrets, branch-aware Commit & PR, a Where-things-live
 * table, and slot-registry-driven labels that faf-cli's CURRENT interop
 * (7.11.0, "The AGENTS.md Edition") has. This proves the rewired
 * agents-parser.ts/cursorrules-parser.ts/gemini-parser.ts produce the
 * current shape, not the frozen one, via a real MCP tools/list -> callTool
 * round-trip (InMemoryTransport) — not a unit call to the parser directly.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const SAMPLE_FAF = [
  'faf_version: "3.0"',
  'project:',
  '  name: interop-freshness-fixture',
  '  goal: P0 interop-freshness regression fixture.',
  '  main_language: TypeScript',
  '  type: mcp',
  '  default_branch: develop',
  'stack:',
  '  backend: Express',
  '  runtime: Node.js',
  '  cicd: GitHub Actions',
  'commands:',
  '  test: npm test',
  '  lint: npm run lint',
  '  build: npm run build',
  'key_files:',
  '  - src/index.ts — entrypoint',
  '  - README.md — human overview',
  'security:',
  '  secrets: .env.local',
  '  never:',
  '    - .env.local',
  'human_context:',
  '  who: faf-mcp maintainers',
  '',
].join('\n');

type ToolText = { content: Array<{ type: string; text?: string }>; isError?: boolean };
function firstText(res: ToolText): string {
  return (res.content?.[0]?.text ?? '') as string;
}

describe('🏁 WJTTC — P0 interop freshness (current faf-cli shape, not frozen v4.5.0)', () => {
  let client: Client;
  let server: FafMcpServer;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-interop-'));
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), SAMPLE_FAF);

    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-p0-interop', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('faf_agents produces current-shape AGENTS.md, not the frozen v4.5.0 shape', async () => {
    const res = (await client.callTool({
      name: 'faf_agents',
      arguments: { path: tmpDir, action: 'export', force: true },
    })) as ToolText;
    expect(res.isError).toBeFalsy();

    const agentsPath = path.join(tmpDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, 'utf-8');

    // Current faf-cli shape — absent in the old v4.5.0-vintage output.
    expect(content).toContain('## Guardrails');
    expect(content).toContain('## Definition of Done');
    expect(content).toContain('## When stuck');
    expect(content).toContain('## Security & secrets');
    expect(content).toContain('## Commit & PR');
    expect(content).toContain('## Where things live');
    expect(content).toContain('## Run the tests');
    expect(content).toContain('## Setup & build');

    // Branch-aware Commit & PR / Guardrails — reads project.default_branch,
    // not a hardcoded "main".
    expect(content).toContain('`develop`');
    expect(content).not.toMatch(/push straight to `main`/);

    // Security & secrets sourced from the real security block, values never
    // echoed (only the path to the secrets file, never a secret value).
    expect(content).toContain('.env.local');

    // Where-things-live renders a Path | Role table when key_files carry
    // " — role" annotations (both fixture entries do).
    expect(content).toContain('| Path | Role |');
    expect(content).toContain('| `src/index.ts` | entrypoint |');

    // Slot-registry-driven stack labels (composed via faf-cli's real
    // SLOT_BY_PATH, not a hand-picked label map).
    expect(content).toMatch(/CI\/CD/);

    // Old v4.5.0-vintage section names must be gone.
    expect(content).not.toContain('## Project Overview');
    expect(content).not.toContain('## Code Style Guidelines');
    expect(content).not.toContain('## Build and Test Commands');
  });

  test('faf_gemini produces current-shape GEMINI.md (Gemini CLI convention, not the AGENTS.md ladder)', async () => {
    const res = (await client.callTool({
      name: 'faf_gemini',
      arguments: { path: tmpDir, action: 'export', force: true },
    })) as ToolText;
    expect(res.isError).toBeFalsy();

    const geminiPath = path.join(tmpDir, 'GEMINI.md');
    const content = fs.readFileSync(geminiPath, 'utf-8');

    expect(content).toContain('# GEMINI.md — interop-freshness-fixture');
    expect(content).toContain('## Setup & build');
    expect(content).toContain('## Test & verify');
    expect(content).toContain('## Where things live');
    // Gemini's own safety-default section name — distinct from AGENTS.md's
    // "Guardrails" (a different spec for a different reader).
    expect(content).toContain('## Before changing things');

    // Old v4.5.0-vintage section names must be gone.
    expect(content).not.toContain('## General Instructions');
    expect(content).not.toContain('## Coding Style');
  });

  test('faf_cursor produces current-shape .cursorrules — deliberately minimal (richness moved to AGENTS.md)', async () => {
    const res = (await client.callTool({
      name: 'faf_cursor',
      arguments: { path: tmpDir, action: 'export', force: true },
    })) as ToolText;
    expect(res.isError).toBeFalsy();

    const cursorPath = path.join(tmpDir, '.cursorrules');
    const content = fs.readFileSync(cursorPath, 'utf-8');

    expect(content).toContain('# .cursorrules');
    expect(content).toContain('language: TypeScript');
    expect(content).toContain('# Stack');

    // Old v4.5.0-vintage elaborate sections are gone — faf-cli's own current
    // .cursorrules is deliberately thin; richness lives in AGENTS.md instead.
    expect(content).not.toContain('## Tech Stack');
    expect(content).not.toContain('## Coding Standards');
    expect(content).not.toContain('## Preferences');
  });

  test('faf_bi_sync with all:true fans out to the current-shape AGENTS.md/.cursorrules/GEMINI.md', async () => {
    const res = (await client.callTool({
      name: 'faf_bi_sync',
      arguments: { path: tmpDir, all: true, force: true },
    })) as ToolText;
    expect(res.isError).toBeFalsy();
    const text = firstText(res);
    expect(text).toContain('AGENTS.md');
    expect(text).toContain('.cursorrules');
    expect(text).toContain('GEMINI.md');

    const agentsContent = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('## Guardrails');
  });

  test('no user-facing banned voice word ("generate"/"generated"/"generator") in the AGENTS.md output', async () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(content.toLowerCase()).not.toMatch(/\bgenerat(e|ed|or)\b/);
  });
});
