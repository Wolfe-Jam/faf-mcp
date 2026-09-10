/**
 * Conductor Command — Interop (faf-mcp 2.0.0; ported from faf-cli 4.5.0 via claude-faf-mcp 4.5.0)
 *
 * Import/Export between conductor/ directory and project.faf
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  conductorImport,
  conductorExport,
  detectConductor,
  type FafFromConductor,
} from '../parsers/conductor-parser.js';

export interface ConductorCommandResult {
  success: boolean;
  action: 'import' | 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import conductor/ directory into project.faf
 */
export async function conductorImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<ConductorCommandResult> {
  const hasConductor = await detectConductor(projectPath);

  if (!hasConductor) {
    return {
      success: false,
      action: 'import',
      message: 'No conductor/ directory found in project',
    };
  }

  const conductorPath = path.join(projectPath, 'conductor');
  const result = await conductorImport(conductorPath);

  if (!result.success) {
    return {
      success: false,
      action: 'import',
      message: result.warnings.join(', '),
      warnings: result.warnings,
    };
  }

  if (options.merge) {
    const fafPath = await findFafFile(projectPath);
    if (fafPath) {
      try {
        const existingContent = await fs.readFile(fafPath, 'utf-8');
        const existingFaf = parseYAML(existingContent);

        const merged = {
          ...existingFaf,
          project: {
            ...(existingFaf.project || {}),
            name: result.faf.project.name || existingFaf.project?.name,
            description: result.faf.project.description || existingFaf.project?.description,
            goals: [
              ...(existingFaf.project?.goals || []),
              ...result.faf.project.goals,
            ],
            stack: {
              ...(existingFaf.project?.stack || {}),
              ...result.faf.project.stack,
            },
            rules: [
              ...(existingFaf.project?.rules || []),
              ...result.faf.project.rules,
            ],
            guidelines: [
              ...(existingFaf.project?.guidelines || []),
              ...result.faf.project.guidelines,
            ],
          },
        };

        const yamlContent = stringifyYAML(merged);
        await fs.writeFile(fafPath, yamlContent);

        return {
          success: true,
          action: 'import',
          message: `Merged conductor/ into existing .faf (${result.filesProcessed.length} files)`,
          data: { filesProcessed: result.filesProcessed, merged: true },
          warnings: result.warnings,
        };
      } catch (error) {
        return {
          success: false,
          action: 'import',
          message: `Could not merge conductor/ into project.faf: ${error instanceof Error ? error.message : String(error)}`,
          warnings: result.warnings,
        };
      }
    }
    // merge was asked for and there is nothing to merge into: say so rather
    // than report a no-op as an import.
    return {
      success: false,
      action: 'import',
      message: 'No project.faf to merge into — run faf_init first',
      warnings: result.warnings,
    };
  }

  // Without merge nothing is written: say exactly that.
  return {
    success: true,
    action: 'import',
    message: `Parsed conductor/ (${result.filesProcessed.length} files) — nothing written; pass merge: true to write it into project.faf`,
    data: { faf: result.faf, filesProcessed: result.filesProcessed },
    warnings: result.warnings,
  };
}

/**
 * Export project.faf to conductor/ directory
 */
export async function conductorExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<ConductorCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf_init first.',
    };
  }

  const outputPath = path.join(projectPath, 'conductor');

  // Check if conductor/ already exists
  if (!options.force) {
    try {
      const stat = await fs.stat(outputPath);
      if (stat.isDirectory()) {
        return {
          success: false,
          action: 'export',
          message: 'conductor/ directory already exists. Use force: true to overwrite.',
        };
      }
    } catch {
      // Doesn't exist, proceed
    }
  }

  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  // Build the conductor-compatible structure. Read the spec fields a
  // project.faf actually carries (project.main_language / goal, stack.*);
  // the list-shaped fields (stack.languages, project.goals, …) that a
  // conductor merge writes stay as a fallback.
  const specValues = (...values: unknown[]): string[] =>
    values.filter((v): v is string => typeof v === 'string' && v !== '' && v !== 'slotignored');
  const firstNonEmpty = (...lists: unknown[]): string[] => {
    for (const list of lists) {
      if (Array.isArray(list) && list.length > 0) return list;
    }
    return [];
  };

  const conductorFaf: FafFromConductor = {
    project: {
      name: fafData.project?.name || 'Unknown',
      description: fafData.project?.description || fafData.project?.goal || '',
      type: fafData.project?.type || 'application',
      goals: firstNonEmpty(specValues(fafData.project?.goal), fafData.project?.goals),
      stack: {
        languages: firstNonEmpty(
          specValues(fafData.project?.main_language),
          fafData.stack?.languages,
          fafData.project?.stack?.languages,
        ),
        frameworks: firstNonEmpty(
          specValues(fafData.stack?.frontend, fafData.stack?.backend),
          fafData.stack?.frameworks,
          fafData.project?.stack?.frameworks,
        ),
        databases: firstNonEmpty(
          specValues(fafData.stack?.database),
          fafData.stack?.databases,
          fafData.project?.stack?.databases,
        ),
        infrastructure: firstNonEmpty(
          specValues(fafData.stack?.hosting, fafData.stack?.cicd),
          fafData.stack?.infrastructure,
          fafData.project?.stack?.infrastructure,
        ),
      },
      rules: fafData.project?.rules || [],
      guidelines: fafData.project?.guidelines || [],
    },
    metadata: {
      source: 'faf',
      imported: new Date().toISOString(),
    },
  };

  const result = await conductorExport(conductorFaf, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to conductor/ (${result.filesGenerated.length} files)`
      : 'Export failed',
    data: { filesGenerated: result.filesGenerated },
    warnings: result.warnings,
  };
}
