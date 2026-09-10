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
 * Import parser ported from faf-cli 4.5.0 (The AGENTS.md Edition) via claude-faf-mcp 4.5.0;
 * landed in faf-mcp 2.0.0 (The Interop MCP for Context). Export composes faf-cli >=7.12.0 in-process.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fafCli } from '../../utils/faf-cli-bridge.js';

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
 * v3.0: composes faf-cli's `renderAgentsMd` in-process (faf-cli >=7.12.0,
 * The Open Renderers Edition) — replaces
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
  // Composed from faf-cli (7.12.0+): the same bytes `faf export --agents`
  // writes. enrichFromRepo fills commands / key files / secrets from the repo
  // (hand-authored values win); renderAgentsMd is faf-cli's renderer; the
  // block is injected with faf-cli's injector (whole-line markers). Nothing
  // is ported here any more — a port drifted (thinner sections, a prose
  // decoy) and this is the fix.
  const { renderAgentsMd, enrichFromRepo, injectFafBlock } = await fafCli;
  const dir = path.dirname(outputPath);
  injectFafBlock(outputPath, renderAgentsMd(enrichFromRepo(dir, fafContent ?? {})));
  return { success: true, filePath: outputPath, warnings: [] };
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
