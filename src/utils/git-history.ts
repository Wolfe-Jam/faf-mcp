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
 * Read-only. Any parse failure, a SHA-256 repository, or a walk past the
 * budget returns `unknown` rather than throwing; the caller decides.
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

function findRepo(start: string): Repo | null {
  let dir = path.resolve(start);
  for (;;) {
    const dotGit = path.join(dir, '.git');
    let st: fs.Stats | null = null;
    try { st = fs.statSync(dotGit); } catch { st = null; }
    if (st) {
      let gitDir = dotGit;
      if (st.isFile()) {
        const m = fs.readFileSync(dotGit, 'utf-8').match(/^gitdir:\s*(.+)\s*$/m);
        if (!m) return null;
        gitDir = path.resolve(dir, m[1].trim());
      }
      let commonDir = gitDir;
      try {
        commonDir = path.resolve(gitDir, fs.readFileSync(path.join(gitDir, 'commondir'), 'utf-8').trim());
      } catch { /* not a linked worktree */ }
      return { gitDir, commonDir, root: dir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Paths staged in the index (versions 2, 3, 4). */
function indexHas(gitDir: string, rel: string): boolean {
  let buf: Buffer;
  try { buf = fs.readFileSync(path.join(gitDir, 'index')); } catch { return false; }
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'DIRC') return false;
  const version = buf.readUInt32BE(4);
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
      name = prev.slice(0, prev.length - strip) + buf.toString('utf-8', off, end);
      off = end + 1;
    } else {
      const end = buf.indexOf(0, off);
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
    try { names = fs.readdirSync(dir); } catch { names = []; }
    for (const n of names) {
      if (!n.endsWith('.idx')) continue;
      try {
        const idx = fs.readFileSync(path.join(dir, n));
        const pack = fs.readFileSync(path.join(dir, n.replace(/\.idx$/, '.pack')));
        if (idx.readUInt32BE(0) !== 0xff744f63 || idx.readUInt32BE(4) !== 2) continue;
        packs.push({ idx, pack, count: idx.readUInt32BE(8 + 255 * 4) });
      } catch { /* unreadable pack: skip */ }
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
      if (!base) throw new Error('missing delta base');
      return { type: base.type, data: applyDelta(base.data, inflateSync(buf.subarray(off + 20))) };
    }
    const t = OBJ_TYPES[type];
    if (!t) throw new Error(`bad pack object type ${type}`);
    return { type: t, data: inflateSync(buf.subarray(off)) };
  }

  read(hex: string, depth = 0): { type: string; data: Buffer } | null {
    try {
      const raw = inflateSync(fs.readFileSync(path.join(this.objectsDir, hex.slice(0, 2), hex.slice(2))));
      const nul = raw.indexOf(0);
      return { type: raw.toString('latin1', 0, raw.indexOf(0x20)), data: raw.subarray(nul + 1) };
    } catch { /* not loose */ }
    const sha = Buffer.from(hex, 'hex');
    for (const p of this.loadPacks()) {
      const off = this.packOffset(p, sha);
      if (off >= 0) return this.readPacked(p, off, depth);
    }
    return null;
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
    const nul = tree.indexOf(0, sp);
    if (tree.toString('utf-8', sp + 1, nul) === name) return tree.toString('hex', nul + 1, nul + 21);
    off = nul + 21;
  }
  return null;
}

function refTips(commonDir: string, gitDir: string): string[] {
  const tips = new Set<string>();
  const readRef = (dir: string, name: string): string | null => {
    try {
      const v = fs.readFileSync(path.join(dir, name), 'utf-8').trim();
      if (/^[0-9a-f]{40}$/.test(v)) return v;
      const m = v.match(/^ref:\s*(.+)$/);
      if (m) return readRef(commonDir, m[1]) ?? packed.get(m[1]) ?? null;
    } catch { /* missing */ }
    return null;
  };
  const packed = new Map<string, string>();
  try {
    for (const line of fs.readFileSync(path.join(commonDir, 'packed-refs'), 'utf-8').split('\n')) {
      const m = line.match(/^([0-9a-f]{40}) (\S+)/);
      if (m) { packed.set(m[2], m[1]); tips.add(m[1]); }
      const peeled = line.match(/^\^([0-9a-f]{40})/);
      if (peeled) tips.add(peeled[1]);
    }
  } catch { /* none */ }
  const walk = (dir: string): void => {
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        try {
          const v = fs.readFileSync(p, 'utf-8').trim();
          if (/^[0-9a-f]{40}$/.test(v)) tips.add(v);
        } catch { /* unreadable */ }
      }
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

    try {
      const cfg = fs.readFileSync(path.join(repo.commonDir, 'config'), 'utf-8');
      if (/objectformat\s*=\s*sha256/i.test(cfg)) return { status: 'unknown', reason: 'sha256 repository' };
    } catch { /* no config */ }

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
      let obj = store.read(sha);
      // Annotated tags point at the commit.
      while (obj && obj.type === 'tag') {
        const m = obj.data.toString('latin1').match(/^object ([0-9a-f]{40})/);
        if (!m) { obj = null; break; }
        sha = m[1];
        obj = store.read(sha);
      }
      if (!obj || obj.type !== 'commit') continue; // shallow / missing: skip
      const text = obj.data.toString('utf-8');
      const headerEnd = text.indexOf('\n\n');
      const header = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
      const treeSha = header.match(/^tree ([0-9a-f]{40})/m)?.[1];
      for (const m of header.matchAll(/^parent ([0-9a-f]{40})/gm)) queue.push(m[1]);
      if (!treeSha || seenTrees.has(treeSha)) continue;
      seenTrees.add(treeSha);

      let cur: string | null = treeSha;
      for (const seg of segments) {
        const tree: { type: string; data: Buffer } | null = cur ? store.read(cur) : null;
        cur = tree && tree.type === 'tree' ? treeEntry(tree.data, seg) : null;
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
