/**
 * 🏁 WJTTC — P0 resource URI rename (faf-mcp 3.0)
 *
 * src/handlers/resources.ts's two MCP resources were `claude-faf://context`
 * / `claude-faf://status` — an identity leftover from before this became
 * the generic Cursor/IDE edition (no Claude-specific behavior lives behind
 * either). Renamed to `faf://context` / `faf://status` (primary, listed
 * first); the old `claude-faf://` URIs stay registered as an alias for one
 * release so an existing client pointed at them doesn't break.
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
  '  name: uri-rename-fixture',
  '  goal: P0 resource URI rename regression fixture.',
  '  main_language: TypeScript',
  '',
].join('\n');

describe('🏁 WJTTC — P0 resource URI rename (faf:// primary, claude-faf:// aliased)', () => {
  let client: Client;
  let server: FafMcpServer;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-p0-uri-'));
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), SAMPLE_FAF);

    server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-p0-uri', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
    await client.callTool({ name: 'faf_score', arguments: { path: tmpDir } });
  });

  afterAll(async () => {
    await client.close();
    await server.getServer().close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('listResources lists faf:// primary, before the claude-faf:// alias', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);

    expect(uris).toContain('faf://context');
    expect(uris).toContain('faf://status');
    expect(uris).toContain('claude-faf://context');
    expect(uris).toContain('claude-faf://status');

    expect(uris.indexOf('faf://context')).toBeLessThan(uris.indexOf('claude-faf://context'));
    expect(uris.indexOf('faf://status')).toBeLessThan(uris.indexOf('claude-faf://status'));
  });

  test('faf://status and claude-faf://status both resolve, identically', async () => {
    const primary = await client.readResource({ uri: 'faf://status' });
    const alias = await client.readResource({ uri: 'claude-faf://status' });

    const primaryText = primary.contents?.[0]?.text as string;
    const aliasText = alias.contents?.[0]?.text as string;

    expect(primaryText).toBeTruthy();
    expect(primaryText).toBe(aliasText);
    // Each echoes its own requested URI back, not a hardcoded one.
    expect(primary.contents?.[0]?.uri).toBe('faf://status');
    expect(alias.contents?.[0]?.uri).toBe('claude-faf://status');
  });

  test('faf://context and claude-faf://context both resolve, identically', async () => {
    const primary = await client.readResource({ uri: 'faf://context' });
    const alias = await client.readResource({ uri: 'claude-faf://context' });

    const primaryText = primary.contents?.[0]?.text as string;
    const aliasText = alias.contents?.[0]?.text as string;

    expect(primaryText).toBe(aliasText);
    const parsed = JSON.parse(primaryText);
    expect(parsed.data?.project?.name).toBe('uri-rename-fixture');
    expect(primary.contents?.[0]?.uri).toBe('faf://context');
    expect(alias.contents?.[0]?.uri).toBe('claude-faf://context');
  });
});
