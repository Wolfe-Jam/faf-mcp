/**
 * Shared render helpers for the AGENTS.md / .cursorrules / GEMINI.md
 * exporters (agents-parser.ts / cursorrules-parser.ts / gemini-parser.ts).
 *
 * Ported from faf-cli's current interop layer (~/FAF/cli/src/interop/
 * {labels,claude}.ts — faf-cli 7.11.0). These are internal faf-cli helpers,
 * not part of its public API — only the slot registry itself (SLOT_BY_PATH)
 * is a real export, and it's composed live via the bridge below, never
 * copied. `titleLabel`/`filled`/`present`/`fmtVal`/`fafMetaTag` are small,
 * stable, pure functions with no public export to compose instead — this
 * is a faithful, comment-labeled port, the same pattern rust-faf-mcp
 * already uses for cross-language interop parity (kept in sync by hand).
 * Here the reason is "not exported yet" rather than a language boundary;
 * if faf-cli ever exports these directly, this file collapses to a
 * re-export. Kept in ONE place so agents/cursorrules/gemini can't drift
 * from each other the way the pre-3.0 vendored copies drifted from faf-cli.
 */

/** All-caps acronym tokens that stay upper-cased inside a Title-Cased label.
 *  Port of faf-cli interop/labels.ts's ACRONYMS. */
const ACRONYMS = new Set([
  'API', 'CI', 'CD', 'MCP', 'CLI', 'SDK', 'UI', 'UX', 'AI', 'ML', 'DB', 'ORM',
  'OS', 'HTTP', 'HTTPS', 'REST', 'RPC', 'JSON', 'YAML', 'XML', 'SQL', 'CSS',
  'HTML', 'AWS', 'GCP', 'CDN', 'DNS', 'JWT', 'ID', 'IP', 'URL', 'URI', 'TS', 'JS',
]);

/** snake_case -> Title Case, acronym-aware. Port of faf-cli's titleLabel(). */
export function titleLabel(key: string): string {
  return key
    .split('_')
    .map((w) => {
      if (!w) return w;
      const up = w.toUpperCase();
      return ACRONYMS.has(up) ? up : w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/** A slot value that carries real content (not empty, not slotignored).
 *  Port of faf-cli's filled(). */
export function filled(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '' && v.trim() !== 'slotignored';
}

/** A value carrying real content — non-empty, not slotignored, non-empty
 *  array. Port of faf-cli's present() (interop/agents.ts + gemini.ts). */
export function present(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '' && v !== 'slotignored' && !(Array.isArray(v) && v.length === 0);
}

/** Render a slot value for inline display (arrays -> comma list). */
export function fmtVal(v: unknown): string {
  return Array.isArray(v) ? v.join(', ') : String(v);
}

/** Stack keys that are context/marketing, not actual stack. Kept out of the
 *  Stack section (mirrors faf-cli's NON_STACK in agents.ts/gemini.ts). */
export const NON_STACK = new Set(['target_user', 'core_problem', 'mission_purpose']);

/** Preference keys that describe human<->assistant interaction, NOT repo
 *  conventions. Excluded from AGENTS.md's Conventions section (mirrors
 *  faf-cli's HUMAN_PREF in agents.ts). */
export const HUMAN_PREF = new Set([
  'commit_style', 'communication', 'response_style', 'explanation_level', 'explanations', 'documentation', 'code_first',
]);

/** Minimal shape of faf-cli's real SlotDef, just enough for label lookup. */
export interface SlotLabelEntry {
  label?: string;
}

/** The canonical display label for a .faf slot path, sourced from faf-cli's
 *  real slot registry — `stack.cicd` -> "CI/CD", `stack.api_type` -> "API".
 *  `slotByPath` is faf-cli's real, live SLOT_BY_PATH (composed via the
 *  bridge by the caller, not copied) — resolves legacy OR canonical paths.
 *  Falls back to the acronym-aware Title-Caser for off-registry freeform
 *  keys. Port of faf-cli's slotLabel(), parameterized on the map since the
 *  bridge resolution is async and callers already have it in hand. */
export function slotLabel(path: string, slotByPath: Map<string, SlotLabelEntry>): string {
  const slot = slotByPath.get(path);
  if (slot?.label) return slot.label;
  const key = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path;
  return titleLabel(key);
}

/** Build the canonical 2-line FAF stamp. Port of faf-cli's fafMetaTag()
 *  (interop/claude.ts) — spec: cross-ai-2-line-meta-stamp.
 *  Line 1 — positional identity: `name | lang | type | description`
 *  Line 2 — key=value navigation/state: `claim=… | family=…` */
export function fafMetaTag(
  data: Record<string, any>,
  opts: { claim?: string; family?: string } = {},
): string {
  const project = data?.project ?? {};
  const name = String(project.name ?? '').trim();
  const lang = String(project.main_language ?? '').trim();
  const type = String(project.type ?? '').trim();
  const desc = String(project.goal ?? '').trim();
  const line1 = `<!-- faf: ${[name, lang, type, desc].join(' | ')} -->`;
  const line2 = `<!-- faf: claim=${opts.claim ?? 'project.faf'} | family=${opts.family ?? 'FAF'} -->`;
  return `${line1}\n${line2}`;
}
