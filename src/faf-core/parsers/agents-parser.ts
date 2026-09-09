/**
 * AGENTS.md Parser
 *
 * Parses OpenAI Codex / Linux Foundation AGENTS.md files for bidirectional
 * interoperability with FAF.
 *
 * AGENTS.md Structure:
 * - H1: Project name
 * - H2: Section headers (Project Overview, Tech Stack, etc.)
 * - Bullets: Specific guidelines
 *
 * Ported from faf-cli for faf-mcp v4.5.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { injectFafBlock } from '../inject';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { fafMetaTag, filled, fmtVal, present, slotLabel, titleLabel, HUMAN_PREF, NON_STACK } from './interop-render.js';

// ============================================================================
// Types
// ============================================================================

export interface AgentsMdSection {
  title: string;
  content: string[];
}

export interface AgentsMdFile {
  projectName: string;
  sections: AgentsMdSection[];
}

export interface FafFromAgents {
  project: {
    name: string;
    description: string;
    type: string;
    rules: string[];
    guidelines: string[];
    codingStyle: string[];
    buildCommands: string[];
    architecture: string[];
  };
  metadata: {
    source: string;
    imported: string;
  };
}

export interface AgentsImportResult {
  success: boolean;
  faf: FafFromAgents;
  warnings: string[];
  sectionsFound: string[];
}

export interface AgentsExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse AGENTS.md file content
 */
export function parseAgentsMd(content: string): AgentsMdFile {
  // Strip BOM and normalize line endings (Windows \r\n, old Mac \r)
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let projectName = 'Unknown Project';
  const sections: AgentsMdSection[] = [];
  let currentSection: AgentsMdSection | null = null;

  for (const line of lines) {
    // H1 = Project name. Strips faf-cli's current `# AGENTS.md — <name>`
    // shape (v3.0) as well as the legacy bare `# <name>` / `# Project: <name>`.
    const h1Match = line.match(/^#\s+(?:Project:\s*|AGENTS\.md\s+—\s+)?(.+)$/);
    if (h1Match) {
      projectName = h1Match[1].trim();
      continue;
    }

    // H2 = Section header
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: h2Match[1].trim(),
        content: [],
      };
      continue;
    }

    // Bullet point
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentSection) {
      currentSection.content.push(bulletMatch[1].trim());
    }
  }

  // Push last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { projectName, sections };
}

/**
 * Categorize AGENTS.md sections into FAF structure
 */
function categorizeSections(sections: AgentsMdSection[]): {
  rules: string[];
  guidelines: string[];
  codingStyle: string[];
  buildCommands: string[];
  architecture: string[];
} {
  const rules: string[] = [];
  const guidelines: string[] = [];
  const codingStyle: string[] = [];
  const buildCommands: string[] = [];
  const architecture: string[] = [];

  for (const section of sections) {
    const titleLower = section.title.toLowerCase();

    if (titleLower.includes('build') || titleLower.includes('test') || titleLower.includes('command')) {
      buildCommands.push(...section.content);
    } else if (titleLower.includes('architect') || titleLower.includes('structure') || titleLower.includes('design')) {
      architecture.push(...section.content);
    } else if (titleLower.includes('coding') || titleLower.includes('style') || titleLower.includes('format') || titleLower.includes('guideline')) {
      codingStyle.push(...section.content);
    } else if (titleLower.includes('rule') || titleLower.includes('constraint') || titleLower.includes('requirement') || titleLower.includes('warning')) {
      rules.push(...section.content);
    } else {
      // Default to guidelines (includes "Project Overview", "Tech Stack", etc.)
      guidelines.push(...section.content);
    }
  }

  return { rules, guidelines, codingStyle, buildCommands, architecture };
}

// ============================================================================
// Import: AGENTS.md -> FAF
// ============================================================================

