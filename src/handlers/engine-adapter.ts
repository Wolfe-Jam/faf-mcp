/**
 * FafEngineAdapter — routes the interop tools to their bundled, in-process
 * commands.
 *
 * Every faf-mcp tool runs in-process: scoring, init, auto, trust, status and
 * the resources go through src/utils/faf-cli-bridge.ts (the faf-cli this
 * package bundles); the seven interop commands below run the vendored
 * faf-core modules. Nothing shells out.
 *
 * History (3.0 P2): this file used to carry 22 command branches, a
 * `which faf` detector that ran at every server start, and an exec fallback
 * that spawned whatever binary the detector found — on machines with an
 * unrelated `faf` on PATH that was a different program entirely. Only seven
 * branches were ever reached by a registered tool; the rest, the detector
 * and the fallback are gone (archive tag: archive/pre-p2-dead-code).
 */
import * as path from 'path';
import * as fs from 'fs';
import { isError } from '../utils/type-guards.js';
import { syncFafFile } from '../faf-core/commands/sync.js';
import { syncBiDirectional } from '../faf-core/commands/bi-sync.js';
import { agentsImportCommand, agentsExportCommand, agentsSyncCommand } from '../faf-core/commands/agents.js';
import { cursorImportCommand, cursorExportCommand, cursorSyncCommand } from '../faf-core/commands/cursor.js';
import { geminiImportCommand, geminiExportCommand, geminiSyncCommand } from '../faf-core/commands/gemini.js';
import { conductorImportCommand, conductorExportCommand } from '../faf-core/commands/conductor.js';
import { gitContextCommand } from '../faf-core/commands/git-context.js';

export interface FafEngineResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

/** What every bundled command returns, as far as the adapter cares. */
interface CommandOutcome {
  success: boolean;
  message?: string;
  error?: string;
}

export class FafEngineAdapter {
  private enginePath: string;
  private workingDirectory: string;

  /**
   * `enginePath` is kept for the config surface (server.ts passes it through;
   * faf_debug reports it). `_timeout` was the exec fallback's — retained in
   * the signature so callers do not break, unused now that nothing spawns.
   */
  constructor(enginePath: string = 'native', _timeout: number = 30000) {
    this.enginePath = enginePath;
    this.workingDirectory = this.findBestWorkingDirectory();
  }

  private findBestWorkingDirectory(): string {
    // Priority 1: Environment variable for explicit control
    const fafWorkingDir = process.env.FAF_WORKING_DIR;
    if (fafWorkingDir && fs.existsSync(fafWorkingDir)) {
      return fafWorkingDir;
    }

    // Priority 2: MCP might pass a working directory hint
    const mcpWorkingDir = process.env.MCP_WORKING_DIR;
    if (mcpWorkingDir && fs.existsSync(mcpWorkingDir)) {
      return mcpWorkingDir;
    }

    // Priority 3 (FIX 2026-06-30): the caller's ACTUAL working directory — the
    // workspace an IDE / MCP host (Cursor, VS Code, Claude Desktop) launches the
    // server in. This MUST win over the ~/Projects convention below. Previously
    // ~/Projects was FORCED here, so every no-path tool call (faf_score, …)
    // operated on ~/Projects instead of the project the user actually had open —
    // the editor surface's whole value, silently broken (scored ~/Projects's
    // stale .faf for everyone). Prefer a real FAF project (cwd contains
    // project.faf — the path-check), else the cwd itself when it's a usable,
    // non-root directory (so faf_init/score act on the open workspace even
    // before a .faf exists).
    const currentDir = process.cwd();
    const usableCwd =
      currentDir !== '/' && currentDir !== '/root' && fs.existsSync(currentDir);
    if (usableCwd && fs.existsSync(path.join(currentDir, 'project.faf'))) {
      return currentDir;
    }
    if (usableCwd) {
      return currentDir;
    }

    // Priority 4: ~/Projects convention — a soft landing ONLY when the host gave
    // us no usable workspace (e.g. cwd is the filesystem root). Never overrides a
    // real cwd above.
    const homeDir = process.env.HOME ?? process.env.USERPROFILE;
    if (homeDir) {
      // Try capitalized Projects first (macOS/Windows convention)
      const projectsDir = path.join(homeDir, 'Projects');
      if (fs.existsSync(projectsDir)) {
        return projectsDir;
      }

      // Create ~/Projects if it doesn't exist
      try {
        fs.mkdirSync(projectsDir, { recursive: true });
        return projectsDir;
      } catch {
        // If we can't create Projects, try lowercase
        const projectsLower = path.join(homeDir, 'projects');
        if (fs.existsSync(projectsLower)) {
          return projectsLower;
        }

        // Fall back to home
        return homeDir;
      }
    }

    // Last resort: /tmp (should rarely happen)
    return '/tmp';
  }

