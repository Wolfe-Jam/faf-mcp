/**
 * 🏁 WJTTC — P0 no false claim on any shipped surface (faf-mcp 3.0)
 *
 * README.md, project.faf, CLAUDE.md and docs/index.html once claimed a
 * "Hosted MCP endpoint" (a URL that serves a different product), then a
 * "Deploy to Vercel · your own instance" door (vercel.json is a redirect),
 * then an MCPaaS landing page ("Zero Install", "300+ locations", "32 tools"),
 * five faf_cloud_* tools that were never registered, and a Streamable HTTP +
 * Cloudflare-edge stack. faf-mcp runs locally over stdio.
 *
 * This is the grep-level guard for the whole class: every surface a user can
 * read, one banned-phrase list, plus the two numbers that rot — the docs
 * version badge and the tool counts — checked against package.json and the
 * live tools/list.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';

const ROOT = path.resolve(__dirname, '..');
const SURFACES = [
  'README.md', 'project.faf', 'CLAUDE.md', 'AGENTS.md',
  'docs/index.html', 'docs/style-source.html',
  'skills/faf-ide/SKILL.md', 'server.json', 'package.json',
];
// CHANGELOG history is a receipt; only the current (Unreleased / top) entry is a live claim.
const changelogCurrent = (): string => {
  const c = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf-8');
  const first = c.indexOf('\n## ['); const second = c.indexOf('\n## [', first + 1);
  return second === -1 ? c.slice(first) : c.slice(first, second);
};
const BANNED = [
  'ide.faf.one/mcp/v1', 'Hosted MCP endpoint', 'vercel.com/new', 'Two Ways to Deploy', 'Deploy to Vercel',
  'MCP as a Service', 'Zero Install', '300+', 'Streamable HTTP', 'Cloudflare edge', 'faf_cloud_',
  'Zig-WASM', 'CLI fallback', 'faf_enhance', 'npm install -g faf-cli',
];

describe('🏁 WJTTC — P0 no false claim on any shipped surface', () => {
  for (const rel of SURFACES) {
    test(`${rel} carries no retired hosted / cloud / transport claim`, () => {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
      const hits = BANNED.filter(b => content.includes(b));
      expect(hits).toEqual([]);
    });
  }

  test('the current CHANGELOG entry carries no retired claim (history may)', () => {
    const hits = BANNED.filter(b => changelogCurrent().includes(b) && !['Streamable HTTP', 'Cloudflare edge', 'faf_cloud_', 'faf_enhance', 'Deploy to Vercel', 'Hosted MCP endpoint'].includes(b));
    // The entry names what was removed; it may quote those phrases as removed. It must not
    // itself promise a hosted URL, a Vercel door, or the MCPaaS copy.
    expect(hits).toEqual([]);
  });

  test('docs/index.html version badge equals package.json (the number that rots first)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')).version as string;
    const html = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf-8');
    const badge = html.match(/id="versionBadge"[^>]*>[^<]*v(\d+\.\d+\.\d+)/);
    expect(badge?.[1]).toBe(pkg);
  });

  test('every tool-count claim equals the live tools/list (default and all)', async () => {
    const prev = process.env.FAF_TOOLS;
    delete process.env.FAF_TOOLS;
    const h = new FafToolHandler(new FafEngineAdapter('native'));
    const dflt = (await h.listTools()).tools.length;
    process.env.FAF_TOOLS = 'all';
    const all = (await h.listTools()).tools.length;
    if (prev === undefined) delete process.env.FAF_TOOLS; else process.env.FAF_TOOLS = prev;

    const claims: Array<[string, RegExp]> = [
      ['README.md', /## (\d+) MCP Tools/],
      ['README.md', /\*\*Core tier:\*\* (\d+) essential tools shown by default/],
      ['README.md', /for the full \*\*(\d+)\*\*/],
      ['project.faf', /(\d+) MCP tools \((\d+) essential shown by default\)/],
      ['CLAUDE.md', /(\d+) MCP tools \((\d+) essential shown by default\)/],
      ['docs/index.html', /<div class="stat-value">(\d+)<\/div>\s*<div class="stat-label">MCP Tools/],
      ['docs/index.html', /<div class="stat-value">(\d+)<\/div>\s*<div class="stat-label">Shown by default/],
      ['docs/index.html', /content="[^"]*?(\d+) tools/],
    ];
    const expectedFor = (re: RegExp): number => /default/.test(re.source) && !/MCP Tools/.test(re.source) ? dflt : all;
    for (const [rel, re] of claims) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
      const m = content.match(re);
      expect(m, `${rel} should carry the claim ${re}`).not.toBeNull();
      if (m!.length > 2) { expect(parseInt(m![1], 10)).toBe(all); expect(parseInt(m![2], 10)).toBe(dflt); }
      else expect(parseInt(m![1], 10)).toBe(expectedFor(re));
    }
  });
});
