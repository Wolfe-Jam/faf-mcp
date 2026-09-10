#!/usr/bin/env node
/**
 * Sync the package.json version to every other stamp that carries it.
 * Run: npm run sync-version   (auto on `npm version` via the "version" hook)
 *
 *   project.faf       project.version
 *   server.json       top-level version + packages[].version
 *   CHANGELOG.md      <!-- faf: doc=changelog | latest=vX.Y.Z ... --> meta-stamp
 *   docs/index.html   the version badge (guarded by wjttc-p0-no-false-hosted-claim)
 *   AGENTS.md         the "· vX.Y.Z" stamp on the facts line
 *
 * Doc Gate 101 (/pubpro) refuses on any drift between these; this is what
 * keeps them from drifting in the first place.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf-8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);
const version = JSON.parse(read('package.json')).version;
const changed = [];

function sub(file, pattern, replacement, label) {
  const before = read(file);
  const after = before.replace(pattern, replacement);
  if (after !== before) { write(file, after); changed.push(`${file} (${label})`); }
  else if (!pattern.test(before)) console.warn(`⚠️  ${file}: no ${label} stamp found — nothing synced`);
}

try {
  sub('project.faf', /^(\s*version:\s*).+$/m, `$1${version}`, 'project.version');

  const serverJson = JSON.parse(read('server.json'));
  let touched = false;
  if (serverJson.version !== version) { serverJson.version = version; touched = true; }
  for (const p of serverJson.packages ?? []) if (p.version !== version) { p.version = version; touched = true; }
  if (touched) { write('server.json', JSON.stringify(serverJson, null, 2) + '\n'); changed.push('server.json (version, packages[].version)'); }

  sub('CHANGELOG.md', /(<!-- faf: doc=changelog \| latest=v)\d+\.\d+\.\d+/, `$1${version}`, 'latest= meta-stamp');
  sub('docs/index.html', /(id="versionBadge"[^>]*>[^<]*v)\d+\.\d+\.\d+/, `$1${version}`, 'version badge');
  sub('AGENTS.md', /(·\s*v)\d+\.\d+\.\d+(?=\s*$)/m, `$1${version}`, 'facts-line stamp');

  console.log(changed.length ? `Synced v${version} → ${changed.join(', ')}` : `All stamps already at v${version}`);
} catch (error) {
  console.error('Failed to sync version:', error.message);
  process.exit(1);
}
