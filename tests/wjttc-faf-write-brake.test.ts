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
 *
 * Round 2 (review of b9888c0):
 *   F1  unreadable git objects read as "never tracked" → now unknown.
 *   F2  unknown history (SHA-256, shallow, over the walk limit, unreadable)
 *       → faf_dna refuses; it never issues a certificate it cannot justify.
 *   F4  faf_write accepted `.faf-dna/x` (made a directory) → any segment refused.
 *   I4  outside git, the birth reply says no history could be checked.
 *   I5  faf_write overwrite keeps the replaced file's mode.
 *
 * Round 3 (second review of #110, at f5fd963):
 *   N1  a commit reachable only from the reflog (reset --hard) was not
 *       checked → reflogs are walked; an unreadable reflog is unknown.
 *   N2  a `clone --shared` repo (objects/info/alternates) was always refused
 *       → alternates are followed; an unreadable alternate is unknown.
 *   N3  a path through a broken symlinked folder was stopped only by mkdir
 *       → refused explicitly before mkdir.
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

  test('F4: .faf-dna as a directory segment is refused in any case; faf_dna still works after', async () => {
    fs.writeFileSync('project.faf', FAF);
    for (const p of ['.faf-dna/x', '.FAF-DNA/x', '.Faf-Dna/deep/y.json', 'sub/.faf-dna/x', path.join(dir, '.faf-dna', 'x')]) {
      const res = await write({ path: p, content: 'x', overwrite: true });
      expect(res.isError).toBe(true);
      expect(textOf(res)).toContain('.faf-dna');
    }
    expect(fs.existsSync('.faf-dna')).toBe(false);
    expect(fs.existsSync('.FAF-DNA')).toBe(false);
    expect(fs.existsSync('sub/.faf-dna')).toBe(false);

    const res = (await handler.callTool('faf_dna', { path: dir })) as ToolText;
    expect(res.isError).toBeFalsy();
    expect(textOf(res)).toContain('Birth Certificate Created');
    expect(fs.statSync('.faf-dna').isFile()).toBe(true);
  });

  test('F4: names that only contain .faf-dna are still ordinary files', async () => {
    for (const p of ['notes.faf-dna.md', 'faf-dna/x.txt', '.faf-dna-backup/x.txt']) {
      const res = await write({ path: p, content: 'ok' });
      expect(res.isError).toBeFalsy();
      expect(fs.readFileSync(p, 'utf-8')).toBe('ok');
    }
  });

  test.skipIf(process.platform === 'win32')('I5: overwrite keeps the existing file mode (0755 stays 0755)', async () => {
    fs.writeFileSync('run.sh', '#!/bin/sh\necho one\n');
    fs.chmodSync('run.sh', 0o755);
    expect((await write({ path: 'run.sh', content: '#!/bin/sh\necho two\n' })).isError).toBeFalsy();
    expect(fs.statSync('run.sh').mode & 0o7777).toBe(0o755);
    expect(fs.readFileSync('run.sh', 'utf-8')).toContain('two');

    fs.writeFileSync('CLAUDE.md', 'keep');
    fs.chmodSync('CLAUDE.md', 0o600);
    expect((await write({ path: 'CLAUDE.md', content: 'new', overwrite: true })).isError).toBeFalsy();
    expect(fs.statSync('CLAUDE.md').mode & 0o7777).toBe(0o600);
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

  const committedThenDeleted = (): string => {
    const dir = mk();
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 'wjttc@example.invalid');
    git(dir, 'config', 'user.name', 'wjttc');
    git(dir, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(dir, '.faf-dna'), CERT);
    git(dir, 'add', '.faf-dna', 'project.faf');
    git(dir, 'commit', '-q', '-m', 'birth');
    git(dir, 'rm', '-q', '.faf-dna');
    git(dir, 'commit', '-q', '-m', 'delete');
    git(dir, 'gc', '-q', '--prune=now');
    return dir;
  };
  const packFile = (dir: string): string => {
    const packDir = path.join(dir, '.git/objects/pack');
    return path.join(packDir, fs.readdirSync(packDir).find((f) => f.endsWith('.pack'))!);
  };
  const expectRefused = (res: ToolText, dir: string): void => {
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('could not be checked');
    expect(textOf(res)).toContain('git checkout');
    expect(textOf(res)).toContain('faf init');
    expect(textOf(res)).not.toContain('Birth Certificate Created');
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);
  };

  test('F1/F2: committed-then-deleted .faf-dna with an unreadable pack → refused, not reissued', async () => {
    const dir = committedThenDeleted();
    const pack = packFile(dir);
    // The review repro: the pack cannot be read. Replacing it with a directory
    // gives EISDIR for every uid, root included, so the test is not uid-dependent.
    fs.rmSync(pack);
    fs.mkdirSync(pack);
    expectRefused(await dna(dir), dir);
  });

  test.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'F1/F2: pack with no read permission (chmod 000) → refused', async () => {
      const dir = committedThenDeleted();
      fs.chmodSync(packFile(dir), 0o000);
      expectRefused(await dna(dir), dir);
    });

  test('F1/F2: pack truncated → refused', async () => {
    const dir = committedThenDeleted();
    const pack = packFile(dir);
    fs.chmodSync(pack, 0o644); // git writes packs 0444; non-root cannot truncate them
    fs.truncateSync(pack, 40);
    expectRefused(await dna(dir), dir);
  });

  test('F2: SHA-256 repository → refused', async () => {
    const dir = mk();
    git(dir, 'init', '-q', '--object-format=sha256');
    expectRefused(await dna(dir), dir);
  });

  test('F2: shallow clone → refused', async () => {
    const src = committedThenDeleted();
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(path.join(src, 'a.txt'), `a${i}`);
      git(src, 'add', 'a.txt');
      git(src, 'commit', '-q', '-m', `later ${i}`);
    }
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-dna-shallow-')));
    dirs.push(dir);
    fs.rmSync(dir, { recursive: true });
    git(os.tmpdir(), 'clone', '-q', '--depth', '1', `file://${src}`, dir);
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);
    expectRefused(await dna(dir), dir);
  });

  test('I4: outside git, the birth reply says no history could be checked', async () => {
    const dir = mk();
    expect(gitEverTracked(path.join(dir, '.faf-dna')).status).toBe('not-a-repo');
    const res = await dna(dir);
    expect(res.isError).toBeFalsy();
    expect(textOf(res)).toContain('Birth Certificate Created');
    expect(textOf(res)).toContain('Not a git repository: no history could be checked');
    expect(textOf(res)).toContain('cannot be told apart from a new project');
  });

  test('I4: inside git with clean history, the birth reply has no outside-git warning', async () => {
    const dir = mk();
    git(dir, 'init', '-q');
    const res = await dna(dir);
    expect(textOf(res)).toContain('Birth Certificate Created');
    expect(textOf(res)).not.toContain('Not a git repository');
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

  const deletedInHistory = (): string => {
    const d = repo();
    commitFiles(d, { '.faf-dna': CERT }, 'birth');
    git(d, 'rm', '-q', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'delete');
    commitFiles(d, { 'a.txt': 'a' }, 'later');
    return d;
  };

  test('F1: a missing loose object → unknown, not never', () => {
    const d = deletedInHistory();
    // Remove the root tree of the "birth" commit.
    const birth = git(d, 'rev-list', '--max-parents=0', 'HEAD').trim();
    const tree = git(d, 'rev-parse', `${birth}^{tree}`).trim();
    fs.rmSync(path.join(d, '.git/objects', tree.slice(0, 2), tree.slice(2)));
    const r = gitEverTracked(path.join(d, '.faf-dna'));
    expect(r.status).toBe('unknown');
  });

  test('F1: a missing commit object → unknown, not never', () => {
    const d = repo();
    commitFiles(d, { 'a.txt': 'a' }, 'one');
    commitFiles(d, { 'a.txt': 'b' }, 'two');
    const first = git(d, 'rev-parse', 'HEAD~1').trim();
    fs.rmSync(path.join(d, '.git/objects', first.slice(0, 2), first.slice(2)));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
  });

  test('F1: a corrupt loose object → unknown', () => {
    const d = repo();
    commitFiles(d, { 'a.txt': 'a' }, 'one');
    const head = git(d, 'rev-parse', 'HEAD').trim();
    const obj = path.join(d, '.git/objects', head.slice(0, 2), head.slice(2));
    fs.chmodSync(obj, 0o644);
    fs.writeFileSync(obj, 'not zlib');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
  });

  test('F1: unreadable pack (EISDIR), missing pack, and bad idx → unknown', () => {
    const d = deletedInHistory();
    git(d, 'gc', '-q', '--prune=now');
    const packDir = path.join(d, '.git/objects/pack');
    const pack = path.join(packDir, fs.readdirSync(packDir).find((f) => f.endsWith('.pack'))!);
    const idx = pack.replace(/\.pack$/, '.idx');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('found');

    const saved = fs.readFileSync(pack);
    fs.rmSync(pack);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown'); // missing .pack
    fs.mkdirSync(pack);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown'); // EISDIR
    fs.rmSync(pack, { recursive: true });
    fs.writeFileSync(pack, saved);
    fs.chmodSync(idx, 0o644);
    fs.writeFileSync(idx, Buffer.alloc(2048));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown'); // bad idx
  });

  test('F1: malformed index, ref and packed-refs → unknown', () => {
    const a = repo();
    commitFiles(a, { 'a.txt': 'a' }, 'one');
    fs.writeFileSync(path.join(a, '.git/index'), 'garbage-index');
    expect(gitEverTracked(path.join(a, '.faf-dna')).status).toBe('unknown');

    const b = repo();
    commitFiles(b, { 'a.txt': 'a' }, 'one');
    fs.writeFileSync(path.join(b, '.git/refs/heads/broken'), 'not-a-sha\n');
    expect(gitEverTracked(path.join(b, '.faf-dna')).status).toBe('unknown');

    const c = repo();
    commitFiles(c, { 'a.txt': 'a' }, 'one');
    fs.writeFileSync(path.join(c, '.git/packed-refs'), 'junk line\n');
    expect(gitEverTracked(path.join(c, '.faf-dna')).status).toBe('unknown');
  });

  test('F2: SHA-256 repository → unknown', () => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-git-sha256-')));
    dirs.push(d);
    git(d, 'init', '-q', '--object-format=sha256');
    const r = gitEverTracked(path.join(d, '.faf-dna'));
    expect(r.status).toBe('unknown');
    expect(r.status === 'unknown' && r.reason).toContain('sha256');
  });

  test('F2: history over the walk limit → unknown', () => {
    const d = repo();
    for (let i = 0; i < 4; i++) commitFiles(d, { 'a.txt': `a${i}` }, `c${i}`);
    expect(gitEverTracked(path.join(d, '.faf-dna'), 2).status).toBe('unknown');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
  });

  test('fresh repo with no commits (unborn HEAD) is still never', () => {
    const d = repo();
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
  });
});

