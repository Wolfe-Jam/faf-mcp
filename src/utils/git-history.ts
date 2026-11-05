/**
 * git-history.ts — in-process, read-only answer to one question:
 * "has git ever recorded <file> in this repository?"
 *
 * faf_dna uses it to refuse reissuing a `.faf-dna` birth certificate that git
 * shows already existed. The server never spawns a process (see the
 * engine-adapter BRAKE test), so this reads `.git` directly with zlib:
 *
 *   1. the index (staged entries, so a file deleted only in the working tree
 *      is found without walking history), then
 *   2. every commit reachable from HEAD, refs/ and packed-refs — loose and
 *      packed objects, OFS/REF deltas — looking the path up in each tree.
 *
 * Read-only, and fail-closed: `never` is returned only when the whole
 * history was read. Any read error, missing object, unreadable or malformed
 * pack/index/ref, a shallow clone, a SHA-256 repository, or a walk past the
 * budget returns `unknown` (never throws). The caller decides what `unknown`
 * means; faf_dna refuses to issue a certificate on it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { inflateSync } from 'zlib';

export type GitHistoryResult =
  | { status: 'not-a-repo' }
  | { status: 'never' }
  | { status: 'found'; where: string }
  | { status: 'unknown'; reason: string };

interface Repo {
  gitDir: string;     // per-worktree dir (index, HEAD)
  commonDir: string;  // objects, refs, packed-refs
  root: string;       // work tree root
}

interface Pack {
  idx: Buffer;
  pack: Buffer;
  count: number;
}

const OBJ_TYPES: Record<number, string> = { 1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag' };

/** Thrown for anything that stops the history from being read in full. */
class HistoryUnreadable extends Error {}