export async function agentsImport(agentsPath: string): Promise<AgentsImportResult> {
  const warnings: string[] = [];

  // Check if file exists
  try {
    await fs.access(agentsPath);
  } catch {
    return {
      success: false,
      faf: createEmptyFaf(),
      warnings: [`AGENTS.md not found: ${agentsPath}`],
      sectionsFound: [],
    };
  }

  // Read and parse
  const content = await fs.readFile(agentsPath, 'utf-8');
  const parsed = parseAgentsMd(content);

  if (parsed.sections.length === 0) {
    warnings.push('No sections found in AGENTS.md');
  }

  const { rules, guidelines, codingStyle, buildCommands, architecture } = categorizeSections(parsed.sections);

  const faf: FafFromAgents = {
    project: {
      name: parsed.projectName,
      description: `Imported from AGENTS.md`,
      type: 'agents-import',
      rules,
      guidelines,
      codingStyle,
      buildCommands,
      architecture,
    },
    metadata: {
      source: 'agents',
      imported: new Date().toISOString(),
    },
  };

  return {
    success: true,
    faf,
    warnings,
    sectionsFound: parsed.sections.map(s => s.title),
  };
}

function createEmptyFaf(): FafFromAgents {
  return {
    project: {
      name: 'Unknown',
      description: '',
      type: 'agents-import',
      rules: [],
      guidelines: [],
      codingStyle: [],
      buildCommands: [],
      architecture: [],
    },
    metadata: {
      source: 'agents',
      imported: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Export: FAF -> AGENTS.md
// ============================================================================

/**
 * Author an AGENTS.md from .faf data (+ repo enrichment at export).
 *
 * v3.0: ported from faf-cli's CURRENT `renderAgentsMd` (~/FAF/cli/src/
 * interop/agents.ts, faf-cli 7.11.0 — "The AGENTS.md Edition") — replaces
 * the v4.5.0-vintage section set (Project Overview / Tech Stack / Code
 * Style Guidelines / Build and Test Commands / Architecture / General
 * Instructions) with faf-cli's current shape: orientation · setup · verify
 * · where things live · conventions · three-tier Guardrails · Definition
 * of Done · When stuck · Security & secrets · Commit & PR (branch-aware) ·
 * Stack (slot-registry-driven labels). Deterministic projection from
 * curated TRUTH — facts, not freewritten prose. Human Context (who/why
 * marketing) is intentionally omitted — that belongs in README/project.faf,
 * not agent ops (matches faf-cli's own doctrine).
 */
export async function agentsExport(
  fafContent: any,
  outputPath: string
): Promise<AgentsExportResult> {
  const warnings: string[] = [];
  const { SLOT_BY_PATH } = await fafCli;

  const data = fafContent ?? {};
  const project = data.project ?? {};
  const ai = data.ai_instructions ?? {};
  const prefs = data.preferences ?? {};
  const instant = data.instant_context ?? {};
  const security = data.security;
  const commands = data.commands;
  const keyFiles: string[] | undefined = data.key_files ?? instant.key_files;
  // Integration branch — git-flow repos PR into dev/develop, not main.
  const branch = present(project.default_branch) ? String(project.default_branch) : 'main';

  const entries = commands ? Object.entries(commands).filter(([, v]) => present(v)) : [];
  // Mutually exclusive so a key like `test:check` classifies ONCE (as a test).
  const testCmds = entries.filter(([k]) => /test/i.test(k));
  const lintCmds = entries.filter(([k]) => /lint|check/i.test(k) && !/test/i.test(k));
  const setupRaw = entries.filter(([k]) => !/test|lint|check/i.test(k));
  // Stable setup order: install -> build -> dev -> start -> other.
  const setupRank = (k: string): number => {
    const n = k.toLowerCase();
    if (/install|deps/.test(n)) return 0;
    if (/^build$|build/.test(n) && !/rebuild/.test(n)) return 1;
    if (/^dev$|develop/.test(n)) return 2;
    if (/^start$|run/.test(n)) return 3;
    return 4;
  };
  const setupCmds = [...setupRaw].sort(
    (a, b) => setupRank(a[0]) - setupRank(b[0]) || a[0].localeCompare(b[0]),
  );
  // Verify bar: tests first, then lint/typecheck.
  const verifyCmds = [...testCmds, ...lintCmds];
  const testCmd = testCmds[0]?.[1] as string | undefined;
  const buildCmd = setupCmds.find(([k]) => /build/i.test(k))?.[1] as string | undefined;

  const lines: string[] = [];
  const push = (s = '') => lines.push(s);

  push(fafMetaTag(data));
  push();
  push(`# AGENTS.md — ${project.name ?? 'Project'}`);
  push();

  // Orientation — one line: what it is · language · type · version
  const bits: string[] = [];
  if (project.main_language) bits.push(String(project.main_language));
  if (present(project.type)) bits.push(`type: ${String(project.type)}`);
  if (present(project.version)) bits.push(`v${String(project.version)}`);
  let orientation = project.goal ? String(project.goal).trim() : '';
  if (bits.length) orientation += (orientation ? ' — ' : '') + bits.join(' · ');
  if (orientation) {
    push(orientation);
    push();
  }
  // NOTE: deliberately does not spell out the literal `<!-- faf:start -->`/
  // `<!-- faf:end -->` marker tokens in this prose — injectFafBlock finds
  // markers by plain substring search, so echoing them verbatim inside the
  // managed block collides with that search and corrupts re-injection on
  // the next sync (found the hard way: faf-cli's own current renderAgentsMd
  // does spell them out and would hit the same self-inflicted bug).
  push(
    '> Authored from project.faf — refresh with `faf_agents`. Hand-written content outside the faf-managed block above is preserved.',
  );
  push();

  // Setup & build
  if (setupCmds.length) {
    push('## Setup & build');
    push();
    push('```bash');
    for (const [k, v] of setupCmds) push(`${v}    # ${k}`);
    push('```');
    push();
  }

  // Run the tests — verify bar (tests + lint/typecheck)
  if (verifyCmds.length) {
    push('## Run the tests');
    push();
    push('```bash');
    for (const [, v] of verifyCmds) push(String(v));
    push('```');
    push();
  }

  // Where things live — a Path | Role table when any entry carries a
  // " — role" annotation; a plain list when they're all bare paths.
  if (keyFiles && keyFiles.length) {
    push('## Where things live');
    push();
    const rows = keyFiles.map((f) => {
      const s = String(f);
      const at = s.indexOf(' — ');
      return at > 0 ? { path: s.slice(0, at), role: s.slice(at + 3) } : { path: s, role: '' };
    });
    if (rows.some((r) => r.role)) {
      push('| Path | Role |');
      push('|------|------|');
      for (const r of rows) push(`| \`${r.path}\` | ${r.role} |`);
    } else {
      for (const r of rows) push(`- \`${r.path}\``);
    }
    push();
  }

  // Conventions — real repo constraints only (human<->assistant prefs excluded)
  const conventions = new Map<string, string>();
  const collect = (obj: Record<string, unknown> | undefined) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
      if (HUMAN_PREF.has(k) || !present(v)) continue;
      const label = titleLabel(k);
      if (!conventions.has(label)) conventions.set(label, fmtVal(v));
    }
  };
  collect(ai.working_style);
  collect(prefs);
  const detectedConv: unknown[] = data.conventions ?? [];
  if (conventions.size || detectedConv.length) {
    push('## Conventions');
    push();
    for (const [label, val] of conventions) push(`- **${label}:** ${val}`);
    for (const c of detectedConv) if (present(c)) push(`- ${c}`);
    push();
  }

  // Guardrails — Always / Ask first / Never (three-tier)
  const warningsList: unknown[] = (ai.warnings ?? []).filter((w: unknown) => present(w));
  const always: string[] = ['read the tree'];
  if (testCmd) always.push(`run the tests (\`${testCmd}\`)`);
  if (buildCmd) always.push('build the project');
  for (const [, v] of lintCmds.slice(0, 1)) always.push(`\`${v}\``);

  push('## Guardrails');
  push();
  for (const w of warningsList) push(`- ${w}`);
  push(`- **Always OK:** ${[...new Set(always)].join(' · ')}.`);
  push('- **Ask first:** dependency installs, deletions, migrations, schema changes, publish/release.');
  push(`- **Never:** force-push · push straight to \`${branch}\` (branch and open a PR) · commit secrets.`);
  push();

  // Definition of Done
  const dod: string[] = [];
  for (const [, v] of lintCmds) dod.push(`\`${v}\` exits 0`);
  for (const [, v] of testCmds) dod.push(`\`${v}\` passes`);
  dod.push('changes committed with a conventional message');
  push('## Definition of Done');
  push();
  push(`Done when: ${[...new Set(dod)].join(' · ')}.`);
  push();

  // When stuck
  push('## When stuck');
  push();
  push(
    `Ask a clarifying question, propose a short plan, or open a draft PR with notes — do not push large speculative changes to \`${branch}\`.`,
  );
  push();

  // Security & secrets — when detected (never the values)
  if (security && (present(security.secrets) || (security.never ?? []).length)) {
    push('## Security & secrets');
    push();
    if (present(security.secrets)) {
      const ex = present(security.example) ? ` (see \`${security.example}\`)` : '';
      push(`- Secrets live in \`${security.secrets}\`${ex}. Never read or commit them.`);
    }
    for (const n of security.never ?? []) if (present(n)) push(`- Never read or commit \`${n}\`.`);
    push();
  }

  // Commit & PR — always (defaults + optional commit_style)
  push('## Commit & PR');
  push();
  if (present(prefs.commit_style)) {
    push(`- Commit style: ${fmtVal(prefs.commit_style)}`);
  } else {
    push('- Conventional Commits preferred (`feat:`, `fix:`, `chore:`, …).');
  }
  push(`- Branch off \`${branch}\` and open a PR — never commit to \`${branch}\` directly.`);
  push('- If build/test scripts or layout change, refresh this file in the **same PR** (`faf_agents`).');
  push();

  // Stack (reference) — actual stack only; omit empty / all-slotignored noise
  if (data.stack) {
    const stackLines: string[] = [];
    for (const [key, value] of Object.entries(data.stack)) {
      if (NON_STACK.has(key)) continue;
      if (filled(value)) stackLines.push(`- **${slotLabel(`stack.${key}`, SLOT_BY_PATH)}:** ${value.trim()}`);
    }
    if (stackLines.length) {
      push('## Stack');
      push();
      for (const s of stackLines) push(s);
      push();
    }
  }

  // No Human Context section — who/why marketing is README/project.faf, not agent ops.

  const gen = data.generated;
  if (present(gen)) push(`*Context authored: ${String(gen)}*`);

  // Write file — non-destructive: inject/update the faf block, preserve the rest.
  const content = lines.join('\n');
  await injectFafBlock(outputPath, content);

  return {
    success: true,
    filePath: outputPath,
    warnings,
  };
}

// ============================================================================
// Detection
// ============================================================================

export async function detectAgentsMd(basePath: string): Promise<string | null> {
  const possiblePaths = [
    path.join(basePath, 'AGENTS.md'),
    path.join(basePath, 'agents.md'),
    path.join(basePath, 'Agents.md'),
  ];

  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check for global AGENTS.md (~/.codex/AGENTS.md)
 */
export async function detectGlobalAgentsMd(): Promise<string | null> {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const globalPath = path.join(home, '.codex', 'AGENTS.md');

  try {
    await fs.access(globalPath);
    return globalPath;
  } catch {
    return null;
  }
}
