/**
 * 🏁 WJTTC — injectFafBlock: line-anchored, fence-aware marker search
 *
 * BRAKE tier. Before this, injectFafBlock located the managed block with
 * plain indexOf(start)/indexOf(end) — a substring search. Two real triggers:
 *
 *   1. faf-cli 7.1.4–7.11.0 authored an AGENTS.md whose blockquote quotes the
 *      marker tokens in prose ("Hand content outside `<!-- faf:start -->` …
 *      `<!-- faf:end -->` is preserved."). indexOf(end) hit that quote, so the
 *      old block was cut at the quote and its stale tail (Setup & build …
 *      a second Guardrails, a second end marker) survived below the new block
 *      on every re-run. Never self-healed.
 *   2. A user documenting the marker syntax in a code fence above the block
 *      got the same corruption, or lost prose between the fence and the block.
 *
 * Markers now match as whole lines only, outside fenced code, so neither
 * prose nor a fence can be mistaken for the block. Each case runs the
 * injection twice and asserts the second run is byte-identical.
 */
import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

// 3.0: faf-mcp no longer carries its own injector — it composes faf-cli's
// (7.12.0+), which has the same whole-line rule. This suite now guards the
// dependency's behaviour as seen through the bridge.
const FAF_START = '<!-- faf:start -->';
const FAF_END = '<!-- faf:end -->';
let injectFafBlock: (p: string, block: string, start?: string, end?: string) => void;
let findFafBlock: (text: string, start?: string, end?: string) => { start: number; end: number } | null;
beforeAll(async () => { ({ injectFafBlock, findFafBlock } = await fafCli); });

const BLOCK_V1 = '# AGENTS.md — demo\n\nfaf-mcp render v1\n\n## Guardrails\n\n- **Always OK:** read the tree.';
const BLOCK_V2 = '# AGENTS.md — demo\n\nfaf-mcp render v2\n\n## Guardrails\n\n- **Always OK:** read the tree · run the tests.';

// Shape of a real faf-cli 7.11.0 `faf export --agents` file: real markers on
// their own lines, the prose decoy on line 9, hand content below the block.
const FAF_CLI_SHAPED = [
  '<!-- faf:start -->',
  '<!-- faf: demo | TypeScript | mcp | Demo. -->',
  '<!-- faf: claim=project.faf | family=FAF -->',
  '',
  '# AGENTS.md — demo',
  '',
  'Demo. — TypeScript · type: mcp · v1.0.0',
  '',
  '> Authored by faf — do not edit the managed block; refresh with `faf export --agents`. Hand content outside `<!-- faf:start -->` … `<!-- faf:end -->` is preserved.',
  '',
  '## Setup & build',
  '',
  '```bash',
  'npm ci    # install',
  '```',
  '',
  '## Guardrails',
  '',
  '- **Always OK:** read the tree.',
  '',
  '## Definition of Done',
  '',
  'Done when: `npm test` passes.',
  '<!-- faf:end -->',
  '',
  '## HAND-WRITTEN — MUST SURVIVE',
  '',
  'user-below-sentinel',
  '',
].join('\n');

const count = (s: string, needle: string): number => s.split(needle).length - 1;
const wholeLines = (s: string, marker: string): number =>
  s.split('\n').filter(l => l.trim() === marker).length;