/** ENOENT / ENOTDIR: the path is simply absent. Anything else is a read failure. */
function isAbsent(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

/** Read a file that may legitimately be absent (null). Any other error throws. */
function readOptional(p: string): Buffer | null {
  try {
    return fs.readFileSync(p);
  } catch (err) {
    if (isAbsent(err)) return null;
    throw new HistoryUnreadable(`cannot read ${path.basename(p)}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function findRepo(start: string): Repo | null {
  let dir = path.resolve(start);
  for (;;) {
    const dotGit = path.join(dir, '.git');
    let st: fs.Stats | null = null;
    try {
      st = fs.statSync(dotGit);
    } catch (err) {
      if (!isAbsent(err)) throw new HistoryUnreadable(`cannot stat .git: ${(err as Error).message}`);
      st = null;
    }
    if (st) {
      let gitDir = dotGit;
      if (st.isFile()) {
        const m = fs.readFileSync(dotGit, 'utf-8').match(/^gitdir:\s*(.+)\s*$/m);
        if (!m) throw new HistoryUnreadable('.git file has no gitdir line');
        gitDir = path.resolve(dir, m[1].trim());
      }
      const common = readOptional(path.join(gitDir, 'commondir'));
      const commonDir = common ? path.resolve(gitDir, common.toString('utf-8').trim()) : gitDir;
      return { gitDir, commonDir, root: dir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Paths staged in the index (versions 2, 3, 4). */
function indexHas(gitDir: string, rel: string): boolean {
  const buf = readOptional(path.join(gitDir, 'index'));
  if (!buf) return false; // no index yet (fresh repo)
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'DIRC') throw new HistoryUnreadable('index has a bad signature');
  const version = buf.readUInt32BE(4);
  if (version < 2 || version > 4) throw new HistoryUnreadable(`index version ${version} not supported`);
  const count = buf.readUInt32BE(8);
  let off = 12;
  let prev = '';
  for (let i = 0; i < count; i++) {
    const start = off;
    const flags = buf.readUInt16BE(off + 60);
    off += 62;
    if (version >= 3 && (flags & 0x4000)) off += 2;
    let name: string;
    if (version >= 4) {
      // varint: bytes to strip from the previous name, then a NUL-terminated suffix
      let strip = buf[off] & 0x7f;
      while (buf[off++] & 0x80) strip = ((strip + 1) << 7) | (buf[off] & 0x7f);
      const end = buf.indexOf(0, off);
      if (end < 0 || strip > prev.length) throw new HistoryUnreadable('index entry is malformed');
      name = prev.slice(0, prev.length - strip) + buf.toString('utf-8', off, end);
      off = end + 1;
    } else {
      const end = buf.indexOf(0, off);
      if (end < 0) throw new HistoryUnreadable('index entry is malformed');
      name = buf.toString('utf-8', off, end);
      off = start + Math.ceil((end - start + 1) / 8) * 8;
    }
    if (name === rel) return true;
    prev = name;
  }
  return false;
}

class ObjectStore {
  private packs: Pack[] | null = null;
  constructor(private readonly objectsDir: string) {}

  private loadPacks(): Pack[] {
    if (this.packs) return this.packs;
    const packs: Pack[] = [];
    const dir = path.join(this.objectsDir, 'pack');
    let names: string[] = [];
    try {
      names = fs.readdirSync(dir);
    } catch (err) {
      if (!isAbsent(err)) throw new HistoryUnreadable(`cannot list packs: ${(err as Error).message}`);
      names = [];
    }
    for (const n of names) {
      if (!n.endsWith('.idx')) continue;
      // A pack that cannot be read is history that cannot be checked: fail closed.
      let idx: Buffer;
      let pack: Buffer;
      try {
        idx = fs.readFileSync(path.join(dir, n));
        pack = fs.readFileSync(path.join(dir, n.replace(/\.idx$/, '.pack')));
      } catch (err) {
        throw new HistoryUnreadable(`cannot read pack ${n}: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (idx.length < 8 + 256 * 4 || idx.readUInt32BE(0) !== 0xff744f63 || idx.readUInt32BE(4) !== 2) {
        throw new HistoryUnreadable(`pack index ${n} is not a v2 index`);
      }
      if (pack.length < 12 || pack.toString('latin1', 0, 4) !== 'PACK') {
        throw new HistoryUnreadable(`pack ${n.replace(/\.idx$/, '.pack')} has a bad signature`);
      }
      packs.push({ idx, pack, count: idx.readUInt32BE(8 + 255 * 4) });
    }
    this.packs = packs;
    return packs;
  }

  private packOffset(p: Pack, sha: Buffer): number {
    const first = sha[0];
    let lo = first === 0 ? 0 : p.idx.readUInt32BE(8 + (first - 1) * 4);
    let hi = p.idx.readUInt32BE(8 + first * 4);
    const shaBase = 8 + 256 * 4;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const c = p.idx.compare(sha, 0, 20, shaBase + mid * 20, shaBase + mid * 20 + 20) * -1;
      if (c === 0) {
        const offBase = shaBase + p.count * 24; // after shas (20) and crcs (4)
        let off = p.idx.readUInt32BE(offBase + mid * 4);
        if (off & 0x80000000) {
          const big = offBase + p.count * 4 + (off & 0x7fffffff) * 8;
          off = Number(p.idx.readBigUInt64BE(big));
        }
        return off;
      }
      if (c < 0) hi = mid; else lo = mid + 1;
    }
    return -1;
  }

  private readPacked(p: Pack, offset: number, depth = 0): { type: string; data: Buffer } {
    if (depth > 64) throw new Error('delta chain too deep');
    const buf = p.pack;
    let off = offset;
    let c = buf[off++];
    const type = (c >> 4) & 7;
    while (c & 0x80) c = buf[off++];
    if (type === 6) {
      c = buf[off++];
      let rel = c & 0x7f;
      while (c & 0x80) { c = buf[off++]; rel = ((rel + 1) * 128) + (c & 0x7f); }
      const base = this.readPacked(p, offset - rel, depth + 1);
      return { type: base.type, data: applyDelta(base.data, inflateSync(buf.subarray(off))) };
    }
    if (type === 7) {
      const baseSha = buf.subarray(off, off + 20);
      const base = this.read(baseSha.toString('hex'), depth + 1);
      if (!base) throw new HistoryUnreadable('missing delta base');
      return { type: base.type, data: applyDelta(base.data, inflateSync(buf.subarray(off + 20))) };
    }
    const t = OBJ_TYPES[type];
    if (!t) throw new Error(`bad pack object type ${type}`);
    return { type: t, data: inflateSync(buf.subarray(off)) };
  }

  /** The object, or null when it is in neither loose storage nor any pack. Read errors throw. */
  read(hex: string, depth = 0): { type: string; data: Buffer } | null {
    const loose = readOptional(path.join(this.objectsDir, hex.slice(0, 2), hex.slice(2)));
    if (loose) {
      const raw = inflateSync(loose);
      const sp = raw.indexOf(0x20);
      const nul = raw.indexOf(0);
      if (sp < 0 || nul < sp) throw new HistoryUnreadable(`loose object ${hex.slice(0, 7)} is malformed`);
      return { type: raw.toString('latin1', 0, sp), data: raw.subarray(nul + 1) };
    }
    const sha = Buffer.from(hex, 'hex');
    for (const p of this.loadPacks()) {
      const off = this.packOffset(p, sha);
      if (off >= 0) return this.readPacked(p, off, depth);
    }
    return null;
  }

  /** Like read(), but a missing object is an error: history cannot be checked. */
  need(hex: string): { type: string; data: Buffer } {
    const obj = this.read(hex);
    if (!obj) throw new HistoryUnreadable(`object ${hex.slice(0, 7)} is missing`);
    return obj;
  }
}

