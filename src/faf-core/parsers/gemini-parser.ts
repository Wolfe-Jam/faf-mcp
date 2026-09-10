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
 * Import parser ported from faf-cli 4.5.0 via claude-faf-mcp 4.5.0;
 * landed in faf-mcp 2.0.0 (The Interop MCP for Context). Export composes faf-cli >=7.12.0 in-process.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fafCli } from '../../utils/faf-cli-bridge.js';

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
 * v3.0: composes faf-cli's `renderGeminiMd` in-process (faf-cli >=7.12.0,
 * The Open Renderers Edition) — matches Gemini CLI's
 * own GEMINI.md convention (hierarchical, concatenation-friendly,
 * `@file.md`-importable): commands, key files, and confirmation-required
 * actions, not the AGENTS.md guardrail ladder — a different spec for a
 * different reader.
 */
export async function geminiExport(
  fafContent: any,
  outputPath: string
): Promise<GeminiExportResult> {
  // Composed from faf-cli (7.12.0+): the same bytes `faf export --gemini` writes.
  const { renderGeminiMd, enrichFromRepo, injectFafBlock } = await fafCli;
  const dir = path.dirname(outputPath);
  injectFafBlock(outputPath, renderGeminiMd(enrichFromRepo(dir, fafContent ?? {})));
  return { success: true, filePath: outputPath, warnings: [] };
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