  /**
   * Wrap a bundled command's outcome. A failed command's reason travels in
   * `error` so handlers can print it — previously the bundled branches set
   * only `success` and users saw "❌ undefined".
   */
  private outcome(result: CommandOutcome, fallback: string, startTime: number): FafEngineResult {
    return {
      success: result.success,
      data: result,
      error: result.success ? undefined : (result.message || result.error || fallback),
      duration: Date.now() - startTime,
    };
  }

  private failure(error: unknown, fallback: string, startTime: number): FafEngineResult {
    return { success: false, error: isError(error) ? error.message : fallback, duration: Date.now() - startTime };
  }

  async callEngine(command: string, args: string[] = []): Promise<FafEngineResult> {
    const startTime = Date.now();

    if (!command || typeof command !== 'string') {
      return { success: false, error: 'Command must be a non-empty string', duration: 0 };
    }

    const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
    const projectPath = pathArgs[0] || this.workingDirectory;
    const actionArg = args.find(arg => arg.startsWith('--action='));
    const force = args.includes('--force');
    const merge = args.includes('--merge');

    try {
      switch (command) {
        case 'sync': {
          const result = await syncFafFile(projectPath, { auto: args.includes('--auto'), json: true });
          return this.outcome(result, 'Sync command failed', startTime);
        }

        case 'bi-sync':
        case 'bisync': {
          const result = await syncBiDirectional(projectPath, {
            json: true,
            agents: args.includes('--agents'),
            cursor: args.includes('--cursor'),
            gemini: args.includes('--gemini'),
            all: args.includes('--all'),
          });
          return this.outcome(result, 'Bi-sync command failed', startTime);
        }

        case 'agents': {
          const action = actionArg ? actionArg.substring(9) : 'sync';
          const result = action === 'import' ? await agentsImportCommand(projectPath, { merge })
            : action === 'export' ? await agentsExportCommand(projectPath, { force })
            : await agentsSyncCommand(projectPath);
          return this.outcome(result, 'Agents command failed', startTime);
        }

        case 'cursor': {
          const action = actionArg ? actionArg.substring(9) : 'sync';
          const result = action === 'import' ? await cursorImportCommand(projectPath, { merge })
            : action === 'export' ? await cursorExportCommand(projectPath, { force })
            : await cursorSyncCommand(projectPath);
          return this.outcome(result, 'Cursor command failed', startTime);
        }

        case 'gemini': {
          const action = actionArg ? actionArg.substring(9) : 'sync';
          const result = action === 'import' ? await geminiImportCommand(projectPath, { merge })
            : action === 'export' ? await geminiExportCommand(projectPath, { force })
            : await geminiSyncCommand(projectPath);
          return this.outcome(result, 'Gemini command failed', startTime);
        }

        case 'conductor': {
          const action = actionArg ? actionArg.substring(9) : 'import';
          const result = action === 'export'
            ? await conductorExportCommand(projectPath, { force })
            : await conductorImportCommand(projectPath, { merge });
          return this.outcome(result, 'Conductor command failed', startTime);
        }

        case 'git': {
          const url = args[0];
          const outputPath = args[1]; // optional
          if (!url) {
            return { success: false, error: 'URL is required', duration: Date.now() - startTime };
          }
          const result = await gitContextCommand(url, outputPath);
          return this.outcome(result, 'Git command failed', startTime);
        }

        default:
          return {
            success: false,
            error: `Unknown engine command '${command}'. Every faf-mcp tool runs in-process; there is no CLI to fall back to.`,
            duration: Date.now() - startTime,
          };
      }
    } catch (error: unknown) {
      return this.failure(error, `${command} command failed`, startTime);
    }
  }

  // Get the current working directory used by the adapter
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setWorkingDirectory(dir: string): void {
    if (fs.existsSync(dir)) {
      this.workingDirectory = dir;
    }
  }

  // Auto-detect from file path (when file operations occur)
  updateWorkingDirectoryFromPath(filePath: string): void {
    const dir = path.dirname(filePath);
    if (dir && dir !== '/' && fs.existsSync(dir)) {
      // Only update if it's a real project directory
      if (dir.includes('Users') || dir.includes('home') || dir.includes('projects')) {
        this.workingDirectory = dir;
      }
    }
  }

  // Get the engine path being used
  getEnginePath(): string {
    return this.enginePath;
  }
}