describe('🏁 WJTTC — injectFafBlock line-anchored markers', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-inject-'));
    file = path.join(dir, 'AGENTS.md');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  async function twice(block1: string, block2: string, start?: string, end?: string): Promise<[string, string]> {
    await injectFafBlock(file, block1, start, end);
    const first = fs.readFileSync(file, 'utf-8');
    await injectFafBlock(file, block2, start, end);
    const second = fs.readFileSync(file, 'utf-8');
    return [first, second];
  }

  test('findFafBlock ignores marker text inside prose and inside fences', () => {
    const prose = 'The block sits between `<!-- faf:start -->` and `<!-- faf:end -->`.\n';
    expect(findFafBlock(prose)).toBeNull();
    // A fenced example ABOVE a real block is skipped (first pass) — see the
    // fence cases below. With NO real block in the file at all, the fence-blind
    // second pass does match the example: that is the pre-existing behavior and
    // the price of never missing a real block behind a fence the toggle misreads.
    const fencedAboveReal = '```\n<!-- faf:start -->\nexample\n<!-- faf:end -->\n```\n\n<!-- faf:start -->\nbody\n<!-- faf:end -->\n';
    const fb = findFafBlock(fencedAboveReal);
    expect(fencedAboveReal.slice(fb!.start, fb!.end)).toBe('<!-- faf:start -->\nbody\n<!-- faf:end -->');
    const indented = '    <!-- faf:start -->\n    <!-- faf:end -->\n';
    expect(findFafBlock(indented)).toBeNull(); // indented = code block, not a marker
    const real = 'above\n<!-- faf:start -->\nbody\n<!-- faf:end -->\nbelow\n';
    const b = findFafBlock(real);
    expect(b).not.toBeNull();
    expect(real.slice(b!.start, b!.end)).toBe('<!-- faf:start -->\nbody\n<!-- faf:end -->');
  });

  test('BRAKE: a faf-cli 7.11.0-authored AGENTS.md is replaced in place, not stacked (item 1)', async () => {
    fs.writeFileSync(file, FAF_CLI_SHAPED);
    expect(count(FAF_CLI_SHAPED, FAF_END)).toBe(2); // real + prose decoy
    const [first, second] = await twice(BLOCK_V1, BLOCK_V2);
    expect(wholeLines(first, FAF_START)).toBe(1);
    expect(wholeLines(first, FAF_END)).toBe(1);
    expect(first).not.toContain('## Setup & build'); // old faf-cli tail is gone
    expect(count(first, '## Guardrails')).toBe(1);
    expect(first).toContain('user-below-sentinel'); // hand content survives
    expect(first.startsWith(FAF_START + '\n')).toBe(true);
    expect(second).toContain('faf-mcp render v2');
    expect(second).not.toContain('faf-mcp render v1');
    expect(second.split('\n').length).toBe(first.split('\n').length); // no growth
  });

  test('BRAKE: decoy markers on their own lines inside a fence ABOVE the block are skipped (item 20)', async () => {
    const seeded = [
      '# Onboarding',
      '',
      'The managed block looks like this:',
      '',
      '```md',
      '<!-- faf:start -->',
      '…',
      '<!-- faf:end -->',
      '```',
      '',
      'user-above-sentinel',
      '',
      '<!-- faf:start -->',
      'old body',
      '<!-- faf:end -->',
      '',
      'user-below-sentinel',
      '',
    ].join('\n');
    fs.writeFileSync(file, seeded);
    const [first, second] = await twice(BLOCK_V1, BLOCK_V1);
    expect(first).toContain('```md\n<!-- faf:start -->\n…\n<!-- faf:end -->\n```'); // fence intact
    expect(first).toContain('user-above-sentinel');
    expect(first).toContain('user-below-sentinel');
    expect(first).not.toContain('old body');
    expect(count(first, 'faf-mcp render v1')).toBe(1);
    expect(second).toBe(first);
  });

  test('BRAKE: a lone start marker quoted mid-sentence above the block no longer deletes prose', async () => {
    const seeded = 'Intro mentions <!-- faf:start --> inline.\n\nuser-above-sentinel\n\n<!-- faf:start -->\nold body\n<!-- faf:end -->\n\nuser-below-sentinel\n';
    fs.writeFileSync(file, seeded);
    const [first, second] = await twice(BLOCK_V1, BLOCK_V1);
    expect(first).toContain('Intro mentions <!-- faf:start --> inline.');
    expect(first).toContain('user-above-sentinel');
    expect(first).toContain('user-below-sentinel');
    expect(first).not.toContain('old body');
    expect(second).toBe(first);
  });

  test('CRLF files and marker lines with trailing whitespace still match', async () => {
    fs.writeFileSync(file, 'above\r\n<!-- faf:start -->  \r\nold body\r\n<!-- faf:end -->\r\nbelow\r\n');
    const [first, second] = await twice(BLOCK_V1, BLOCK_V1);
    expect(first.startsWith('above\r\n' + FAF_START + '\n')).toBe(true);
    expect(first).toContain('\n' + FAF_END + '\r\nbelow\r\n'); // the end line keeps its own CRLF
    expect(first).not.toContain('old body');
    expect(second).toBe(first);
  });

  test('.cursorrules hash markers use the same whole-line rule', async () => {
    const rules = path.join(dir, '.cursorrules');
    fs.writeFileSync(rules, '# notes: markers are # faf:start / # faf:end\n\n# faf:start\nold\n# faf:end\n\nkeep-me\n');
    await injectFafBlock(rules, 'new', '# faf:start', '# faf:end');
    const out = fs.readFileSync(rules, 'utf-8');
    expect(out).toContain('# notes: markers are # faf:start / # faf:end');
    expect(out).toContain('keep-me');
    expect(out).not.toContain('\nold\n');
    expect(wholeLines(out, '# faf:start')).toBe(1);
    expect(wholeLines(out, '# faf:end')).toBe(1);
  });

  test('BRAKE: an unclosed fence pasted INSIDE the block cannot hide the end marker (no wipe)', async () => {
    const seeded = 'user-above-sentinel\n\n<!-- faf:start -->\nold body\n```bash\nnpm test\n<!-- faf:end -->\n\nuser-below-sentinel\n';
    fs.writeFileSync(file, seeded);
    const [first, second] = await twice(BLOCK_V1, BLOCK_V1);
    expect(first).toContain('user-above-sentinel');
    expect(first).toContain('user-below-sentinel');
    expect(first).not.toContain('old body');
    expect(wholeLines(first, FAF_START)).toBe(1);
    expect(wholeLines(first, FAF_END)).toBe(1);
    expect(second).toBe(first);
  });

  test('BRAKE: fence shapes the toggle misreads above the block still resolve to the real block', async () => {
    const shapes = [
      '- ```bash\n  npm i\n  ```\n',            // list-item fence: opener not seen, closer toggles
      '````md\n```\n````\n',                    // 4-backtick fence around a 3-backtick line
      '```\n~~~\n```\n',                        // tilde inside backtick fence
      '```bash\nnpm test\n',                    // unclosed fence above
      '    <!-- faf:start -->\n    <!-- faf:end -->\n', // indented code block quoting both markers
    ];
    for (const shape of shapes) {
      const seeded = `user-above-sentinel\n\n${shape}\n<!-- faf:start -->\nold body\n<!-- faf:end -->\n\nuser-below-sentinel\n`;
      fs.writeFileSync(file, seeded);
      const [first, second] = await twice(BLOCK_V1, BLOCK_V1);
      expect(first).toContain('user-above-sentinel');
      expect(first).toContain('user-below-sentinel');
      expect(first).not.toContain('old body');
      expect(count(first, 'faf-mcp render v1')).toBe(1);
      expect(second).toBe(first);
    }
  });

  test('CR-only line endings and a leading BOM are handled without loss', async () => {
    fs.writeFileSync(file, 'above\r<!-- faf:start -->\rold body\r<!-- faf:end -->\rbelow\r');
    const [cr1, cr2] = await twice(BLOCK_V1, BLOCK_V1);
    expect(cr1.startsWith('above\r' + FAF_START + '\n')).toBe(true);
    expect(cr1).toContain(FAF_END + '\rbelow\r');
    expect(cr1).not.toContain('old body');
    expect(cr2).toBe(cr1);

    fs.writeFileSync(file, '﻿<!-- faf:start -->\nold body\n<!-- faf:end -->\n\nuser-below-sentinel\n');
    const [bom1, bom2] = await twice(BLOCK_V1, BLOCK_V1);
    expect(bom1.charCodeAt(0)).toBe(0xfeff);
    expect(bom1).toContain('user-below-sentinel');
    expect(bom1).not.toContain('old body');
    expect(bom2).toBe(bom1);
  });

  test('BRAKE: a truncated block (start line, no end line) is never treated as legacy output — nothing is overwritten', async () => {
    const seeded = '<!-- faf:start -->\nold body with no end marker\n\n## User content BELOW truncated block\n\nuser-below-sentinel\n';
    fs.writeFileSync(file, seeded);
    await injectFafBlock(file, BLOCK_V1);
    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain('user-below-sentinel');
    expect(out).toContain('old body with no end marker'); // preserved, not wiped
    expect(out.startsWith(FAF_START + '\n' + BLOCK_V1)).toBe(true); // prefixed
  });

  test('.cursorrules: a comment line that merely begins with the hash marker text is not a marker', async () => {
    const rules = path.join(dir, '.cursorrules');
    fs.writeFileSync(rules, '# faf:start of the section\nuser-above-sentinel\n\n# faf:start\nold\n# faf:end\n\nkeep-me\n');
    await injectFafBlock(rules, 'new', '# faf:start', '# faf:end');
    const out = fs.readFileSync(rules, 'utf-8');
    expect(out.startsWith('# faf:start of the section\nuser-above-sentinel\n')).toBe(true);
    expect(out).toContain('keep-me');
    expect(out).not.toContain('\nold\n');
  });

  test('unchanged: user file without markers is prefixed and preserved; legacy metastamp file is reclaimed', async () => {
    fs.writeFileSync(file, '# Hand-written\n\nkeep-me\n');
    await injectFafBlock(file, BLOCK_V1);
    const user = fs.readFileSync(file, 'utf-8');
    expect(user.startsWith(FAF_START + '\n')).toBe(true);
    expect(user.endsWith('\n\n# Hand-written\n\nkeep-me\n')).toBe(true);

    fs.writeFileSync(file, '<!-- faf: demo | TypeScript -->\n# old legacy output\n');
    await injectFafBlock(file, BLOCK_V1);
    const legacy = fs.readFileSync(file, 'utf-8');
    expect(legacy).toBe(`${FAF_START}\n${BLOCK_V1}\n${FAF_END}\n`);
  });
});
