/**
 * .cursorrules Parser
 *
 * Parses Cursor IDE .cursorrules files for bidirectional
 * interoperability with FAF.
 *
 * .cursorrules Structure:
 * - Free-form markdown with sections
 * - H2: Section headers (optional)
 * - Bullets/paragraphs: Guidelines and rules
 *
 * Note: This generates legacy .cursorrules (single file).
 * The new .cursor/rules/ MDC directory format is a future enhancement.
 *
 * Ported from faf-cli for faf-mcp v4.5.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { injectFafBlock } from '../inject';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { fafMetaTag, filled, slotLabel } from './interop-render.js';

// ============================================================================
// Types
// ============================================================================

export interface CursorRulesSection {
  title: string;
  content: string[];
}

export interface CursorRulesFile {
  projectName: string;
  sections: CursorRulesSection[];
  rawLines: string[];
}

export interface FafFromCursor {
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

export interface CursorImportResult {
  success: boolean;
  faf: FafFromCursor;
  warnings: string[];
  sectionsFound: string[];
}

export interface CursorExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse .cursorrules file content
 */
export function parseCursorRules(content: string): CursorRulesFile {
  // Strip BOM and normalize line endings (Windows \r\n, old Mac \r)
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let projectName = 'Unknown Project';
  const sections: CursorRulesSection[] = [];
  let currentSection: CursorRulesSection | null = null;
  const rawLines: string[] = [];

  for (const line of lines) {
    rawLines.push(line);

    // Skip faf's own block markers — they are not headings or content.
    if (line.trim() === '# faf:start' || line.trim() === '# faf:end') continue;

    // faf-cli's current .cursorrules shape (v3.0) has no project-name H1 at
    // all — just `# .cursorrules` then a comment line naming the project.
    // Recognize that comment line explicitly, and skip the bare file-type
    // header so it never gets mistaken for a project name below.
    const authoredMatch = line.match(/^#\s+Authored from project\.faf\s+—\s+(.+)$/);
    if (authoredMatch) {
      projectName = authoredMatch[1].trim();
      continue;
    }
    if (line.trim() === '# .cursorrules') continue;

    // H1 = Project name (legacy/hand-written .cursorrules fallback)
    const h1Match = line.match(/^#\s+(?:Project:\s*)?(.+)$/);
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
      continue;
    }

    // Non-empty line in a section (paragraph text)
    const trimmed = line.trim();
    if (trimmed && currentSection && !trimmed.startsWith('#')) {
      currentSection.content.push(trimmed);
    }
  }

  // Push last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { projectName, sections, rawLines };
}

/**
 * Categorize .cursorrules sections into FAF structure
 */
function categorizeSections(sections: CursorRulesSection[]): {
  rules: string[];
  guidelines: string[];
  codingStyle: string[];
} {
  const rules: string[] = [];
  const guidelines: string[] = [];
  const codingStyle: string[] = [];

  for (const section of sections) {
    const titleLower = section.title.toLowerCase();

    if (titleLower.includes('coding') || titleLower.includes('style') || titleLower.includes('format') || titleLower.includes('convention')) {
      codingStyle.push(...section.content);
    } else if (titleLower.includes('rule') || titleLower.includes('constraint') || titleLower.includes('requirement') || titleLower.includes('preference')) {
      rules.push(...section.content);
    } else {
      // Default to guidelines
      guidelines.push(...section.content);
    }
  }

  return { rules, guidelines, codingStyle };
}

// ============================================================================
// Import: .cursorrules -> FAF
// ============================================================================

export async function cursorImport(cursorPath: string): Promise<CursorImportResult> {
  const warnings: string[] = [];

  // Check if file exists
  try {
    await fs.access(cursorPath);
  } catch {
    return {
      success: false,
      faf: createEmptyFaf(),
      warnings: [`.cursorrules not found: ${cursorPath}`],
      sectionsFound: [],
    };
  }

  // Read and parse
  const content = await fs.readFile(cursorPath, 'utf-8');
  const parsed = parseCursorRules(content);

  if (parsed.sections.length === 0) {
    warnings.push('No sections found in .cursorrules — treating all content as guidelines');
    // If no sections, treat all non-empty lines as guidelines
    const allLines = parsed.rawLines
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const faf: FafFromCursor = {
      project: {
        name: parsed.projectName,
        description: 'Imported from .cursorrules',
        type: 'cursor-import',
        rules: [],
        guidelines: allLines,
        codingStyle: [],
      },
      metadata: {
        source: 'cursor',
        imported: new Date().toISOString(),
      },
    };

    return {
      success: true,
      faf,
      warnings,
      sectionsFound: [],
    };
  }

  const { rules, guidelines, codingStyle } = categorizeSections(parsed.sections);

  const faf: FafFromCursor = {
    project: {
      name: parsed.projectName,
      description: 'Imported from .cursorrules',
      type: 'cursor-import',
      rules,
      guidelines,
      codingStyle,
    },
    metadata: {
      source: 'cursor',
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

function createEmptyFaf(): FafFromCursor {
  return {
    project: {
      name: 'Unknown',
      description: '',
      type: 'cursor-import',
      rules: [],
      guidelines: [],
      codingStyle: [],
    },
    metadata: {
      source: 'cursor',
      imported: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Export: FAF -> .cursorrules
// ============================================================================

/**
 * Render .cursorrules content from .faf data.
 *
 * v3.0: ported from faf-cli's CURRENT `renderCursorrules`
 * (~/FAF/cli/src/interop/cursorrules.ts, faf-cli 7.11.0) — deliberately
 * minimal. Modern Cursor reads `.cursor/rules/*.mdc` (`alwaysApply: true`)
 * every turn; `.cursorrules` is the legacy, largely-ignored format faf-cli
 * itself keeps thin rather than richly authored — the previous v4.5.0-
 * vintage version here (Tech Stack / Coding Standards / Preferences /
 * Build Commands / General Instructions) was MORE elaborate than faf-cli's
 * own current .cursorrules, which is backwards: it over-invested in a
 * format Cursor barely reads. Real richness for Cursor now lives in
 * AGENTS.md (which Cursor also reads) — see agents-parser.ts. A first-
 * class `.cursor/rules/*.mdc` emitter is P1 scope, not this fix.
 */
export async function cursorExport(
  fafContent: any,
  outputPath: string
): Promise<CursorExportResult> {
  const warnings: string[] = [];
  const { SLOT_BY_PATH } = await fafCli;

  const data = fafContent ?? {};
  const project = data.project ?? {};
  const lines: string[] = [];

  lines.push(fafMetaTag(data));
  lines.push('');
  lines.push('# .cursorrules');
  lines.push(`# Authored from project.faf — ${project.name ?? 'Project'}`);
  lines.push('');

  if (project.main_language) {
    lines.push(`language: ${project.main_language}`);
  }

  if (data.stack) {
    lines.push('');
    lines.push('# Stack');
    for (const [key, value] of Object.entries(data.stack)) {
      if (filled(value)) {
        lines.push(`# ${slotLabel(`stack.${key}`, SLOT_BY_PATH)}: ${value.trim()}`);
      }
    }
  }

  lines.push('');

  // Write file — non-destructive: inject/update the faf block (hash-comment markers), preserve the rest.
  const content = lines.join('\n');
  await injectFafBlock(outputPath, content, '# faf:start', '# faf:end');

  return {
    success: true,
    filePath: outputPath,
    warnings,
  };
}

// ============================================================================
// Detection
// ============================================================================

export async function detectCursorRules(basePath: string): Promise<string | null> {
  const possiblePaths = [
    path.join(basePath, '.cursorrules'),
    path.join(basePath, '.cursor-rules'),
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
