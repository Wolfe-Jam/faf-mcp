// faf-mcp/src/handlers/fileHandler.ts
// 🏎️ FAF File Operations - Production Ready Implementation

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fsSync from 'fs';
import * as crypto from 'crypto';
import { confineFileOp, confineWriteOp, PathConfinementError } from '../utils/safe-path';

/**
 * Security validator for file paths
 */
export class PathValidator {
  private static readonly FORBIDDEN_PATHS = ['/etc', '/sys', '/proc', '/private/etc'];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  static validate(filePath: string): { valid: boolean; error?: string } {
    // Normalize and resolve path
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(filePath);
    
    // Check for path traversal
    if (normalized.includes('..')) {
      return { valid: false, error: 'Path traversal detected' };
    }
    
    // Check forbidden paths
    for (const forbidden of this.FORBIDDEN_PATHS) {
      if (resolved.startsWith(forbidden)) {
        return { valid: false, error: `Access to ${forbidden} is forbidden` };
      }
    }
    
    return { valid: true };
  }
  
  static async checkFileSize(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return { 
          valid: false, 
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: 50MB)` 
        };
      }
      return { valid: true };
    } catch (_error: unknown) {
      // File doesn't exist yet (for write operations)
      return { valid: true };
    }
  }
}

/**
 * FAF Read Tool Definition
 */
export const fafReadTool: Tool = {
  name: 'faf_read',
  description: 'Read content from any file on the local filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative file path to read'
      }
    },
    required: ['path']
  }
};

/**
 * FAF Write Tool Definition
 */
export const fafWriteTool: Tool = {
  name: 'faf_write',
  description: 'Write a file within the project root (cwd, or FAF_ALLOWED_ROOTS when set). Paths outside it, inside .git/, and .faf-dna (the birth certificate) are always refused. An existing *.faf, CLAUDE.md or AGENTS.md is not replaced unless overwrite is true. Writes via temp file + rename.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative file path to write'
      },
      overwrite: {
        type: 'boolean',
        description: 'Set true to replace an existing *.faf, CLAUDE.md or AGENTS.md. Without it, faf_write refuses and leaves the file unchanged. Never applies to .faf-dna.'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['path', 'content']
  }
};

/**
 * Handle faf_read tool execution
 */
export async function handleFafRead(args: any): Promise<CallToolResult> {
  const startTime = Date.now();
  
  try {
    const { path: rawPath } = args;

    // Confine to the project root(s) — any file type, but no escape to
    // /etc, ~/.ssh, or via ../ traversal (CWE-22). Returns symlink-canonical path.
    let filePath: string;
    try {
      filePath = confineFileOp(rawPath);
    } catch (err) {
      if (err instanceof PathConfinementError) {
        return {
          content: [{ type: 'text', text: `❌ Security error: ${err.message}` }],
          isError: true,
        };
      }
      throw err;
    }

    // Check file size
    const sizeValidation = await PathValidator.checkFileSize(filePath);
    if (!sizeValidation.valid) {
      return {
        content: [{
          type: 'text',
          text: `❌ ${sizeValidation.error}`
        }],
        isError: true
      };
    }
    
    // Read file with timeout
    const content = await Promise.race([
      fs.readFile(filePath, 'utf8'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Read timeout (30s)')), 30000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    const stats = await fs.stat(filePath);
    
    return {
      content: [{
        type: 'text',
        text: content
      }],
      metadata: {
        duration_ms: duration,
        file_size: stats.size,
        file_path: path.resolve(filePath),
        message: `✅ Read ${stats.size} bytes in ${duration}ms`
      }
    };
    
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to read file: ${error.message}`
      }],
      isError: true
    };
  }
}

/**
 * Context files faf_write will not replace unless the caller passes
 * `overwrite: true`: any `*.faf` (project.faf, .faf), CLAUDE.md and AGENTS.md.
 * Case-insensitive, so a case-insensitive filesystem cannot slip past.
 */
export function isProtectedContextFile(p: string): boolean {
  const base = path.basename(p).toLowerCase();
  return base.endsWith('.faf') || base === 'claude.md' || base === 'agents.md';
}

/**
 * Write `content` to `target` via a temp file in the same directory, then
 * rename (replace) or link (no-clobber) it into place. A reader never sees a
 * half-written file. With `noClobber`, an existing target is never replaced,
 * even if it appears between the caller's check and this write: link() fails
 * with EEXIST atomically.
 */
