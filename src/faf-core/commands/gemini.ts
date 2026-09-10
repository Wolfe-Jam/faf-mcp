/**
 * Gemini Command — Interop (faf-mcp 2.0.0; ported from faf-cli 4.5.0 via claude-faf-mcp 4.5.0)
 *
 * Import/Export/Sync between GEMINI.md and project.faf
 * Bundled command — no shell-out; export composes faf-cli in-process.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  geminiImport,
  geminiExport,
  detectGeminiMd,
} from '../parsers/gemini-parser.js';

export interface GeminiCommandResult {
  success: boolean;
  action: 'import' | 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import GEMINI.md into project.faf
 */
export async function geminiImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<GeminiCommandResult> {
  const geminiPath = await detectGeminiMd(projectPath);

  if (!geminiPath) {
    return {
      success: false,
      action: 'import',
      message: 'No GEMINI.md found in project directory',
    };
  }

  const result = await geminiImport(geminiPath);

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
            rules: [
              ...(existingFaf.project?.rules || []),
              ...result.faf.project.rules,
            ],
            guidelines: [
              ...(existingFaf.project?.guidelines || []),
              ...result.faf.project.guidelines,
            ],
            codingStyle: [
              ...(existingFaf.project?.codingStyle || []),
              ...result.faf.project.codingStyle,
            ],
          },
        };

        const yamlContent = stringifyYAML(merged);
        await fs.writeFile(fafPath, yamlContent);

        return {
          success: true,
          action: 'import',
          message: `Merged GEMINI.md into existing .faf (${result.sectionsFound.length} sections)`,
          data: { sectionsFound: result.sectionsFound, merged: true },
          warnings: result.warnings,
        };
      } catch (error) {
        return {
          success: false,
          action: 'import',
          message: `Could not merge GEMINI.md into project.faf: ${error instanceof Error ? error.message : String(error)}`,
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
    message: `Parsed GEMINI.md (${result.sectionsFound.length} sections) — nothing written; pass merge: true to write it into project.faf`,
    data: { faf: result.faf, sectionsFound: result.sectionsFound },
    warnings: result.warnings,
  };
}

/**
 * Export project.faf to GEMINI.md
 */
export async function geminiExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<GeminiCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf_init first.',
    };
  }

  const outputPath = path.join(projectPath, 'GEMINI.md');
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: 'GEMINI.md already exists. Pass force: true to update its faf-managed block (content outside it is kept).',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  const result = await geminiExport(fafData, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to GEMINI.md`
      : 'Export failed',
    data: { filePath: result.filePath },
    warnings: result.warnings,
  };
}

/**
 * Sync GEMINI.md <-> project.faf
 */
export async function geminiSyncCommand(
  projectPath: string
): Promise<GeminiCommandResult> {
  return await geminiExportCommand(projectPath, { force: true });
}