describe('🏁 WJTTC — round 3: reflog, shared clones, broken symlinked folders (N1–N3)', () => {
  const handler = new FafToolHandler(new FafEngineAdapter('native'));
  const dna = async (dir: string): Promise<ToolText> =>
    (await handler.callTool('faf_dna', { path: dir })) as ToolText;

  const dirs: string[] = [];
  const tmp = (prefix: string): string => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
    dirs.push(d);
    return d;
  };
  const repo = (): string => {
    const d = tmp('faf-dna-r3-');
    git(d, 'init', '-q');
    git(d, 'config', 'user.email', 'wjttc@example.invalid');
    git(d, 'config', 'user.name', 'wjttc');
    git(d, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(d, 'project.faf'), FAF);
    git(d, 'add', 'project.faf');
    git(d, 'commit', '-q', '-m', 'base');
    return d;
  };
  /** .faf-dna committed, then dropped by reset --hard: reachable only from the reflog. */
  const reflogOnly = (): string => {
    const d = repo();
    fs.writeFileSync(path.join(d, '.faf-dna'), CERT);
    git(d, 'add', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'birth');
    git(d, 'reset', '-q', '--hard', 'HEAD~1');
    expect(fs.existsSync(path.join(d, '.faf-dna'))).toBe(false);
    expect(git(d, 'log', '--all', '--oneline', '--', '.faf-dna').trim()).toBe('');
    return d;
  };
  const shared = (src: string): string => {
    const d = path.join(tmp('faf-dna-shared-'), 'clone');
    git(os.tmpdir(), 'clone', '-q', '--shared', src, d);
    return d;
  };
  const expectFound = (res: ToolText, dir: string): void => {
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('git shows it existed');
    expect(textOf(res)).toContain('git log --all --reflog --diff-filter=AM --oneline -- .faf-dna');
    expect(textOf(res)).toContain('git checkout <sha> -- .faf-dna');
    expect(textOf(res)).not.toContain('Birth Certificate Created');
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);
  };
  const expectUnknown = (res: ToolText, dir: string): void => {
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('could not be checked');
    expect(textOf(res)).toContain('git checkout');
    expect(textOf(res)).not.toContain('Birth Certificate Created');
    expect(fs.existsSync(path.join(dir, '.faf-dna'))).toBe(false);
  };

  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  // ── N1: reflog ──────────────────────────────────────────────────────────

  test('N1: reflog-only .faf-dna (reset --hard) → refused with the restore steps', async () => {
    const d = reflogOnly();
    const res = await dna(d);
    expectFound(res, d);
    // The printed step finds the commit.
    expect(git(d, 'log', '--all', '--reflog', '--oneline', '--', '.faf-dna')).toContain('birth');
  });

  test('N1: reflog-only, packed after gc → found', () => {
    const d = reflogOnly();
    git(d, 'gc', '-q');
    const r = gitEverTracked(path.join(d, '.faf-dna'));
    expect(r.status).toBe('found');
  });

  test('N1: reflog-only on a deleted branch (logs/HEAD removed) → found via logs/refs', () => {
    const d = repo();
    const main = git(d, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
    git(d, 'checkout', '-q', '-b', 'side');
    fs.writeFileSync(path.join(d, '.faf-dna'), CERT);
    git(d, 'add', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'birth');
    git(d, 'checkout', '-q', main);
    git(d, 'reset', '-q', '--hard'); // keep side's reflog under logs/refs/heads/side
    fs.rmSync(path.join(d, '.git/refs/heads/side'));
    fs.rmSync(path.join(d, '.git/logs/HEAD'));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('found');
  });

  test('N1: unreadable reflog (logs/HEAD is a directory) → unknown → refused', async () => {
    const d = reflogOnly();
    fs.rmSync(path.join(d, '.git/logs/HEAD'));
    fs.mkdirSync(path.join(d, '.git/logs/HEAD'));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
    expectUnknown(await dna(d), d);
  });

  test('N1: malformed reflog line → unknown → refused', async () => {
    const d = repo();
    fs.appendFileSync(path.join(d, '.git/logs/HEAD'), 'not a reflog line\n');
    const r = gitEverTracked(path.join(d, '.faf-dna'));
    expect(r.status).toBe('unknown');
    expectUnknown(await dna(d), d);
  });

  test('N1: reflog names a pruned commit → unknown, not never', () => {
    const d = reflogOnly();
    const birth = git(d, 'rev-parse', 'HEAD@{1}').trim();
    fs.rmSync(path.join(d, '.git/objects', birth.slice(0, 2), birth.slice(2)));
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
  });

  test('N1: no logs directory at all (logAllRefUpdates off) is still never', () => {
    const d = repo();
    fs.rmSync(path.join(d, '.git/logs'), { recursive: true });
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
  });

  // ── N2: clone --shared (objects/info/alternates) ────────────────────────

  test('N2: --shared clone of a new project → one birth', async () => {
    const src = repo();
    const d = shared(src);
    expect(fs.existsSync(path.join(d, '.git/objects/info/alternates'))).toBe(true);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('never');
    const replies = await Promise.all([dna(d), dna(d)]);
    for (const r of replies) expect(r.isError).toBeFalsy();
    expect(replies.filter((r) => textOf(r).includes('Birth Certificate Created')).length).toBe(1);
    expect(fs.existsSync(path.join(d, '.faf-dna'))).toBe(true);
  });

  test('N2: --shared clone, .faf-dna committed then deleted (history in the alternate) → refused', async () => {
    const src = repo();
    fs.writeFileSync(path.join(src, '.faf-dna'), CERT);
    git(src, 'add', '.faf-dna');
    git(src, 'commit', '-q', '-m', 'birth');
    git(src, 'rm', '-q', '.faf-dna');
    git(src, 'commit', '-q', '-m', 'delete');
    git(src, 'gc', '-q');
    const d = shared(src);
    expectFound(await dna(d), d);
  });

  test('N2: --shared clone, .faf-dna committed then deleted in the clone → refused', async () => {
    const d = shared(repo());
    git(d, 'config', 'user.email', 'wjttc@example.invalid');
    git(d, 'config', 'user.name', 'wjttc');
    git(d, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(d, '.faf-dna'), CERT);
    git(d, 'add', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'birth');
    git(d, 'rm', '-q', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'delete');
    expectFound(await dna(d), d);
  });

  test('N2: relative alternates path is followed', () => {
    const src = repo();
    fs.writeFileSync(path.join(src, '.faf-dna'), CERT);
    git(src, 'add', '.faf-dna');
    git(src, 'commit', '-q', '-m', 'birth');
    git(src, 'rm', '-q', '.faf-dna');
    git(src, 'commit', '-q', '-m', 'delete');
    const d = shared(src);
    const alt = path.join(d, '.git/objects/info/alternates');
    const abs = fs.readFileSync(alt, 'utf-8').trim();
    const rel = path.relative(path.join(d, '.git/objects'), abs);
    expect(path.isAbsolute(rel)).toBe(false);
    fs.writeFileSync(alt, `# comment\n${rel}\n`);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('found');
  });

  test('N2: alternate that cannot be read → unknown → refused', async () => {
    const src = repo();
    const d = shared(src);
    fs.writeFileSync(path.join(d, '.git/objects/info/alternates'), path.join(src, 'no-such-objects') + '\n');
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
    expectUnknown(await dna(d), d);
  });

  test('N2: alternates file that is not a file (EISDIR) → unknown', () => {
    const d = shared(repo());
    const alt = path.join(d, '.git/objects/info/alternates');
    fs.rmSync(alt);
    fs.mkdirSync(alt);
    expect(gitEverTracked(path.join(d, '.faf-dna')).status).toBe('unknown');
  });

  // ── N3: broken symlinked folder ─────────────────────────────────────────

  describe('N1b: linked worktrees (round 4)', () => {
    /** Main repo plus a detached linked worktree that commits .faf-dna. */
    const withWorktree = (): { main: string; wt: string } => {
      const main = repo();
      const wt = path.join(tmp('faf-dna-wt-'), 'wt');
      git(main, 'worktree', 'add', '-q', '--detach', wt);
      fs.writeFileSync(path.join(wt, '.faf-dna'), CERT);
      git(wt, 'add', '.faf-dna');
      git(wt, 'commit', '-q', '-m', 'birth');
      return { main, wt };
    };

    test('detached linked worktree holds the birth commit → refused from the main worktree', async () => {
      const { main } = withWorktree();
      expectFound(await dna(main), main);
    });

    test('detached linked worktree: birth then reset --hard → refused from the main worktree', async () => {
      const { main, wt } = withWorktree();
      git(wt, 'reset', '-q', '--hard', 'HEAD~1');
      expect(git(main, 'log', '--all', '--oneline', '--', '.faf-dna').trim()).toBe('');
      expectFound(await dna(main), main);
    });

    test('same after git gc --prune=now → still refused (git keeps the commit)', async () => {
      const { main, wt } = withWorktree();
      git(wt, 'reset', '-q', '--hard', 'HEAD~1');
      git(main, 'gc', '-q', '--prune=now');
      expectFound(await dna(main), main);
    });

    // Root can list a mode-000 directory, so this only runs as a normal user (CI).
    test.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
      'a worktrees dir that cannot be listed → unknown → refused', async () => {
        const { main } = withWorktree();
        const wtAdmin = path.join(main, '.git', 'worktrees');
        fs.chmodSync(wtAdmin, 0o000);
        try {
          expectUnknown(await dna(main), main);
        } finally {
          fs.chmodSync(wtAdmin, 0o755);
        }
      });
  });

  test('restore step: with a delete commit in history, the first line printed restores .faf-dna', async () => {
    const d = repo();
    fs.writeFileSync(path.join(d, '.faf-dna'), CERT);
    git(d, 'add', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'birth');
    git(d, 'rm', '-q', '.faf-dna');
    git(d, 'commit', '-q', '-m', 'remove');
    expectFound(await dna(d), d);
    const first = git(d, 'log', '--all', '--reflog', '--diff-filter=AM', '--oneline', '--', '.faf-dna').trim().split('\n')[0];
    const sha = first.split(' ')[0];
    git(d, 'checkout', sha, '--', '.faf-dna');
    expect(fs.readFileSync(path.join(d, '.faf-dna'), 'utf-8')).toBe(CERT);
  });

  describe('N3: faf_write through a broken symlinked folder', () => {
    let originalCwd: string;
    let dir: string;
    const write = async (args: Record<string, unknown>): Promise<ToolText> =>
      (await handler.callTool('faf_write', args)) as ToolText;

    beforeEach(() => {
      originalCwd = process.cwd();
      dir = tmp('faf-write-r3-');
      process.chdir(dir);
    });
    afterEach(() => process.chdir(originalCwd));

    test('dangling symlinked folder → refused before mkdir, target not created', async () => {
      fs.symlinkSync(path.join(dir, 'nowhere'), path.join(dir, 'ghost'));
      for (const p of ['ghost/x.txt', 'ghost/a/b/x.txt']) {
        const res = await write({ path: p, content: 'x' });
        expect(res.isError).toBe(true);
        expect(textOf(res)).toContain('Security error');
        expect(textOf(res)).toContain('broken symlinked folder');
        expect(fs.existsSync(path.join(dir, 'nowhere'))).toBe(false);
      }
    });

    test('symlink loop folder → refused before mkdir', async () => {
      fs.symlinkSync(path.join(dir, 'loop'), path.join(dir, 'loop'));
      const res = await write({ path: 'loop/x.txt', content: 'x' });
      expect(res.isError).toBe(true);
      expect(textOf(res)).toContain('broken symlinked folder');
    });

    test('broken link reached through a working symlinked folder → refused', async () => {
      fs.mkdirSync(path.join(dir, 'real'));
      fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'via'));
      fs.symlinkSync(path.join(dir, 'gone'), path.join(dir, 'real', 'ghost'));
      const res = await write({ path: 'via/ghost/x.txt', content: 'x' });
      expect(res.isError).toBe(true);
      expect(textOf(res)).toContain('broken symlinked folder');
      expect(fs.existsSync(path.join(dir, 'gone'))).toBe(false);
    });

    test('a working symlinked folder inside cwd and a new folder still write', async () => {
      fs.mkdirSync(path.join(dir, 'real'));
      fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'via'));
      expect((await write({ path: 'via/x.txt', content: 'x' })).isError).toBeFalsy();
      expect(fs.readFileSync(path.join(dir, 'real', 'x.txt'), 'utf-8')).toBe('x');
      expect((await write({ path: 'new/deep/y.txt', content: 'y' })).isError).toBeFalsy();
      expect(fs.readFileSync(path.join(dir, 'new/deep/y.txt'), 'utf-8')).toBe('y');
    });
  });
});
