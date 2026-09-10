/**
 * Claude Command — writes CLAUDE.md from project.faf, one direction.
 *
 * CLAUDE.md is faf-cli's render of project.faf (the same bytes `faf sync`
 * pushes), injected with faf-cli's injector, so content outside the managed
 * block survives. With agents / cursor / gemini / all it also writes
 * AGENTS.md, .cursorrules and GEMINI.md. Nothing here reads CLAUDE.md back
 * into project.faf. Backs the `faf_claude` tool, named `faf_bi_sync` before
 * 3.0.1; the old name claimed a two-way sync this code never did.
 */

import { parse as parseYAML } from '../fix-once/yaml';
import * as path from 'path';
import { promises as fs } from 'fs';
import { findFafFile, fileExists } from '../utils/file-utils';
import { agentsExportCommand } from './agents.js';
import { cursorExportCommand } from './cursor.js';
import { geminiExportCommand } from './gemini.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface ClaudeExportOptions {
  json?: boolean;
  agents?: boolean;
  cursor?: boolean;
  gemini?: boolean;
  all?: boolean;
}

export interface ClaudeExportResult {
  success: boolean;
  direction: 'faf-to-claude' | 'none';
  filesChanged: string[];
  conflicts: string[];
  duration: number;
  message: string;
}

/**

/**
 * Write CLAUDE.md (and any requested IDE formats) from project.faf.
 */
export async function claudeExportCommand(projectPath?: string, _options: ClaudeExportOptions = {}): Promise<ClaudeExportResult> {
  const startTime = Date.now();
  const result: ClaudeExportResult = {
    success: false,
    direction: 'none',
    filesChanged: [],
    conflicts: [],
    duration: 0,
    message: ''
  };

  try {
    // Find project.faf file
    const fafPath = projectPath ? path.join(projectPath, 'project.faf') : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      result.message = 'No project.faf file found. Run faf init first.';
      result.duration = Date.now() - startTime;
      return result;
    }

    const projectDir = path.dirname(fafPath);
    const claudeMdPath = path.join(projectDir, 'CLAUDE.md');

    // Check what exists
    const claudeMdExists = await fileExists(claudeMdPath);

    // Read .faf content
    const fafContent = await fs.readFile(fafPath, 'utf-8');
    parseYAML(fafContent); // still validates the YAML before anything is written
    // The score in the message is the real one — faf-cli's scorer on the
    // bytes read — not a `faf_score` key nothing ever writes.
    const { scoreFafYaml, readFaf, renderClaudeMd, writeClaudeMd } = await fafCli;
    let currentScore = 'unknown';
    try {
      currentScore = `${scoreFafYaml(fafContent).score}%`;
    } catch {
      /* scorer unavailable — say so rather than invent a number */
    }

    if (!claudeMdExists) {
      // CLAUDE.md is faf-cli's render of project.faf — the same bytes
      // `faf sync` writes — injected with faf-cli's injector. The pre-v3
      // template that lived here dropped Stack and every human_context slot.
      writeClaudeMd(projectDir, renderClaudeMd(readFaf(fafPath)));

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `CLAUDE.md written from project.faf. FAF Score: ${currentScore}`;

    } else {
      // CLAUDE.md is faf-cli's render of project.faf — the same bytes
      // `faf sync` writes — injected with faf-cli's injector. The pre-v3
      // template that lived here dropped Stack and every human_context slot.
      writeClaudeMd(projectDir, renderClaudeMd(readFaf(fafPath)));

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `CLAUDE.md refreshed from project.faf. FAF Score: ${currentScore}`;
    }

    // v4.5.0: Chain additional format exports if requested
    const doAgents = _options.agents || _options.all;
    const doCursor = _options.cursor || _options.all;
    const doGemini = _options.gemini || _options.all;

    if (doAgents) {
      try {
        const agentsResult = await agentsExportCommand(projectDir, { force: true });
        if (agentsResult.success) {
          result.filesChanged.push('AGENTS.md');
        }
      } catch {
        // Non-fatal — the CLAUDE.md write already succeeded
      }
    }

    if (doCursor) {
      try {
        const cursorResult = await cursorExportCommand(projectDir, { force: true });
        if (cursorResult.success) {
          result.filesChanged.push('.cursorrules');
        }
      } catch {
        // Non-fatal
      }
    }

    if (doGemini) {
      try {
        const geminiResult = await geminiExportCommand(projectDir, { force: true });
        if (geminiResult.success) {
          result.filesChanged.push('GEMINI.md');
        }
      } catch {
        // Non-fatal
      }
    }

    if (result.filesChanged.length > 1) {
      result.message += ` | Also wrote: ${result.filesChanged.filter(f => f !== 'CLAUDE.md').join(', ')}`;
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.message = error instanceof Error ? error.message : 'CLAUDE.md write failed';
    return result;
  }
}