function applyDelta(base: Buffer, delta: Buffer): Buffer {
  let off = 0;
  const varint = (): number => {
    let r = 0, s = 0, c: number;
    do { c = delta[off++]; r += (c & 0x7f) * 2 ** s; s += 7; } while (c & 0x80);
    return r;
  };
  varint(); // source size
  const out = Buffer.alloc(varint());
  let w = 0;
  while (off < delta.length) {
    const op = delta[off++];
    if (op & 0x80) {
      let cpOff = 0, cpLen = 0;
      for (let i = 0; i < 4; i++) if (op & (1 << i)) cpOff |= delta[off++] << (8 * i);
      for (let i = 0; i < 3; i++) if (op & (0x10 << i)) cpLen |= delta[off++] << (8 * i);
      if (cpLen === 0) cpLen = 0x10000;
      base.copy(out, w, cpOff >>> 0, (cpOff >>> 0) + cpLen);
      w += cpLen;
    } else if (op) {
      delta.copy(out, w, off, off + op);
      w += op;
      off += op;
    } else {
      throw new Error('bad delta opcode');
    }
  }
  return out;
}

function treeEntry(tree: Buffer, name: string): string | null {
  let off = 0;
  while (off < tree.length) {
    const sp = tree.indexOf(0x20, off);
    const nul = sp < 0 ? -1 : tree.indexOf(0, sp);
    if (sp < 0 || nul < 0 || nul + 21 > tree.length) throw new HistoryUnreadable('tree object is malformed');
    if (tree.toString('utf-8', sp + 1, nul) === name) {
      // 160000 = gitlink (submodule): its commit lives in another repository.
      if (tree.toString('latin1', off, sp) === '160000') return null;
      return tree.toString('hex', nul + 1, nul + 21);
    }
    off = nul + 21;
  }
  return null;
}

function refTips(commonDir: string, gitDir: string): string[] {
  const tips = new Set<string>();
  const packed = new Map<string, string>();
  const packedRaw = readOptional(path.join(commonDir, 'packed-refs'));
  if (packedRaw) {
    for (const line of packedRaw.toString('utf-8').split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([0-9a-f]{40}) (\S+)$/);
      const peeled = line.match(/^\^([0-9a-f]{40})$/);
      if (m) { packed.set(m[2], m[1]); tips.add(m[1]); }
      else if (peeled) tips.add(peeled[1]);
      else throw new HistoryUnreadable('packed-refs has a line it cannot parse');
    }
  }
  // A ref that names a branch which does not exist yet (unborn HEAD) is null.
  const readRef = (dir: string, name: string, depth = 0): string | null => {
    if (depth > 8) throw new HistoryUnreadable('symbolic ref loop');
    const raw = readOptional(path.join(dir, name));
    if (!raw) return packed.get(name) ?? null;
    const v = raw.toString('utf-8').trim();
    if (/^[0-9a-f]{40}$/.test(v)) return v;
    const m = v.match(/^ref:\s*(.+)$/);
    if (m) return readRef(commonDir, m[1].trim(), depth + 1);
    throw new HistoryUnreadable(`ref ${name} has content it cannot parse`);
  };
  const walk = (dir: string): void => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      if (isAbsent(err)) return;
      throw new HistoryUnreadable(`cannot list refs: ${(err as Error).message}`);
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const raw = readOptional(p);
      if (!raw) continue; // removed while listing
      const v = raw.toString('utf-8').trim();
      if (/^[0-9a-f]{40}$/.test(v)) tips.add(v);
      else if (/^ref:\s*\S/.test(v)) {
        const r = readRef(commonDir, path.relative(commonDir, p).split(path.sep).join('/'));
        if (r) tips.add(r);
      } else throw new HistoryUnreadable(`ref ${e.name} has content it cannot parse`);
    }
  };
  walk(path.join(commonDir, 'refs'));
  const head = readRef(gitDir, 'HEAD');
  if (head) tips.add(head);
  return [...tips];
}

