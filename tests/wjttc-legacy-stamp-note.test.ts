/**
 * 🏁 WJTTC — the reply says what faf-cli's writer did (injector case 7)
 *
 * BRAKE tier. faf-mcp writes AGENTS.md, GEMINI.md, .cursorrules and CLAUDE.md
 * with faf-cli's injector, which keeps every line it can't prove it wrote. When
 * a file starts with older faf text and has no block of its own, faf's block
 * goes on top and the old text stays below it. faf-cli has a one-line note for
 * that (legacyStampNoteAt); claude-faf-mcp shows it, faf-mcp 4.1.2 did not —
 * the reply said only "Exported". And faf_claude's chained exports dropped a
 * refused file without a word (`catch {}`). Each case runs the real command
 * in a temp folder.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { agentsExportCommand } from '../src/faf-core/commands/agents.js';
import { geminiExportCommand } from '../src/faf-core/commands/gemini.js';
import { cursorExportCommand } from '../src/faf-core/commands/cursor.js';
import { claudeExportCommand } from '../src/faf-core/commands/claude.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';

const FAF = 'faf_version: "3.3"\nproject:\n  name: probe\n  goal: test the reply\n';
const HAND = 'Never deploy on Friday.';
const stamped = (marker: string) => `${marker}\n# Team rules\n${HAND}\n`;
const MD_STAMP = '<!-- faf: probe | TypeScript | an old stamp -->';

let dir: string;
beforeEach(() => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-stamp-')));
  fs.writeFileSync(path.join(dir, 'project.faf'), FAF);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('legacy stamp: the note reaches the reply, every line is kept', () => {
  const cases: Array<[string, string, (d: string) => Promise<{ success: boolean; message: string }>]> = [
    ['AGENTS.md', MD_STAMP, d => agentsExportCommand(d, { force: true })],
    ['GEMINI.md', MD_STAMP, d => geminiExportCommand(d, { force: true })],
  ];
  for (const [file, marker, run] of cases) {
    test(file, async () => {
      fs.writeFileSync(path.join(dir, file), stamped(marker));
      const r = await run(dir);
      expect(r.success).toBe(true);
      expect(r.message).toContain(`Exported project.faf to ${file}`);
      expect(r.message).toMatch(/left as you had it/);
      expect(fs.readFileSync(path.join(dir, file), 'utf-8')).toContain(HAND);
    });
  }

  test('CLAUDE.md (faf_claude)', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), stamped(MD_STAMP));
    const r = await claudeExportCommand(dir, { force: true });
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/left as you had it/);
    expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).toContain(HAND);
  });

  test('a stamped file: the note shows once, then a second run is silent', async () => {
    fs.writeFileSync(path.join(dir, 'GEMINI.md'), stamped(MD_STAMP));
    expect((await geminiExportCommand(dir, { force: true })).message).toMatch(/left as you had it/);
    expect((await geminiExportCommand(dir, { force: true })).message).not.toMatch(/left as you had it/);
  });

  test('a file faf wrote itself gets no note', async () => {
    expect((await agentsExportCommand(dir, { force: true })).message).not.toMatch(/left as you had it/);
    const again = await agentsExportCommand(dir, { force: true });
    expect(again.message).not.toMatch(/left as you had it/);
  });
});

describe('.cursorrules uses its own markers', () => {
  test('a plain hand-written file: kept, no stamp note', async () => {
    fs.writeFileSync(path.join(dir, '.cursorrules'), `# Team rules\n${HAND}\n`);
    const r = await cursorExportCommand(dir, { force: true });
    expect(r.success).toBe(true);
    expect(r.message).not.toMatch(/left as you had it/);
    expect(fs.readFileSync(path.join(dir, '.cursorrules'), 'utf-8')).toContain(HAND);
  });

  test('an old faf stamp on line 1: kept, note shown, second run silent', async () => {
    fs.writeFileSync(path.join(dir, '.cursorrules'), stamped(MD_STAMP));
    const r = await cursorExportCommand(dir, { force: true });
    expect(r.message).toMatch(/left as you had it/);
    expect(fs.readFileSync(path.join(dir, '.cursorrules'), 'utf-8')).toContain(HAND);
    expect((await cursorExportCommand(dir, { force: true })).message).not.toMatch(/left as you had it/);
  });
});

describe('links out of the project are refused (regression)', () => {
  test('AGENTS.md linked outside: refused, target untouched', async () => {
    const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-out-')));
    try {
      fs.writeFileSync(path.join(out, 't.md'), 'outside\n');
      fs.symlinkSync(path.join(out, 't.md'), path.join(dir, 'AGENTS.md'));
      await expect(agentsExportCommand(dir, { force: true })).rejects.toThrow(/is a link to .*outside .*refused/);
      expect(fs.readFileSync(path.join(out, 't.md'), 'utf-8')).toBe('outside\n');
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('faf_claude says which chained file was not written', () => {
  test('AGENTS.md not UTF-8: CLAUDE.md written, AGENTS.md named and left as it was', async () => {
    const bad = Buffer.from('# Caf\xe9\n', 'latin1');
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), bad);
    const r = await claudeExportCommand(dir, { force: true, agents: true });
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/AGENTS\.md not written: .*not UTF-8/);
    expect(fs.readFileSync(path.join(dir, 'AGENTS.md')).equals(bad)).toBe(true);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
  });
});

describe('faf_claude with every chained file stamped: one note per file', () => {
  test('CLAUDE.md, AGENTS.md, GEMINI.md, .cursorrules', async () => {
    for (const f of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.cursorrules']) {
      fs.writeFileSync(path.join(dir, f), stamped(MD_STAMP));
    }
    const r = await claudeExportCommand(dir, { force: true, all: true });
    expect(r.success).toBe(true);
    for (const f of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.cursorrules']) {
      const lines = r.message.split('\n').filter(l => l.startsWith(`${f}:`) && /left as you had it/.test(l));
      expect(lines.length).toBe(1);
      expect(fs.readFileSync(path.join(dir, f), 'utf-8')).toContain(HAND);
    }
  });

  test('GEMINI.md linked out of the project: named, target untouched', async () => {
    const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-out-')));
    try {
      fs.writeFileSync(path.join(out, 't.md'), 'outside\n');
      fs.symlinkSync(path.join(out, 't.md'), path.join(dir, 'GEMINI.md'));
      const r = await claudeExportCommand(dir, { force: true, gemini: true });
      expect(r.success).toBe(true);
      expect(r.message).toMatch(/GEMINI\.md not written: .*outside .*refused/);
      expect(fs.readFileSync(path.join(out, 't.md'), 'utf-8')).toBe('outside\n');
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('faf_auto (through the tool handler)', () => {
  const run = async () => {
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const r: any = await handler.callTool('faf_auto', { path: dir });
    return r.content.map((c: any) => c.text).join('\n');
  };

  test('a stamped CLAUDE.md: the note is a step, every line kept', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), stamped(MD_STAMP));
    expect(await run()).toMatch(/CLAUDE\.md: .*left as you had it/);
    expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).toContain(HAND);
  });

  test('no CLAUDE.md: created, no note', async () => {
    const out = await run();
    expect(out).toContain('Created CLAUDE.md');
    expect(out).not.toMatch(/left as you had it/);
  });
});

describe('boundary: a .cursorrules stamped "# faf:" (not "<!-- faf:")', () => {
  // faf-cli's legacyStampNoteAt recognises only "<!-- faf:" on line 1, so this
  // file gets no note. The lines are still kept. If faf-cli learns the "#"
  // form, this test turns red and should flip to expect the note.
  test('kept, no note today', async () => {
    fs.writeFileSync(path.join(dir, '.cursorrules'), stamped('# faf: probe | TypeScript | an old stamp'));
    const r = await cursorExportCommand(dir, { force: true });
    expect(r.success).toBe(true);
    expect(r.message).not.toMatch(/left as you had it/);
    expect(fs.readFileSync(path.join(dir, '.cursorrules'), 'utf-8')).toContain(HAND);
  });
});
