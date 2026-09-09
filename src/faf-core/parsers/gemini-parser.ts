/**
 * GEMINI.md Parser
 *
 * Parses Google Gemini CLI GEMINI.md files for bidirectional
 * interoperability with FAF.
 *
 * GEMINI.md Structure:
 * - H1: Project name
 * - H2: Section headers (General Instructions, Coding Style, etc.)
 * - Bullets: Specific guidelines
 *
 * Ported from faf-cli for faf-mcp v4.5.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { injectFafBlock } from '../inject';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { fafMetaTag, filled, fmtVal, present, slotLabel, NON_STACK } from './interop-render.js';

// ============================================================================
// Types
// ============================================================================

export interface GeminiMdSection {
  title: string;
  content: string[];
}

export interface GeminiMdFile {
  projectName: string;
  sections: GeminiMdSection[];
}

export interface FafFromGemini {
  project: {
    name: string;
    description: string;
    type: string;
    rules: string[];
    guidelines: string[];
    codingStyle: string[];
  };
  metadata: {
    source: string;
    imported: string;
  };
}

export interface GeminiImportResult {
  success: boolean;
  faf: FafFromGemini;
  warnings: string[];
  sectionsFound: string[];
}

export interface GeminiExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse GEMINI.md file content
 */
export function parseGeminiMd(content: string): GeminiMdFile {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let projectName = 'Unknown Project';
  const sections: GeminiMdSection[] = [];
  let currentSection: GeminiMdSection | null = null;

  for (const line of lines) {
    // H1 = Project name. Strips faf-cli's current `# GEMINI.md — <name>`
    // shape (v3.0) as well as the legacy bare `# <name>` / `# Project: <name>`.
    const h1Match = line.match(/^#\s+(?:Project:\s*|GEMINI\.md\s+—\s+)?(.+)$/);
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
 * Convert GEMINI.md sections to FAF structure
 */
function categorizeSections(sections: GeminiMdSection[]): {
  rules: string[];
  guidelines: string[];
  codingStyle: string[];
} {
  const rules: string[] = [];
  const guidelines: string[] = [];
  const codingStyle: string[] = [];

  for (const section of sections) {
    const titleLower = section.title.toLowerCase();

    if (titleLower.includes('coding') || titleLower.includes('style') || titleLower.includes('format')) {
      codingStyle.push(...section.content);
    } else if (titleLower.includes('rule') || titleLower.includes('constraint') || titleLower.includes('requirement')) {
      rules.push(...section.content);
    } else {
      // Default to guidelines
      guidelines.push(...section.content);
    }
  }

  return { rules, guidelines, codingStyle };
}

// ============================================================================
// Import: GEMINI.md -> FAF
// ============================================================================

export async function geminiImport(geminiPath: string): Promise<GeminiImportResult> {
  const warnings: string[] = [];

  // Check if file exists
  try {
    await fs.access(geminiPath);
  } catch {
    return {
      success: false,
      faf: createEmptyFaf(),
      warnings: [`GEMINI.md not found: ${geminiPath}`],
      sectionsFound: [],
    };
  }

  // Read and parse
  const content = await fs.readFile(geminiPath, 'utf-8');
  const parsed = parseGeminiMd(content);

  if (parsed.sections.length === 0) {
    warnings.push('No sections found in GEMINI.md');
  }

  const { rules, guidelines, codingStyle } = categorizeSections(parsed.sections);

  const faf: FafFromGemini = {
    project: {
      name: parsed.projectName,
      description: `Imported from GEMINI.md`,
      type: 'gemini-import',
      rules,
      guidelines,
      codingStyle,
    },
    metadata: {
      source: 'gemini',
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

function createEmptyFaf(): FafFromGemini {
  return {
    project: {
      name: 'Unknown',
      description: '',
      type: 'gemini-import',
      rules: [],
      guidelines: [],
      codingStyle: [],
    },
    metadata: {
      source: 'gemini',
      imported: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Export: FAF -> GEMINI.md
// ============================================================================

/**
 * Render GEMINI.md content from .faf data.
 *
 * v3.0: ported from faf-cli's CURRENT `renderGeminiMd`
 * (~/FAF/cli/src/interop/gemini.ts, faf-cli 7.11.0) — matches Gemini CLI's
 * own GEMINI.md convention (hierarchical, concatenation-friendly,
 * `@file.md`-importable): commands, key files, and confirmation-required
 * actions, not the AGENTS.md guardrail ladder — a different spec for a
 * different reader.
 */
export async function geminiExport(
  fafContent: any,
  outputPath: string
): Promise<GeminiExportResult> {
  const warnings: string[] = [];
  const { SLOT_BY_PATH } = await fafCli;

  const data = fafContent ?? {};
  const project = data.project ?? {};
  const instant = data.instant_context ?? {};
  const commands = data.commands;
  const keyFiles: string[] | undefined = data.key_files ?? instant.key_files;

  const entries: [string, string][] = commands
    ? Object.entries(commands).filter(([, v]) => present(v)).map(([k, v]): [string, string] => [k, fmtVal(v)])
    : [];
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
  const verifyCmds = [...testCmds, ...lintCmds];

  const lines: string[] = [];

  lines.push(fafMetaTag(data));
  lines.push('');
  lines.push(`# GEMINI.md — ${project.name ?? 'Project'}`);
  lines.push('');
  lines.push('> Authored from project.faf — refresh with `faf_gemini`.');
  lines.push('');

  if (project.name) lines.push(`Project: ${project.name}`);
  if (project.goal) lines.push(`Goal: ${project.goal}`);
  if (project.main_language) lines.push(`Language: ${project.main_language}`);

  if (setupCmds.length) {
    lines.push('');
    lines.push('## Setup & build');
    lines.push('');
    lines.push('```bash');
    for (const [k, v] of setupCmds) lines.push(`${v}    # ${k}`);
    lines.push('```');
  }

  if (verifyCmds.length) {
    lines.push('');
    lines.push('## Test & verify');
    lines.push('');
    lines.push('```bash');
    for (const [, v] of verifyCmds) lines.push(String(v));
    lines.push('```');
  }

  if (keyFiles && keyFiles.length) {
    lines.push('');
    lines.push('## Where things live');
    lines.push('');
    for (const f of keyFiles) lines.push(`- \`${f}\``);
  }

  if (data.stack) {
    const stackLines: string[] = [];
    for (const [key, value] of Object.entries(data.stack)) {
      if (NON_STACK.has(key)) continue;
      if (filled(value)) stackLines.push(`- ${slotLabel(`stack.${key}`, SLOT_BY_PATH)}: ${value.trim()}`);
    }
    if (stackLines.length) {
      lines.push('');
      lines.push('## Stack');
      for (const s of stackLines) lines.push(s);
    }
  }

  // Universal safety default — always renders, same as AGENTS.md's Guardrails.
  lines.push('');
  lines.push('## Before changing things');
  lines.push('');
  lines.push('- Ask first: dependency installs, deletions, migrations, schema changes, publish/release.');
  lines.push('- Never: force-push · push straight to `main` · commit secrets.');

  lines.push('');

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

export async function detectGeminiMd(basePath: string): Promise<string | null> {
  const possiblePaths = [
    path.join(basePath, 'GEMINI.md'),
    path.join(basePath, 'gemini.md'),
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
 * Check for global GEMINI.md
 */
export async function detectGlobalGeminiMd(): Promise<string | null> {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const globalPath = path.join(home, '.gemini', 'GEMINI.md');

  try {
    await fs.access(globalPath);
    return globalPath;
  } catch {
    return null;
  }
}