async function atomicWrite(target: string, content: string, noClobber: boolean): Promise<void> {
  const dir = path.dirname(target);
  const tmp = path.join(
    dir,
    `.${path.basename(target)}.faf-tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`,
  );
  await fs.writeFile(tmp, content, { encoding: 'utf8', flag: 'wx' });
  try {
    if (!noClobber) {
      // Keep the replaced file's permission bits (0755 stays 0755). The temp
      // file was created with the default mode, so copy the old one across.
      await keepMode(target, tmp);
      await fs.rename(tmp, target);
      return;
    }
    try {
      await fs.link(tmp, target);
    } catch (err: unknown) {
      if (errCode(err) === 'EEXIST') throw err;
      // Filesystem without hard links: exclusive copy is still no-clobber.
      await fs.copyFile(tmp, target, fsSync.constants.COPYFILE_EXCL);
    }
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

/** Copy `from`'s permission bits onto `to`. No-op when `from` does not exist. */
async function keepMode(from: string, to: string): Promise<void> {
  let mode: number;
  try {
    mode = (await fs.stat(from)).mode & 0o7777;
  } catch (err: unknown) {
    if (errCode(err) === 'ENOENT') return;
    throw err;
  }
  await fs.chmod(to, mode);
}

function errCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
}

function existsNoFollow(p: string): boolean {
  try {
    fsSync.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function refuseExisting(filePath: string): CallToolResult {
  return {
    content: [{
      type: 'text',
      text:
        `❌ Refused: ${filePath} already exists and is a protected context file ` +
        `(*.faf, CLAUDE.md, AGENTS.md). faf_write did not change it.\n` +
        `To replace it, call faf_write again with overwrite: true. ` +
        `To update project.faf or CLAUDE.md without losing hand-written content, ` +
        `use the dedicated faf tools instead.`
    }],
    isError: true
  };
}

/**
 * Handle faf_write tool execution
 */
export async function handleFafWrite(args: any): Promise<CallToolResult> {
  const startTime = Date.now();

  try {
    const input = (args ?? {}) as { path?: unknown; content?: unknown; overwrite?: unknown };
    const rawPath = input.path;
    const content = input.content;
    const overwrite = input.overwrite === true;

    if (typeof content !== 'string') {
      return {
        content: [{ type: 'text', text: '❌ content must be a string' }],
        isError: true
      };
    }

    // Confine to the project root before any write: cwd only (or an explicit
    // FAF_ALLOWED_ROOTS), never .git/, never .faf-dna, real path resolved.
    let filePath: string;
    try {
      filePath = confineWriteOp(rawPath);
    } catch (err) {
      if (err instanceof PathConfinementError) {
        return {
          content: [{ type: 'text', text: `❌ Security error: ${err.message}` }],
          isError: true,
        };
      }
      throw err;
    }

    // Check content size
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (contentSize > 50 * 1024 * 1024) {
      return {
        content: [{
          type: 'text',
          text: `❌ Content too large: ${(contentSize / 1024 / 1024).toFixed(2)}MB (max: 50MB)`
        }],
        isError: true
      };
    }

    const protectedFile = isProtectedContextFile(filePath) || isProtectedContextFile(String(rawPath));
    const noClobber = protectedFile && !overwrite;
    if (noClobber && existsNoFollow(filePath)) {
      return refuseExisting(filePath);
    }

    // Create directory if needed
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file with timeout
    try {
      await Promise.race([
        atomicWrite(filePath, content, noClobber),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Write timeout (30s)')), 30000).unref?.()
        )
      ]);
    } catch (err: unknown) {
      if (noClobber && errCode(err) === 'EEXIST') return refuseExisting(filePath);
      throw err;
    }

    const duration = Date.now() - startTime;

    return {
      content: [{
        type: 'text',
        text: `✅ Successfully wrote ${contentSize} bytes to ${filePath}`
      }],
      metadata: {
        duration_ms: duration,
        bytes_written: contentSize,
        file_path: filePath,
        message: `✅ Write completed in ${duration}ms`
      }
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to write file: ${error.message}`
      }],
      isError: true
    };
  }
}

// Export handlers
export const fileHandlers = {
  faf_read: handleFafRead,
  faf_write: handleFafWrite
};
