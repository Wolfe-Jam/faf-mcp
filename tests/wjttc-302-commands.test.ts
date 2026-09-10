/**
 * 🏁 WJTTC — command truth (faf-mcp 3.0.2 checker list, group G2)
 *
 * BRAKE tier. The bundled interop commands must say what they did, and do
 * only what they say:
 *
 *   faf_git       — reports faf-cli's score of the bytes it authored (one
 *                   scorer), writes `authored_by`, and never replaces an
 *                   existing project.faf without force
 *   faf_sync      — a dry run lists the fields it would change and names the
 *                   `apply` parameter, not a CLI flag
 *   *_import      — without merge nothing is written and the message says so;
 *                   merge with nothing to merge into fails loudly
 *   conductor     — export reads the spec slots a project.faf carries
 *   faf_claude    — no bi-sync leftovers (`conflicts`) in the result
 *   no-faf errors — name the MCP tool (faf_init), not the CLI
 *   cli.ts        — stdout stays the JSON-RPC stream
 *
 * GitHub is mocked (globalThis.fetch) so faf_git runs offline and
 * deterministically. Every write goes to mkdtemp dirs under os.tmpdir().
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fafCli as fafCliPromise } from '../src/utils/faf-cli-bridge.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { gitContextCommand } from '../src/faf-core/commands/git-context.js';
import { syncFafFile } from '../src/faf-core/commands/sync.js';
import { claudeExportCommand } from '../src/faf-core/commands/claude.js';
import { agentsImportCommand, agentsExportCommand } from '../src/faf-core/commands/agents.js';
import { cursorImportCommand, cursorExportCommand } from '../src/faf-core/commands/cursor.js';
import { geminiImportCommand, geminiExportCommand } from '../src/faf-core/commands/gemini.js';
import { conductorImportCommand, conductorExportCommand } from '../src/faf-core/commands/conductor.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';

const dirs: string[] = [];
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `wjttc-302-${prefix}-`));
  dirs.push(d);
  return d;
}
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

const SAMPLE_FAF = `faf_version: "3.0"
project:
  name: command-truth-fixture
  goal: Fixture for the command truth suite.
  main_language: TypeScript
  type: cli
stack:
  runtime: Node.js
human_context:
  who: maintainers
  what: a fixture
`;

// ---------------------------------------------------------------------------
// GitHub mock — the handful of endpoints github-extractor calls
// ---------------------------------------------------------------------------
const GH = 'https://api.github.com/repos/acme/demo';
const README = [
  '# demo',
  '',
  'A tiny demo service that answers health checks for the test suite.',
  '',
  '## Install',
  '',
  'npm install demo',
  '',
].join('\n');
const PKG = JSON.stringify({ name: 'demo', version: '1.0.0', dependencies: { express: '^4.0.0' } });
const b64 = (s: string): string => Buffer.from(s, 'utf-8').toString('base64');

function mockGitHub(): { calls: string[]; restore: () => void } {
  const real = globalThis.fetch;
  const calls: string[] = [];
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fake = async (input: unknown): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    calls.push(url);
    if (url === GH) {
      return json({
        description: 'A tiny demo service',
        topics: [],
        stargazers_count: 3,
        forks_count: 0,
        license: { spdx_id: 'MIT' },
        default_branch: 'main',
        languages_url: `${GH}/languages`,
      });
    }
    if (url === `${GH}/languages`) return json({ TypeScript: 900, JavaScript: 100 });
    if (url.startsWith(`${GH}/contents/README.md`)) return json({ content: b64(README), encoding: 'base64' });
    if (url.startsWith(`${GH}/contents/package.json`)) return json({ content: b64(PKG), encoding: 'base64' });
    if (url.startsWith(`${GH}/contents/?`)) return json([{ path: 'README.md', type: 'file', size: 64, html_url: '' }]);
    return json({ message: 'Not Found' }, 404);
  };
  globalThis.fetch = fake as unknown as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = real; } };
}

// ---------------------------------------------------------------------------
// faf_git
// ---------------------------------------------------------------------------
describe('🏁 faf_git — one scorer, no silent overwrite', () => {
  let gh: ReturnType<typeof mockGitHub>;
  beforeEach(() => { gh = mockGitHub(); });
  afterEach(() => gh.restore());

  test('the reported score is faf-cli scoreFafYaml of the authored bytes', async () => {
    const { scoreFafYaml } = await fafCliPromise;
    const r = await gitContextCommand('acme/demo');
    expect(r.success).toBe(true);
    const s = scoreFafYaml(r.data!.fafContent);
    expect(r.data!.score).toBe(s.score);
    expect(r.data!.tier).toBe(s.tier.name);
    expect(r.message).toContain(`Score: ${s.score}% (${s.tier.name})`);
  });

  test('the authored file uses the .faf spec slots faf-cli scores (goal, main_language, human_context)', async () => {
    const { parse } = await import('yaml');
    const r = await gitContextCommand('acme/demo');
    const doc = parse(r.data!.fafContent);
    expect(doc.project.goal).toBe('A tiny demo service');
    expect(doc.project.main_language).toBe('TypeScript');
    expect(doc.project.description).toBeUndefined();
    expect(doc.project.language).toBeUndefined();
    expect(typeof doc.human_context).toBe('object');
    expect(doc.human_context.what).toBeTruthy();
    expect(doc.context).toBeUndefined();
  });

  test('the authored file carries authored_by, not generated_by', async () => {
    const r = await gitContextCommand('acme/demo');
    expect(r.data!.fafContent).toMatch(/^authored_by:/m);
    expect(r.data!.fafContent).not.toContain('generated_by');
  });

  test('refuses to replace an existing project.faf without force — writes nothing, fetches nothing', async () => {
    const dir = tmp('git');
    const original = 'faf_version: "3.0"\nproject:\n  name: keep-me\n';
    fs.writeFileSync(path.join(dir, 'project.faf'), original);

    const r = await gitContextCommand('acme/demo', dir);
    expect(r.success).toBe(false);
    expect(r.message).toBe(`project.faf already exists at ${dir}. Pass force: true to overwrite.`);
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(original);
    expect(gh.calls).toEqual([]);
  });

  test('force: true replaces it with the authored bytes', async () => {
    const dir = tmp('git');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'project:\n  name: keep-me\n');

    const r = await gitContextCommand('acme/demo', dir, { force: true });
    expect(r.success).toBe(true);
    const written = fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');
    expect(written).toBe(r.data!.fafContent);
    expect(written).toContain('name: demo');
  });

  test('writes into a directory with no project.faf without needing force', async () => {
    const dir = tmp('git');
    const r = await gitContextCommand('acme/demo', dir);
    expect(r.success).toBe(true);
    expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(true);
  });

  test('adapter: url and output dir come from pathArgs — --force is a flag, never the output dir', async () => {
    const adapter = new FafEngineAdapter('native');
    const dir = tmp('git-adapter');
    const original = 'project:\n  name: keep-me\n';
    fs.writeFileSync(path.join(dir, 'project.faf'), original);

    const refused = await adapter.callEngine('git', ['acme/demo', dir]);
    expect(refused.success).toBe(false);
    expect(refused.error).toContain('already exists');
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(original);

    const forced = await adapter.callEngine('git', ['acme/demo', dir, '--force']);
    expect(forced.success).toBe(true);
    expect(forced.data.data.filePath).toBe(path.join(dir, 'project.faf'));
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).not.toBe(original);

    // No path given: a lone '--force' must not become the output directory.
    const preview = await adapter.callEngine('git', ['acme/demo', '--force']);
    expect(preview.success).toBe(true);
    expect(preview.data.data.filePath).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// faf_sync
// ---------------------------------------------------------------------------
function syncFixture(): string {
  const dir = tmp('sync');
  fs.writeFileSync(
    path.join(dir, 'project.faf'),
    'faf_version: "3.0"\nproject:\n  name: old-name\n  goal: Old goal\n',
  );
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'new-name', description: 'New goal', dependencies: { react: '^18.0.0' } }),
  );
  return dir;
}

describe('🏁 faf_sync — a dry run lists the fields and names the apply parameter', () => {
  test('dry run returns changes [{ path, oldValue, newValue }] and writes nothing', async () => {
    const dir = syncFixture();
    const before = fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');

    const r = await syncFafFile(dir, { json: true });
    expect(r.success).toBe(true);
    expect(r.changesDetected).toBe(3);
    expect(r.changesApplied).toBe(0);
    expect(r.changes).toEqual([
      { path: 'project.name', oldValue: 'old-name', newValue: 'new-name' },
      { path: 'project.goal', oldValue: 'Old goal', newValue: 'New goal' },
      { path: 'stack.frontend', oldValue: '', newValue: 'React' },
    ]);
    expect(r.message).toBe('Would update 3 field(s). Pass apply: true to write them.');
    expect(r.message).not.toContain('--auto');
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(before);
  });

  test('dry run lists each field once, with the value apply will write (last detected wins)', async () => {
    const dir = tmp('sync-dupes');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: dupes\n');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'dupes', dependencies: { react: '^18', vue: '^3', svelte: '^4' } }));
    const r = await syncFafFile(dir, { json: true });
    const paths = (r.changes ?? []).map((c: { path: string }) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(r.message).toBe(`Would update ${paths.length} field(s). Pass apply: true to write them.`);
    const promised = (r.changes ?? []).find((c: { path: string }) => c.path === 'stack.frontend')?.newValue;
    await syncFafFile(dir, { json: true, auto: true });
    const { parse } = await import('yaml');
    expect(parse(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).stack?.frontend).toBe(promised);
  });

  test('the apply path is unchanged: auto writes every change', async () => {
    const dir = syncFixture();
    const r = await syncFafFile(dir, { auto: true, json: true });
    expect(r.success).toBe(true);
    expect(r.changesApplied).toBe(3);
    expect(r.message).toBe('Applied 3 changes to project.faf');
    const after = fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');
    expect(after).toContain('new-name');
    expect(after).toContain('React');
  });
});

// ---------------------------------------------------------------------------
// import commands (agents / cursor / gemini / conductor)
// ---------------------------------------------------------------------------
interface ImportCase {
  label: string;
  tool: string;
  seed: (dir: string) => void;
  run: (dir: string, opts?: { merge?: boolean }) => Promise<{ success: boolean; message: string }>;
}

const IMPORTS: ImportCase[] = [
  {
    label: 'AGENTS.md',
    tool: 'faf_agents',
    seed: (d) => fs.writeFileSync(path.join(d, 'AGENTS.md'), '# demo\n\n## Rules\n\n- Keep it small\n\n## Code Style\n\n- Two spaces\n'),
    run: agentsImportCommand,
  },
  {
    label: '.cursorrules',
    tool: 'faf_cursor',
    seed: (d) => fs.writeFileSync(path.join(d, '.cursorrules'), '# demo\n\n## Rules\n\n- Keep it small\n'),
    run: cursorImportCommand,
  },
  {
    label: 'GEMINI.md',
    tool: 'faf_gemini',
    seed: (d) => fs.writeFileSync(path.join(d, 'GEMINI.md'), '# demo\n\n## Rules\n\n- Keep it small\n'),
    run: geminiImportCommand,
  },
  {
    label: 'conductor/',
    tool: 'faf_conductor',
    seed: (d) => {
      fs.mkdirSync(path.join(d, 'conductor'));
      fs.writeFileSync(path.join(d, 'conductor', 'product.md'), '# demo\n\nA demo product.\n\n## Goals\n\n- Ship it\n');
    },
    run: conductorImportCommand,
  },
];

describe('🏁 import — no merge writes nothing and says so; merge with nothing to merge into fails', () => {
  for (const c of IMPORTS) {
    test(`${c.label}: without merge the message says nothing was written, and project.faf is byte-identical`, async () => {
      const dir = tmp('import');
      c.seed(dir);
      fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);

      const r = await c.run(dir);
      expect(r.success).toBe(true);
      expect(r.message).toStartWith(`Parsed ${c.label} (`);
      expect(r.message).toEndWith('— nothing written; pass merge: true to write it into project.faf');
      expect(r.message).not.toContain('Imported');
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(SAMPLE_FAF);
    });

    test(`${c.label}: merge: true with no project.faf is a failure, not an "Imported" no-op`, async () => {
      const dir = tmp('import-nofaf');
      c.seed(dir);

      const r = await c.run(dir, { merge: true });
      expect(r.success).toBe(false);
      expect(r.message).toBe('No project.faf to merge into — run faf_init first');
      expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(false);
    });

    test(`${c.label}: merge: true over an unreadable project.faf reports the merge failure`, async () => {
      const dir = tmp('import-badfaf');
      c.seed(dir);
      const broken = 'project: [unclosed\n';
      fs.writeFileSync(path.join(dir, 'project.faf'), broken);

      const r = await c.run(dir, { merge: true });
      expect(r.success).toBe(false);
      expect(r.message).toStartWith(`Could not merge ${c.label} into project.faf:`);
      expect(r.message).not.toMatch(/\x1b\[/); // parse errors are data, not terminal output
      expect(r.message).not.toContain('faf init'); // name the MCP tool, never the CLI
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(broken);
    });

    test(`${c.label}: merge: true into a real project.faf still merges`, async () => {
      const dir = tmp('import-merge');
      c.seed(dir);
      fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);

      const r = await c.run(dir, { merge: true });
      expect(r.success).toBe(true);
      expect(r.message).toStartWith(`Merged ${c.label} into existing .faf`);
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).not.toBe(SAMPLE_FAF);
    });
  }
});

// ---------------------------------------------------------------------------
// conductor export
// ---------------------------------------------------------------------------
describe('🏁 faf_conductor export — reads the spec slots a project.faf carries', () => {
  test('languages / frameworks / databases / infrastructure / goals come from spec slots; slotignored is dropped', async () => {
    const dir = tmp('conductor-export');
    fs.writeFileSync(path.join(dir, 'project.faf'), [
      'faf_version: "3.0"',
      'project:',
      '  name: spec-shaped',
      '  goal: Ship the spec-shaped fixture',
      '  main_language: TypeScript',
      'stack:',
      '  frontend: React',
      '  backend: Express',
      '  database: PostgreSQL',
      '  hosting: Vercel',
      '  cicd: slotignored',
      '',
    ].join('\n'));

    const r = await conductorExportCommand(dir);
    expect(r.success).toBe(true);
    const tech = fs.readFileSync(path.join(dir, 'conductor', 'tech-stack.md'), 'utf-8');
    expect(tech).toContain('## Languages\n- TypeScript\n');
    expect(tech).toContain('## Frameworks\n- React\n- Express\n');
    expect(tech).toContain('## Databases\n- PostgreSQL\n');
    expect(tech).toContain('## Infrastructure\n- Vercel\n');
    expect(tech).not.toContain('slotignored');
    const product = fs.readFileSync(path.join(dir, 'conductor', 'product.md'), 'utf-8');
    expect(product).toContain('## Goals\n- Ship the spec-shaped fixture\n');
  });

  test('legacy list fields still export when the spec slots are absent', async () => {
    const dir = tmp('conductor-legacy');
    fs.writeFileSync(path.join(dir, 'project.faf'), [
      'project:',
      '  name: legacy-shaped',
      '  goals:',
      '    - Legacy goal',
      'stack:',
      '  languages:',
      '    - Go',
      '  infrastructure:',
      '    - Fly.io',
      '',
    ].join('\n'));

    const r = await conductorExportCommand(dir);
    expect(r.success).toBe(true);
    const tech = fs.readFileSync(path.join(dir, 'conductor', 'tech-stack.md'), 'utf-8');
    expect(tech).toContain('## Languages\n- Go\n');
    expect(tech).toContain('## Infrastructure\n- Fly.io\n');
    const product = fs.readFileSync(path.join(dir, 'conductor', 'product.md'), 'utf-8');
    expect(product).toContain('## Goals\n- Legacy goal\n');
  });
});

// ---------------------------------------------------------------------------
// small truths: faf_init wording, no conflicts, stdout
// ---------------------------------------------------------------------------
describe('🏁 command wording and result shape', () => {
  test('no-project.faf messages name the faf_init tool, not the CLI', async () => {
    const empty = tmp('noinit');
    const messages = [
      (await syncFafFile(empty)).message,
      (await claudeExportCommand(empty)).message,
      (await agentsExportCommand(empty)).message,
      (await cursorExportCommand(empty)).message,
      (await geminiExportCommand(empty)).message,
      (await conductorExportCommand(empty)).message,
    ];
    for (const m of messages) {
      expect(m).toContain('Run faf_init first.');
      expect(m).not.toContain('faf init');
    }
  });

  test('export refusals say force updates the faf-managed block (what it really does), not overwrite', async () => {
    for (const [run, file] of [[agentsExportCommand, 'AGENTS.md'], [cursorExportCommand, '.cursorrules'], [geminiExportCommand, 'GEMINI.md']] as const) {
      const dir = tmp('export-refuse');
      fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: refuse\n');
      fs.writeFileSync(path.join(dir, file), '# mine\n');
      const r = await (run as any)(dir, {});
      expect(r.success).toBe(false);
      expect(r.message).toBe(`${file} already exists. Pass force: true to update its faf-managed block (content outside it is kept).`);
      expect(fs.readFileSync(path.join(dir, file), 'utf-8')).toBe('# mine\n');
    }
  });

  test('claudeExportCommand result carries no bi-sync leftover `conflicts`', async () => {
    const dir = tmp('claude');
    fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);
    const r = await claudeExportCommand(dir);
    expect(r.success).toBe(true);
    expect('conflicts' in r).toBe(false);
  });

  test('stdio entry writes its banner to stderr — stdout is the JSON-RPC stream', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'cli.ts'), 'utf-8');
    expect(src).not.toMatch(/console\.log\(/);
    expect(src).toContain("console.error('FAF MCP Server started in stdio mode')");
  });
});

// ---------------------------------------------------------------------------
// MCP round trip — what an agent actually reads
// ---------------------------------------------------------------------------
describe('🏁 MCP round trip — tool text tells the truth', () => {
  let client: Client;
  let server: FafMcpServer;
  const prevTools = process.env.FAF_TOOLS;

  beforeAll(async () => {
    process.env.FAF_TOOLS = 'all';
    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-302-commands', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    if (prevTools === undefined) delete process.env.FAF_TOOLS; else process.env.FAF_TOOLS = prevTools;
  });

  test('faf_git with path over an existing project.faf is refused and the file is untouched', async () => {
    const gh = mockGitHub();
    try {
      const dir = tmp('mcp-git');
      const original = 'faf_version: "3.0"\nproject:\n  name: keep-me\n';
      fs.writeFileSync(path.join(dir, 'project.faf'), original);

      const r = (await client.callTool({ name: 'faf_git', arguments: { url: 'acme/demo', path: dir } })) as ToolText;
      expect(r.isError).toBe(true);
      expect(firstText(r)).toContain('already exists');
      expect(firstText(r)).toContain('Pass force: true to overwrite.');
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(original);
    } finally {
      gh.restore();
    }
  });

  test('faf_git preview reports the same score faf-cli gives the authored bytes', async () => {
    const gh = mockGitHub();
    try {
      const { scoreFafYaml } = await fafCliPromise;
      const expected = scoreFafYaml((await gitContextCommand('acme/demo')).data!.fafContent);

      const r = (await client.callTool({ name: 'faf_git', arguments: { url: 'acme/demo' } })) as ToolText;
      expect(r.isError).toBeFalsy();
      expect(firstText(r)).toContain(`Score: ${expected.score}% (${expected.tier.name})`);
    } finally {
      gh.restore();
    }
  });

  test('faf_sync dry run names the apply parameter and the fields, never a CLI flag', async () => {
    const dir = syncFixture();
    const r = (await client.callTool({ name: 'faf_sync', arguments: { path: dir } })) as ToolText;
    const text = firstText(r);
    expect(text).toContain('Pass apply: true to write them.');
    expect(text).toContain('project.name');
    expect(text).not.toContain('--auto');
  });

  test('faf_agents import without merge says nothing was written (and writes nothing)', async () => {
    const dir = tmp('mcp-agents');
    IMPORTS[0].seed(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);

    const r = (await client.callTool({ name: 'faf_agents', arguments: { action: 'import', path: dir } })) as ToolText;
    expect(r.isError).toBeFalsy();
    expect(firstText(r)).toContain('nothing written; pass merge: true to write it into project.faf');
    expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toBe(SAMPLE_FAF);
  });

  test('faf_agents import with merge but no project.faf is an error', async () => {
    const dir = tmp('mcp-agents-nofaf');
    IMPORTS[0].seed(dir);

    const r = (await client.callTool({ name: 'faf_agents', arguments: { action: 'import', merge: true, path: dir } })) as ToolText;
    expect(r.isError).toBe(true);
    expect(firstText(r)).toContain('No project.faf to merge into — run faf_init first');
  });

  test('faf_claude output carries no `conflicts` field', async () => {
    const dir = tmp('mcp-claude');
    fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);

    const r = (await client.callTool({ name: 'faf_claude', arguments: { path: dir } })) as ToolText;
    expect(r.isError).toBeFalsy();
    expect(firstText(r)).not.toContain('conflicts');
  });
});
