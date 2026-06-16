/**
 * Tool-Count Single-Source Gate
 * ------------------------------
 * The ONE truth for "how many tools does faf-mcp expose" is the runtime
 * `listTools()` result — nothing else. This test reads that number and refuses
 * if any human/AI-facing surface advertises a different count.
 *
 * Why this exists: tool-count drifted across README / CLAUDE.md / project.faf /
 * package.json (25 vs 31 vs "36 advanced") because the number was hand-typed in
 * N places and "enforced" by a prose checklist that gets skimmed. This makes it
 * mechanical — it can't be skipped, and it can't be skimmed. (Same design as
 * Doc Gate 101.)
 *
 * If you intentionally change the tool set, this test fails until every surface
 * is updated to the new runtime count. That failure is the gate working.
 */
import { test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FafToolHandler } from '../src/handlers/tools';

const ROOT = join(import.meta.dir, '..');

/** Single source of truth: what the server actually serves at runtime. */
async function runtimeToolCount(): Promise<number> {
  const mockAdapter = {
    getWorkingDirectory: () => process.cwd(),
    setWorkingDirectory: () => {},
    getEngine: () => ({}),
  } as unknown as ConstructorParameters<typeof FafToolHandler>[0];
  const handler = new FafToolHandler(mockAdapter);
  const { tools } = await handler.listTools();
  return tools.length;
}

// Prose surfaces — scanned line by line.
const TEXT_SURFACES = ['README.md', 'CLAUDE.md', 'project.faf'];
// JSON surfaces — only the `description` field ships a count (npm + registry).
const JSON_SURFACES = ['package.json', 'server.json'];
// A line naming a SIBLING package quotes THAT package's count, not ours.
const SIBLING = /claude-faf-mcp|grok-faf-mcp|gemini-faf-mcp|faf-cli/i;
// "31 tools", "31 MCP tools", "31 .faf context tools", "36 advanced tools" …
const COUNT_RE = /(\d+)(?:\s+[A-Za-z.\-]+){0,2}\s+(?:MCP\s+)?tools?\b/gi;

function scan(label: string, text: string, truth: number, drift: string[]): void {
  text.split('\n').forEach((line, i) => {
    if (SIBLING.test(line)) return; // sibling-package count, not ours
    for (const m of line.matchAll(COUNT_RE)) {
      const n = Number(m[1]);
      if (n !== truth) drift.push(`  ${label}:${i + 1} claims ${n} → "${line.trim()}"`);
    }
  });
}

test('tool-count: every surface matches runtime listTools()', async () => {
  const truth = await runtimeToolCount();
  expect(truth).toBeGreaterThan(0);

  const drift: string[] = [];
  for (const file of TEXT_SURFACES) {
    scan(file, readFileSync(join(ROOT, file), 'utf8'), truth, drift);
  }
  for (const file of JSON_SURFACES) {
    try {
      const desc = (JSON.parse(readFileSync(join(ROOT, file), 'utf8')).description as string) ?? '';
      scan(`${file}#description`, desc, truth, drift);
    } catch {
      /* surface absent — skip */
    }
  }

  if (drift.length) {
    throw new Error(
      `\nTool-count drift — runtime listTools() exposes ${truth}, but surfaces disagree:\n` +
        drift.join('\n') +
        `\n\nSingle source of truth is listTools(). ` +
        `Set every count above to ${truth} (or change the tool set, then update the surfaces).\n`,
    );
  }
  expect(drift.length).toBe(0);
});
