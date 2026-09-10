/**
 * Non-destructive interop — regression guard for the file-wipe bug.
 * The IDE Edition syncs AGENTS.md / GEMINI.md / .cursorrules / CLAUDE.md — it must
 * ENHANCE an existing file, never replace it. Critical for .cursorrules, which IDE
 * users hand-maintain. Enhance, never replace.
 */
import { describe, test, expect } from 'bun:test';
import { mkdtempSync, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { agentsExport } from '../src/faf-core/parsers/agents-parser';
import { geminiExport } from '../src/faf-core/parsers/gemini-parser';
import { cursorExport } from '../src/faf-core/parsers/cursorrules-parser';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const DATA: any = {
  project: { name: 'Demo', goal: 'a small api', main_language: 'TypeScript' },
  human_context: { who: 'devs' },
  stack: { backend: 'Express' },
};
const MARK = '## HAND-WRITTEN — MUST SURVIVE';
// Count marker LINES (the injector's rule since faf-cli 7.12.0). Nothing faf
// writes mentions the token in prose any more; a stray substring would be a
// user's own text and must not count as a block.
const blocks = (s: string) => (s.match(/^(?:<!-- faf:start -->|# faf:start)$/gm) || []).length;
const endBlocks = (s: string) => (s.match(/^(?:<!-- faf:end -->|# faf:end)$/gm) || []).length;
function tmp(): string { return mkdtempSync(join(tmpdir(), 'faf-mcp-nd-')); }
// faf-mcp composes faf-cli's injector (no local copy since 3.0).
const injectFafBlock = async (p: string, block: string): Promise<void> => { (await fafCli).injectFafBlock(p, block); };

describe('injectFafBlock — non-destructive', () => {
  test('prefix preserves user content; markers update in place; idempotent', async () => {
    const p = join(tmp(), 'F.md');
    await fs.writeFile(p, `# Mine\n${MARK}\n`);
    await injectFafBlock(p, 'block-v1');
    expect(await fs.readFile(p, 'utf-8')).toContain(MARK);
    await injectFafBlock(p, 'block-v2');
    const out = await fs.readFile(p, 'utf-8');
    expect(out).toContain('block-v2');
    expect(out).not.toContain('block-v1');
    expect(out).toContain(MARK);
    expect(blocks(out)).toBe(1);
  });

  test('legacy faf file (metastamp, no markers) reclaimed in place — no duplication', async () => {
    const p = join(tmp(), 'F.md');
    await fs.writeFile(p, '<!-- faf: demo | TS | lib | x -->\n\n# Old\nOLD FAF BODY\n');
    await injectFafBlock(p, 'fresh');
    const out = await fs.readFile(p, 'utf-8');
    expect(out).toContain('fresh');
    expect(out).not.toContain('OLD FAF BODY');
    expect(blocks(out)).toBe(1);
  });
});

describe('export parsers — enhance, never replace', () => {
  for (const [file, exporter] of [
    ['AGENTS.md', agentsExport],
    ['GEMINI.md', geminiExport],
    ['.cursorrules', cursorExport],
  ] as const) {
    test(`${file} preserves an existing file + idempotent`, async () => {
      const p = join(tmp(), file);
      await fs.writeFile(p, `# Mine\n${MARK}\nnotes\n`);
      await exporter(DATA, p);
      let out = await fs.readFile(p, 'utf-8');
      expect(out).toContain(MARK);
      expect(blocks(out)).toBe(1);
      await exporter(DATA, p);
      await exporter(DATA, p);
      out = await fs.readFile(p, 'utf-8');
      expect(out).toContain(MARK);
      expect(blocks(out)).toBe(1);
      expect(endBlocks(out)).toBe(1); // the old bug left a second end marker in a stale tail
    });
  }
});
