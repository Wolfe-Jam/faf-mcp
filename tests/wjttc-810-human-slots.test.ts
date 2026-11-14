/**
 * 🏁 WJTTC: the goal and six W's are human slots (faf-cli 8.10.0)
 *
 * faf-cli 8.10.0 stopped writing the goal and the six W's: they are the user's
 * to give. faf-cli suggests them (suggestIntent: value + source) and the person
 * confirms. faf-mcp must carry that through:
 *
 *   H1  faf_init leaves them empty and says how many suggestions wait for faf_go.
 *   H2  faf_auto does the same, on a new file and on an existing one.
 *   H3  faf_go questions carry faf-cli's suggestion and its source, and tell the
 *       caller to write only what the user confirms.
 *   H4  faf_readme suggests (with sources) and writes nothing, apply or not.
 *   H5  "Gold Code" is never the name for 100%: it's Trophy.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const textOf = (r: ToolText): string => (r.content ?? []).map((c) => c.text ?? '').join('\n');

const PKG = JSON.stringify({ name: 'demo-app', version: '1.0.0', description: 'A tiny tool that turns CSV files into charts' });
const README = '# demo-app\n\nTurns CSV files into charts.\n\n## Why\n\nMaking a chart from a CSV takes too many steps.\n';

let dir: string;
let handler: FafToolHandler;
const call = async (name: string, args: Record<string, unknown>) =>
  (await handler.callTool(name, args)) as ToolText;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-810-'));
  fs.writeFileSync(path.join(dir, 'package.json'), PKG);
  fs.writeFileSync(path.join(dir, 'README.md'), README);
  handler = new FafToolHandler(new FafEngineAdapter('native'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const fafText = () => fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');
/** The value of `key:` inside `block:` in the YAML, '' when empty or absent. */
const slot = (yaml: string, block: string, key: string): string => {
  const m = yaml.match(new RegExp(`^${block}:\\n((?:[ \\t]+.*\\n?)*)`, 'm'));
  const line = m?.[1].match(new RegExp(`^[ \\t]+${key}:[ \\t]*(.*)$`, 'm'));
  return (line?.[1] ?? '').replace(/^["']|["']$/g, '').trim();
};

describe('H1 faf_init: human slots empty, suggestions announced', () => {
  test('goal and W\'s are empty; the reply counts the suggestions and names faf_go', async () => {
    const r = await call('faf_init', { path: dir });
    expect(r.isError).toBeFalsy();
    const yaml = fafText();
    expect(slot(yaml, 'project', 'goal')).toBe('');
    expect(slot(yaml, 'human_context', 'why')).toBe('');
    const text = textOf(r);
    expect(text).toMatch(/\d+ suggestions? for the goal and the six W's/);
    expect(text).toContain('faf_go');
    expect(text).not.toContain("'faf go'");
  });
});

describe('H2 faf_auto: human slots empty, suggestions announced', () => {
  test('new file', async () => {
    const r = await call('faf_auto', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(slot(fafText(), 'project', 'goal')).toBe('');
    expect(textOf(r)).toMatch(/\d+ suggestions? for the goal and the six W's/);
  });

  test('existing file: a confirmed goal is kept and not counted', async () => {
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: demo-app\n  goal: Charts from CSV for analysts\n');
    const r = await call('faf_auto', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(slot(fafText(), 'project', 'goal')).toBe('Charts from CSV for analysts');
    expect(textOf(r)).toContain('faf_go');
  });
});

describe('H3 faf_go: suggestions with sources, confirm first', () => {
  test('each empty slot carries faf-cli\'s suggestion and source', async () => {
    await call('faf_init', { path: dir });
    const r = await call('faf_go', { path: dir });
    const body = JSON.parse(textOf(r));
    const goal = body.questions.find((q: any) => q.field === 'project.goal');
    expect(goal.suggested).toBe('Turns CSV files into charts.');
    expect(goal.source).toBeTruthy();
    const why = body.questions.find((q: any) => q.field === 'human_context.why');
    expect(why.suggested).toContain('too many steps');
    expect(body.instructions).toMatch(/confirm/i);
    // A slot the repo can't suggest says so with an empty suggestion.
    for (const q of body.questions) {expect(typeof q.suggested).toBe('string');}
  });
});

describe('H4 faf_readme: suggests, never writes', () => {
  test('apply: true leaves project.faf byte for byte', async () => {
    await call('faf_init', { path: dir });
    const before = fafText();
    const r = await call('faf_readme', { path: dir, apply: true });
    expect(r.isError).toBeFalsy();
    expect(fafText()).toBe(before);
    const text = textOf(r);
    expect(text).toContain('Turns CSV files into charts.');
    expect(text).toContain('README.md');
    expect(text).toContain('faf_go');
  });

  test('a repo with no README still gets its package.json suggestion', async () => {
    fs.rmSync(path.join(dir, 'README.md'));
    await call('faf_init', { path: dir });
    const r = await call('faf_readme', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).toContain('package.json');
  });
});

describe('H5 100% is Trophy, never Gold Code', () => {
  test('no "Gold Code" in the tool source', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');
    expect(src).not.toMatch(/gold code/i);
  });
});

// ── Review of #116 (Fable 5.2): F1 faf_sync, F2 faf_go keys, F6 guards ──────

describe('H6 faf_sync never writes the goal (F1)', () => {
  test('empty goal: apply leaves it empty; the reply points at faf_go', async () => {
    await call('faf_init', { path: dir });
    const dry = textOf(await call('faf_sync', { path: dir }));
    expect(dry).not.toContain('project.goal');
    expect(dry).not.toContain('undefined');
    expect(dry).toContain('faf_go');
    await call('faf_sync', { path: dir, apply: true });
    expect(slot(fafText(), 'project', 'goal')).toBe('');
  });

  test('a confirmed goal survives apply byte for byte', async () => {
    await call('faf_init', { path: dir });
    await call('faf_go', { path: dir, answers: { 'project.goal': 'Charts from CSV for my team' } });
    await call('faf_sync', { path: dir, apply: true });
    expect(slot(fafText(), 'project', 'goal')).toBe('Charts from CSV for my team');
  });
});

describe('H7 faf_go answers: real slots, text only, all or nothing (F2)', () => {
  const refused = async (answers: unknown) => {
    await call('faf_init', { path: dir });
    const before = fafText();
    const r = await call('faf_go', { path: dir, answers });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain('Nothing was written');
    expect(fafText()).toBe(before);
    return textOf(r);
  };

  test('__proto__ is refused and nothing reaches Object.prototype', async () => {
    await refused({ '__proto__.polluted': 'yes', 'project.goal': 'ok' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // The server still answers.
    expect((await call('faf_score', { path: dir })).isError).toBeFalsy();
  });
  test('a block name, a made-up path and a number are refused', async () => {
    await refused({ human_context: 'one string' });
    await refused({ 'totally.made.up': 'x' });
    expect(await refused({ 'project.goal': 42 })).toContain('must be text');
  });
  test('a parent that holds text is refused, never replaced', async () => {
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: demo-app\nhuman_context: kept as the user wrote it\n');
    const before = fafText();
    const r = await call('faf_go', { path: dir, answers: { 'human_context.why': 'x' } });
    expect(r.isError).toBe(true);
    expect(fafText()).toBe(before);
  });
  test('answers: null is no answers: the questions come back (N1)', async () => {
    await call('faf_init', { path: dir });
    const before = fafText();
    const r = await call('faf_go', { path: dir, answers: null });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(textOf(r)).needsInput).toBe(true);
    expect(fafText()).toBe(before);
  });
  test('{} writes nothing and says so', async () => {
    await call('faf_init', { path: dir });
    const before = fafText();
    const r = await call('faf_go', { path: dir, answers: {} });
    expect(textOf(r)).toContain('nothing was written');
    expect(fafText()).toBe(before);
  });
  test('valid answers still write, a stack slot included', async () => {
    await call('faf_init', { path: dir });
    const r = await call('faf_go', { path: dir, answers: { 'project.goal': 'Charts from CSV', 'stack.database': 'SQLite' } });
    expect(r.isError).toBeFalsy();
    expect(slot(fafText(), 'project', 'goal')).toBe('Charts from CSV');
    expect(slot(fafText(), 'stack', 'database')).toBe('SQLite');
  });
});

describe('H8 faf_quick writes only what the user typed (F6)', () => {
  test('name and goal as typed, no W\'s', async () => {
    fs.rmSync(path.join(dir, 'README.md'));
    fs.rmSync(path.join(dir, 'package.json'));
    const r = await call('faf_quick', { path: dir, input: 'quickapp, books tables for a cafe, typescript' });
    expect(r.isError).toBeFalsy();
    const yaml = fafText();
    expect(slot(yaml, 'project', 'goal')).toBe('books tables for a cafe');
    for (const w of ['who', 'what', 'why', 'where', 'when', 'how']) {expect(slot(yaml, 'human_context', w)).toBe('');}
  });
});

describe('H9 a legacy file keeps its words (F6)', () => {
  const LEGACY = 'faf_version: "3.0"\nproject:\n  name: demo-app\n  goal: Filled by faf-cli 8.5.0\n  main_language: TypeScript\nhuman_context:\n  what: Legacy what\n  how: npm install demo-app\n';
  test('faf_readme and faf_go (no answers) leave it byte for byte; faf_auto keeps every value', async () => {
    fs.writeFileSync(path.join(dir, 'project.faf'), LEGACY);
    await call('faf_readme', { path: dir, apply: true });
    await call('faf_go', { path: dir });
    expect(fafText()).toBe(LEGACY);
    await call('faf_auto', { path: dir });
    const yaml = fafText();
    expect(slot(yaml, 'project', 'goal')).toBe('Filled by faf-cli 8.5.0');
    expect(slot(yaml, 'human_context', 'what')).toBe('Legacy what');
    expect(slot(yaml, 'human_context', 'how')).toBe('npm install demo-app');
  });
});
