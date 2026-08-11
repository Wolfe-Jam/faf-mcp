/**
 * J1 Agent Skills over MCP (product — faf-mcp stdio).
 *
 * Extension id: io.modelcontextprotocol/skills
 * Wire: skills/list · skills/get · resources/read(skill://…) with sha256 digests.
 * Pattern aligned with mcp-better / rust-faf-mcp J1; TS SDK handlers (not rmcp).
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { RequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const SKILLS_EXTENSION_ID = 'io.modelcontextprotocol/skills';
export const FAF_IDE_SKILL_NAME = 'faf-ide';
export const FAF_IDE_SKILL_URI = 'skill://faf-ide/SKILL.md';

export interface SkillResource {
  uri: string;
  digest: string;
  text: string;
  bytes: Buffer;
}

export interface SkillEntry {
  uri: string;
  frontmatter: Record<string, string>;
  resources: SkillResource[];
}

export const SkillsListRequestSchema = RequestSchema.extend({
  method: z.literal('skills/list'),
});

export const SkillsGetRequestSchema = RequestSchema.extend({
  method: z.literal('skills/get'),
  params: z.object({
    uri: z.string(),
  }),
});

export const SkillsListResultSchema = z.object({
  skills: z.array(z.unknown()),
});

export const SkillsGetResultSchema = z.object({
  uri: z.string(),
  frontmatter: z.record(z.string(), z.string()),
  resources: z.array(
    z.object({
      uri: z.string(),
      digest: z.string(),
    })
  ),
});

function hexSha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseFrontmatter(md: string): { frontmatter: Record<string, string>; body: string } {
  const cleaned = md.replace(/^\uFEFF/, '');
  if (!cleaned.startsWith('---')) {
    throw new Error('missing opening frontmatter ---');
  }
  const rest = cleaned.slice(3).replace(/^\n/, '');
  const end = rest.indexOf('\n---');
  if (end < 0) {
    throw new Error('missing closing frontmatter ---');
  }
  const yaml = rest.slice(0, end);
  const body = rest.slice(end + 4).replace(/^\n/, '');
  const frontmatter: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 0) {
      throw new Error(`bad frontmatter line: ${trimmed}`);
    }
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    frontmatter[key] = value;
  }
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error('frontmatter requires name and description');
  }
  return { frontmatter, body };
}

function resolveSkillMarkdownPath(): string {
  // dist/src/handlers → ../../../skills/…
  // src/handlers (ts-node/tests) → ../../skills/…
  // cwd fallback for odd layouts
  const candidates = [
    join(__dirname, '..', '..', '..', 'skills', 'faf-ide', 'SKILL.md'),
    join(__dirname, '..', '..', 'skills', 'faf-ide', 'SKILL.md'),
    join(process.cwd(), 'skills', 'faf-ide', 'SKILL.md'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `faf-ide SKILL.md not found (tried ${candidates.join(', ')}). ` +
      'Ensure skills/faf-ide/SKILL.md ships in the npm package files list.'
  );
}

function loadSkillFromMarkdown(md: string): SkillEntry {
  const { frontmatter } = parseFrontmatter(md);
  const name = frontmatter.name;
  const uri = `skill://${name}/SKILL.md`;
  const bytes = Buffer.from(md, 'utf8');
  const digest = `sha256:${hexSha256(bytes)}`;
  return {
    uri,
    frontmatter,
    resources: [
      {
        uri,
        digest,
        text: md,
        bytes,
      },
    ],
  };
}

function skillEntryJson(entry: SkillEntry) {
  return {
    uri: entry.uri,
    frontmatter: entry.frontmatter,
    resources: entry.resources.map((r) => ({
      uri: r.uri,
      digest: r.digest,
    })),
  };
}

export class SkillCatalog {
  private skills = new Map<string, SkillEntry>();

  static loadFafIde(): SkillCatalog {
    const path = resolveSkillMarkdownPath();
    const md = readFileSync(path, 'utf8');
    const entry = loadSkillFromMarkdown(md);

    if (entry.frontmatter.name !== FAF_IDE_SKILL_NAME) {
      throw new Error(`frontmatter name must be ${FAF_IDE_SKILL_NAME}`);
    }
    if (entry.uri !== FAF_IDE_SKILL_URI) {
      throw new Error(`skill URI must be ${FAF_IDE_SKILL_URI}, got ${entry.uri}`);
    }

    const cat = new SkillCatalog();
    cat.skills.set(entry.uri, entry);
    return cat;
  }

  listEntries(): ReturnType<typeof skillEntryJson>[] {
    return [...this.skills.values()].map(skillEntryJson);
  }

  getByUri(uri: string): ReturnType<typeof skillEntryJson> | undefined {
    const entry = this.skills.get(uri);
    return entry ? skillEntryJson(entry) : undefined;
  }

  findResource(uri: string): SkillResource | undefined {
    for (const skill of this.skills.values()) {
      const hit = skill.resources.find((r) => r.uri === uri);
      if (hit) return hit;
    }
    return undefined;
  }

  listResourcesMeta(): Resource[] {
    const out: Resource[] = [];
    for (const skill of this.skills.values()) {
      for (const r of skill.resources) {
        const name = r.uri.split('/').pop() ?? 'SKILL.md';
        out.push({
          uri: r.uri,
          name,
          description: 'Agent Skill document (FAF IDE product context)',
          mimeType: 'text/markdown',
        });
      }
    }
    return out;
  }
}

/** package root helper used by path resolution tests */
export function skillPackageRootCandidates(): string[] {
  return [
    dirname(join(__dirname, '..', '..', '..', 'package.json')),
    dirname(join(__dirname, '..', '..', 'package.json')),
    process.cwd(),
  ];
}
