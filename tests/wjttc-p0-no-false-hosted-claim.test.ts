/**
 * 🏁 WJTTC — P0 no false hosted-endpoint claim (faf-mcp 3.0)
 *
 * README.md, project.faf, CLAUDE.md, AGENTS.md, and docs/index.html all
 * claimed a "Hosted MCP endpoint: https://ide.faf.one/mcp/v1". Verified
 * live: that URL does not serve faf-mcp — it serves grok-faf-mcp's RAG/
 * soul/Collections tool surface (get_soul, faf_memory,
 * faf_collections_search, etc.), zero faf_init/faf_auto/faf_cursor/
 * faf_agents tools. A dev following faf-mcp's own README never sees
 * faf-mcp's actual tools. This asserts the claim is gone from the whole
 * repo, not just README.md — a grep-level regression guard, cheap to run
 * on every commit.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FILES = ['README.md', 'project.faf', 'CLAUDE.md', 'AGENTS.md', 'docs/index.html'];

describe('🏁 WJTTC — P0 no false hosted-endpoint claim', () => {
  for (const rel of FILES) {
    test(`${rel} does not claim ide.faf.one/mcp/v1 serves faf-mcp`, () => {
      const p = path.join(ROOT, rel);
      const content = fs.readFileSync(p, 'utf-8');
      expect(content).not.toContain('ide.faf.one/mcp/v1');
    });
  }

  test('README.md no longer advertises a "Hosted" mcpaas.live door for faf-mcp', () => {
    const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    expect(content).not.toMatch(/\*\*Hosted MCP endpoint/);
  });

  test('docs/index.html no longer promises a zero-install hosted URL', () => {
    const content = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf-8');
    expect(content).not.toContain('One URL. Any AI. Zero install.');
  });
});