/**
 * Has git ever recorded `file` (an absolute path) in its repository?
 * `maxCommits` bounds the history walk; past it the answer is `unknown`.
 */
export function gitEverTracked(file: string, maxCommits = 200_000): GitHistoryResult {
  try {
    const repo = findRepo(path.dirname(file));
    if (!repo) return { status: 'not-a-repo' };
    let rootReal = repo.root;
    let fileReal = file;
    try { rootReal = fs.realpathSync(repo.root); } catch { /* keep */ }
    try { fileReal = path.join(fs.realpathSync(path.dirname(file)), path.basename(file)); } catch { /* keep */ }
    const rel = path.relative(rootReal, fileReal).split(path.sep).join('/');
    if (!rel || rel.startsWith('..')) return { status: 'unknown', reason: 'file outside work tree' };

    const cfg = readOptional(path.join(repo.commonDir, 'config'))?.toString('utf-8') ?? '';
    if (/objectformat\s*=\s*sha256/i.test(cfg)) return { status: 'unknown', reason: 'sha256 repository' };
    // A shallow clone has cut history: commits before the cut are not here.
    if (readOptional(path.join(repo.commonDir, 'shallow'))) {
      return { status: 'unknown', reason: 'shallow clone (history is incomplete)' };
    }

    if (indexHas(repo.gitDir, rel)) return { status: 'found', where: 'the git index' };

    const store = new ObjectStore(path.join(repo.commonDir, 'objects'));
    const segments = rel.split('/');
    const seenCommits = new Set<string>();
    const seenTrees = new Set<string>();
    const queue = refTips(repo.commonDir, repo.gitDir);

    while (queue.length) {
      let sha = queue.pop()!;
      if (seenCommits.has(sha)) continue;
      seenCommits.add(sha);
      if (seenCommits.size > maxCommits) return { status: 'unknown', reason: 'history too large to scan' };
      // Every reachable object must be readable; a missing one is unknown, not never.
      let obj = store.need(sha);
      // Annotated tags point at the commit.
      for (let hops = 0; obj.type === 'tag'; hops++) {
        const m = obj.data.toString('latin1').match(/^object ([0-9a-f]{40})/);
        if (!m || hops > 16) throw new HistoryUnreadable(`tag ${sha.slice(0, 7)} is malformed`);
        sha = m[1];
        obj = store.need(sha);
      }
      if (obj.type !== 'commit') continue; // a ref to a tree or blob has no history
      const text = obj.data.toString('utf-8');
      const headerEnd = text.indexOf('\n\n');
      const header = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
      const treeSha = header.match(/^tree ([0-9a-f]{40})/m)?.[1];
      if (!treeSha) throw new HistoryUnreadable(`commit ${sha.slice(0, 7)} has no tree`);
      for (const m of header.matchAll(/^parent ([0-9a-f]{40})/gm)) queue.push(m[1]);
      if (seenTrees.has(treeSha)) continue;
      seenTrees.add(treeSha);

      // Absent from a readable tree is "not here"; an unreadable tree throws.
      // A non-tree at a directory position (that name was a file) is "not here" too.
      let cur: string | null = treeSha;
      for (const seg of segments) {
        const tree: { type: string; data: Buffer } = store.need(cur);
        cur = tree.type === 'tree' ? treeEntry(tree.data, seg) : null;
        if (!cur) break;
      }
      if (cur) {
        const subject = headerEnd >= 0 ? text.slice(headerEnd + 2).split('\n')[0] : '';
        return { status: 'found', where: `commit ${sha.slice(0, 7)}${subject ? ` "${subject}"` : ''}` };
      }
    }
    return { status: 'never' };
  } catch (err) {
    return { status: 'unknown', reason: err instanceof Error ? err.message : String(err) };
  }
}
