/**
 * J1 Agent Skills over MCP — faf-mcp stdio product skill (faf-ide).
 * ADD-only; drives real SDK Client + in-memory transport.
 */

import { createHash } from 'crypto';
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  FAF_IDE_SKILL_URI,
  SKILLS_EXTENSION_ID,
  SkillsGetResultSchema,
  SkillsListResultSchema,
} from '../src/handlers/skills.js';

let server: FafMcpServer;
let client: Client;

beforeAll(async () => {
  server = new FafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverTransport);
  client = new Client({ name: 'j1-skills', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
});

describe('J1 skills over MCP (faf-ide)', () => {
  test('initialize advertises experimental skills extension', () => {
    const caps = client.getServerCapabilities();
    expect(caps).toBeDefined();
    expect(caps?.experimental).toBeDefined();
    expect(caps?.experimental?.[SKILLS_EXTENSION_ID]).toBeDefined();
    expect(caps?.resources).toBeDefined();
    expect(caps?.tools).toBeDefined();
  });

  test('skills/list → faf-ide + sha256 digest', async () => {
    const result = await client.request(
      { method: 'skills/list' },
      SkillsListResultSchema
    );
    expect(Array.isArray(result.skills)).toBe(true);
    expect(result.skills.length).toBe(1);
    const skill = result.skills[0] as {
      uri: string;
      frontmatter: { name: string };
      resources: Array<{ uri: string; digest: string }>;
    };
    expect(skill.uri).toBe(FAF_IDE_SKILL_URI);
    expect(skill.frontmatter.name).toBe('faf-ide');
    expect(skill.resources[0].digest.startsWith('sha256:')).toBe(true);
  });

  test('skills/get same URI', async () => {
    const got = await client.request(
      { method: 'skills/get', params: { uri: FAF_IDE_SKILL_URI } },
      SkillsGetResultSchema
    );
    expect(got.uri).toBe(FAF_IDE_SKILL_URI);
    expect(got.frontmatter.name).toBe('faf-ide');
    expect(got.resources[0].digest.startsWith('sha256:')).toBe(true);
  });

  test('resources/read body matches listed digest', async () => {
    const list = await client.request(
      { method: 'skills/list' },
      SkillsListResultSchema
    );
    const skill = list.skills[0] as {
      resources: Array<{ digest: string }>;
    };
    const digest = skill.resources[0].digest;

    const read = await client.readResource({ uri: FAF_IDE_SKILL_URI });
    expect(read.contents.length).toBeGreaterThan(0);
    const text = (read.contents[0] as { text?: string }).text ?? '';
    expect(text.includes('faf-ide')).toBe(true);
    expect(text.includes('faf_auto')).toBe(true);

    const recomputed = `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
    expect(recomputed).toBe(digest);
  });

  test('resources/list includes skill URI', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(FAF_IDE_SKILL_URI);
  });

  test('faf_about tool still works', async () => {
    const result = await client.callTool({ name: 'faf_about', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('server identity name remains faf-mcp', () => {
    const version = client.getServerVersion();
    expect(version?.name).toBe('faf-mcp');
  });
});
