/**
 * 🏁 WJTTC — faf_write / faf_dna birth-certificate brakes
 *
 * BRAKE tier. The `.faf-dna` birth certificate is written once per project and
 * never changed, lost or reissued. The TRUST SEAL in write-guard.test.ts is a
 * regex over source text and never saw `faf_write` (it writes through
 * `filePath`). These tests run the tools in temp dirs and check the disk.
 *
 *   B1  faf_write overwrote .faf-dna, project.faf and CLAUDE.md, wrote into
 *       another project under /tmp and into .git/hooks.
 *   B2  faf_dna issued two certificates under a race, and reissued one when
 *       a committed .faf-dna had been deleted.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { gitEverTracked } from '../src/utils/git-history';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const textOf = (r: ToolText): string => (r.content ?? []).map((c) => c.text ?? '').join('\n');

const FAF = `faf_version: "3.0"
project:
  name: brake-fixture
  goal: Prove the birth certificate is written once
  main_language: TypeScript
  type: cli
stack:
  runtime: Node.js
`;

const CERT = JSON.stringify({
  birthCertificate: {
    born: '2025-01-01T00:00:00.000Z',
    birthDNA: 42,
    birthDNASource: 'auto',
    authenticated: false,
    certificate: 'FAF-2025-ORIGINAL-AAAA',
  },
  current: { score: 42, version: 'v1.0.0', lastSync: '2025-01-01T00:00:00.000Z' },
  milestones: [{ type: 'birth', score: 42, date: '2025-01-01T00:00:00.000Z', version: 'v1.0.0' }],
  format: 'faf-dna-v1',
}, null, 2);

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

describe('🏁 WJTTC — faf_write brakes (B1)', () => {
  const handler = new FafToolHandler(new FafEngineAdapter('native'));
  const write = async (args: Record<string, unknown>): Promise<ToolText> =>
    (await handler.callTool('faf_write', args)) as ToolText;

  let originalCwd: string;
  let dir: string;
  let other: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-write-brake-')));
    other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-write-other-')));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  });

  test('.faf-dna is refused and stays byte-identical', async () => {
    fs.writeFileSync('.faf-dna', CERT);
    const res = await write({
      path: '.faf-dna',
      content: '{"birthCertificate":{"certificate":"FAF-REISSUED"}}',
    });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('.faf-dna');
    expect(fs.readFileSync('.faf-dna', 'utf-8')).toBe(CERT);
  });

  test('.faf-dna is refused even with overwrite: true', async () => {
    fs.writeFileSync('.faf-dna', CERT);
    const res = await write({ path: '.faf-dna', content: 'x', overwrite: true });
    expect(res.isError).toBe(true);
    expect(fs.readFileSync('.faf-dna', 'utf-8')).toBe(CERT);
  });

  test('.faf-dna is refused when absent too (no new certificate via faf_write)', async () => {
    const res = await write({ path: '.faf-dna', content: CERT });
    expect(res.isError).toBe(true);
    expect(fs.existsSync('.faf-dna')).toBe(false);
  });

  test('.faf-dna is refused in any case, in a subdir, and by absolute path', async () => {
    for (const p of ['.FAF-DNA', '.Faf-Dna', 'sub/.faf-dna', path.join(dir, '.faf-dna')]) {
      const res = await write({ path: p, content: 'x', overwrite: true });
      expect(res.isError).toBe(true);
    }
    expect(fs.existsSync('.faf-dna')).toBe(false);
    expect(fs.existsSync('sub/.faf-dna')).toBe(false);
  });

  test('a symlink to .faf-dna is refused and the certificate stays byte-identical', async () => {
    fs.writeFileSync('.faf-dna', CERT);
    fs.symlinkSync(path.join(dir, '.faf-dna'), path.join(dir, 'innocent.json'));
    const res = await write({ path: 'innocent.json', content: 'x', overwrite: true });
    expect(res.isError).toBe(true);
    expect(fs.readFileSync('.faf-dna', 'utf-8')).toBe(CERT);
    expect(fs.lstatSync('innocent.json').isSymbolicLink()).toBe(true);
  });

  test('a path through a symlinked directory to .faf-dna is refused', async () => {
    fs.writeFileSync('.faf-dna', CERT);
    fs.symlinkSync(dir, path.join(dir, 'loop'));
    const res = await write({ path: 'loop/.faf-dna', content: 'x', overwrite: true });
    expect(res.isError).toBe(true);
    expect(fs.readFileSync('.faf-dna', 'utf-8')).toBe(CERT);
  });

  for (const name of ['project.faf', '.faf', 'other.faf', 'CLAUDE.md', 'AGENTS.md', 'claude.md']) {
    test(`existing ${name} is refused without overwrite, written with it`, async () => {
      const original = `hand-written notes in ${name}\n`;
      fs.writeFileSync(name, original);

      const refused = await write({ path: name, content: 'x' });
      expect(refused.isError).toBe(true);
      expect(textOf(refused)).toContain('already exists');
      expect(textOf(refused)).toContain('overwrite: true');
      expect(fs.readFileSync(name, 'utf-8')).toBe(original);

      const ok = await write({ path: name, content: 'replaced', overwrite: true });
      expect(ok.isError).toBeFalsy();
      expect(fs.readFileSync(name, 'utf-8')).toBe('replaced');
    });
  }

  test('new project.faf / CLAUDE.md are created without overwrite', async () => {
    expect((await write({ path: 'project.faf', content: FAF })).isError).toBeFalsy();
    expect((await write({ path: 'CLAUDE.md', content: '# notes\n' })).isError).toBeFalsy();
    expect(fs.readFileSync('project.faf', 'utf-8')).toBe(FAF);
    expect(fs.readFileSync('CLAUDE.md', 'utf-8')).toBe('# notes\n');
  });

  test('ordinary files are still written and replaced as before', async () => {
    expect((await write({ path: 'src/a.ts', content: 'one' })).isError).toBeFalsy();
    expect((await write({ path: 'src/a.ts', content: 'two' })).isError).toBeFalsy();
    expect(fs.readFileSync('src/a.ts', 'utf-8')).toBe('two');
  });

  test('no temp files are left behind', async () => {
    await write({ path: 'a.txt', content: 'x' });
    fs.writeFileSync('CLAUDE.md', 'keep');
    await write({ path: 'CLAUDE.md', content: 'y' });
    expect(fs.readdirSync(dir).filter((f) => f.includes('faf-tmp'))).toEqual([]);
  });

  test('a protected file through a symlink keeps the no-clobber rule', async () => {
    fs.writeFileSync('CLAUDE.md', 'keep');
    fs.symlinkSync(path.join(dir, 'CLAUDE.md'), path.join(dir, 'alias.md'));
    const res = await write({ path: 'alias.md', content: 'x' });
    expect(res.isError).toBe(true);
    expect(fs.readFileSync('CLAUDE.md', 'utf-8')).toBe('keep');
  });

  test('writing into another project under the OS temp dir is refused', async () => {
    const target = path.join(other, 'project.faf');
    const res = await write({ path: target, content: 'x' });
    expect(res.isError).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
    const res2 = await write({ path: path.join(os.tmpdir(), `faf-write-escape-${process.pid}.txt`), content: 'x' });
    expect(res2.isError).toBe(true);
  });

  test('../ escape from cwd is refused', async () => {
    const res = await write({ path: `../${path.basename(other)}/x.txt`, content: 'x' });
    expect(res.isError).toBe(true);
    expect(fs.existsSync(path.join(other, 'x.txt'))).toBe(false);
  });

  test('a symlinked directory pointing outside cwd is refused', async () => {
    fs.symlinkSync(other, path.join(dir, 'escape'));
    const res = await write({ path: 'escape/x.txt', content: 'x' });
    expect(res.isError).toBe(true);
    expect(fs.existsSync(path.join(other, 'x.txt'))).toBe(false);
  });

  test('.git/hooks and anything under .git/ is refused', async () => {
    git(dir, 'init', '-q');
    for (const p of ['.git/hooks/pre-commit', '.git/config', '.GIT/HEAD', 'sub/.git/x', path.join(dir, '.git/hooks/post-merge')]) {
      const res = await write({ path: p, content: '#!/bin/sh\necho pwned\n', overwrite: true });
      expect(res.isError).toBe(true);
    }
    expect(fs.existsSync('.git/hooks/pre-commit')).toBe(false);
    expect(fs.existsSync('.git/hooks/post-merge')).toBe(false);
  });

  test('faf_write advertises destructiveHint and the overwrite flag', async () => {
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    const tools = await handler.listTools();
    if (prev === undefined) delete process.env.FAF_TOOLS; else process.env.FAF_TOOLS = prev;
    const t = tools.tools.find((x) => x.name === 'faf_write')!;
    expect(t.annotations?.destructiveHint).toBe(true);
    expect(t.inputSchema.properties?.overwrite).toBeDefined();
    expect(t.description).toContain('.faf-dna');
    expect(t.description).not.toContain('OS temp dir');
  });
});

describe('🏁 WJTTC — faf_dna birth certificate (B2)', () => {
  const handler = new FafToolHandler(new FafEngineAdapter('native'));
  const dna = async (dir: string): Promise<ToolText> =>
    (await handler.callTool('faf_dna', { path: dir })) as ToolText;
  const certOf = (text: string): string | undefined => text.match(/Certificate: (\S+)/)?.[1];

  const dirs: string[] = [];
  const mk = (): string => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-dna-brake-')));
    dirs.push(d);
    fs.writeFileSync(path.join(d, 'project.faf'), FAF);
    return d;
  };

  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  test('concurrent first calls produce one certificate, on disk and in every reply', async () => {
    const dir = mk();
    const replies = await Promise.all([dna(dir), dna(dir), dna(dir), dna(dir)]);
    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, '.faf-dna'), 'utf-8')).birthCertificate.certificate;
    for (const r of replies) {
      expect(r.isError).toBeFalsy();
      expect(certOf(textOf(r))).toBe(onDisk);
    }
    expect(replies.filter((r) => textOf(r).includes('Birth Certificate Created')).length).toBe(1);
  });

  test('an existing certificate is kept on later calls', async () => {
    const dir = mk();
    fs.writeFileSync(path.join(dir, '.faf-dna'), CERT);
    await dna(dir);
    const stored = JSON.parse(fs.readFileSync(path.join(dir, '.faf-dna'), 'utf-8'));
    expect(stored.birthCertificate).toEqual(JSON.parse(CERT).birthCertificate);
  });

  test('deleted-but-committed .faf-dna is refused, not reissued', async () => {
    const dir = mk();
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 'wjttc@example.invalid');
    git(dir, 'config', 'user.name', 'wjttc');
    git(dir, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(dir, '.faf-dna'), CERT);
    git(dir, 'add', '.faf-dna', 'project.faf');
    git(dir, 'commit', '-q', '-m', 'birth');
    fs.rmSync(path.join(dir, '.faf-dna'));

    const res = await dna(dir);
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('git shows it existed');
    expect(textOf(res)).toContain('git checkout');
    expect(textOf(res)).not.toContain('Birth Certificate Created');
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);

    // Deleted in a commit is still a past birth.
    git(dir, 'rm', '-q', '--cached', '.faf-dna');
    git(dir, 'commit', '-q', '-m', 'delete');
    const res2 = await dna(dir);
    expect(res2.isError).toBe(true);
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);
  });

  test('a git repo with no .faf-dna history still gets its first certificate', async () => {
    const dir = mk();
    git(dir, 'init', '-q');
    const res = await dna(dir);
    expect(res.isError).toBeFalsy();
    expect(textOf(res)).toContain('Birth Certificate Created');
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(true);
  });
});

describe('🏁 WJTTC — in-process git history reader (faf_dna, no child_process)', () => {
  const dirs: string[] = [];
  const repo = (): string => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-git-reader-')));
    dirs.push(d);
    git(d, 'init', '-q');
    git(d, 'config', 'user.email', 'wjttc@example.invalid');
    git(d, 'config', 'user.name', 'wjttc');
    git(d, 'config', 'commit.gpgsign', 'false');
    return d;
  };
  const commitFiles = (d: string, files: Record<string, string>, msg: string): void => {
    for (const [f, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
      fs.writeFileSync(path.join(d, f), c);
      git(d, 'add', f);
    }
    git(d, 'commit', '-q', '-m', msg);
  };

  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  test('not a repo → not-a-repo', () => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-git-none-')));
    dirs.push(d);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('not-a-repo');
  });

  test('never tracked → never', () => {
    const d = repo();
    commitFiles(d, { 'a.txt': 'a' }, 'one');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
  });

  test('deleted in an old commit, loose objects → found', () => {
    const d = repo();
    commitFiles(d, { '.faf-dna': CERT }, 'birth');
    git(d, 'rm', '-q', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'delete');
    for (let i = 0; i < 5; i++) commitFiles(d, { 'a.txt': `a${i}` }, `later ${i}`);
    const r = gitEverTracked(path.join(d, '.faf-dna'));
    expect(r.status).toBe('found');
    expect(r.where).toContain('birth');
  });

  test('deleted in an old commit, packed with deltas → found; index v4; subdir', () => {
    const d = repo();
    for (let i = 0; i < 20; i++) commitFiles(d, { 'big.txt': 'line\n'.repeat(500) + i }, `pre ${i}`);
    commitFiles(d, { 'pkg/app/.faf-dna': CERT }, 'birth in subdir');
    git(d, 'rm', '-q', 'pkg/app/.faf-dna');
    git(d, 'commit', '-q', '-m', 'delete');
    for (let i = 0; i < 20; i++) commitFiles(d, { 'big.txt': 'line\n'.repeat(500) + `post${i}` }, `post ${i}`);
    git(d, 'gc', '-q', '--aggressive', '--prune=now');
    git(d, 'update-index', '--index-version', '4');
    expect(fs.readdirSync(path.join(d, '.git/objects/pack')).some((f) => f.endsWith('.pack'))).toBe(true);
    expect(gitEverTracked(path.join(d, 'pkg/app/.faf-dna')).status).toBe('found');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
  });

  test('only on another branch or behind an annotated tag → found', () => {
    const d = repo();
    commitFiles(d, { 'a.txt': 'a' }, 'base');
    const main = git(d, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
    git(d, 'checkout', '-q', '-b', 'side');
    commitFiles(d, { '.faf-dna': CERT }, 'side birth');
    git(d, 'tag', '-a', 'v-side', '-m', 'tagged');
    git(d, 'checkout', '-q', main);
    git(d, 'branch', '-q', '-D', 'side');
    git(d, 'pack-refs', '--all');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('found');
  });

  test('staged only (index v2) → found', () => {
    const d = repo();
    fs.writeFileSync(path.join(d, '.faf-dna'), CERT);
    git(d, 'add', '.faf-dna');
    fs.rmSync(path.join(d, '.faf-dna'));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('found');
  });
});
