import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/** MCP's resource-not-found code — not in the SDK's ErrorCode enum, so spelled out. */
const RESOURCE_NOT_FOUND = -32002 as ErrorCode;
import { FafEngineAdapter } from './engine-adapter';
import { fafCli } from '../utils/faf-cli-bridge.js';

export class FafResourceHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  /**
   * v3.0: renamed from `claude-faf://` to `faf://` — an identity leftover
   * from before this became the generic Cursor/IDE edition (no Claude-
   * specific behavior lives behind these URIs). `faf://` is primary and
   * listed first; `claude-faf://` stays registered as an alias for one
   * release so an existing client pointed at the old URI doesn't break.
   */
  async listResources() {
    // Get the working directory for file system resources
    const workingDir = process.env.FAF_WORKING_DIR ?? process.cwd();

    return {
      resources: [
        {
          uri: 'faf://context',
          name: 'Current FAF Context',
          description: 'Current project FAF context and metadata',
          mimeType: 'application/json'
        },
        {
          uri: 'faf://status',
          name: 'FAF Status Summary',
          description: 'Project health and AI readiness status',
          mimeType: 'text/plain'
        },
        {
          uri: 'claude-faf://context',
          name: 'Current FAF Context (legacy alias)',
          description: 'Alias for faf://context — kept for one release, prefer faf://context.',
          mimeType: 'application/json'
        },
        {
          uri: 'claude-faf://status',
          name: 'FAF Status Summary (legacy alias)',
          description: 'Alias for faf://status — kept for one release, prefer faf://status.',
          mimeType: 'text/plain'
        },
        // Declare file system access for the working directory
        {
          uri: `file://${workingDir}`,
          name: 'FAF Working Directory',
          description: 'File system access for FAF operations',
          mimeType: 'text/directory'
        }
      ] as Resource[]
    };
  }

  async readResource(uri: string) {
    // Handle file:// URIs for file system access
    if (uri.startsWith('file://')) {
      return {
        contents: [{
          uri: uri,
          mimeType: 'text/directory',
          text: `File system resource: ${uri.replace('file://', '')}`
        }]
      };
    }

    switch (uri) {
      case 'faf://context':
      case 'claude-faf://context':
        return await this.getFafContext(uri);
      case 'faf://status':
      case 'claude-faf://status':
        return await this.getFafStatus(uri);
      default:
        throw new McpError(RESOURCE_NOT_FOUND, `Resource not found: ${uri}`);
    }
  }

  /**
   * v3.0: both resources were `this.engineAdapter.callEngine('status', ...)`
   * — no bundled 'status' branch exists in engine-adapter.ts, so this fell
   * straight through to the ambient-PATH shell-out fallback (`which faf`,
   * then execAsync). Reproduced live on this machine: PATH resolves to an
   * unrelated Rust tool also named `faf`, and this resource "succeeded"
   * with THAT tool's own banner/score/slot-count as if it were faf-mcp's
   * real output — wrong data, no error signal, the worse of the two
   * PATH-resolution bugs this release fixes. Rewired onto the bundled
   * faf-cli bridge — bundled faf-cli only, never ambient PATH.
   */
  private async getFafContext(uri: string) {
    const cwd = this.engineAdapter.getWorkingDirectory();
    const { findFafFile: findFaf, readFaf, readFafRaw, scoreFafYaml } = await fafCli;
    const fafPath = findFaf(cwd);

    if (!fafPath) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: `No .faf found in ${cwd}` }, null, 2)
        }]
      };
    }

    try {
      const data = readFaf(fafPath);
      const score = scoreFafYaml(readFafRaw(fafPath));
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            { path: fafPath, score: score.score, tier: score.tier.name, populated: score.populated, total: score.total, data },
            null,
            2,
          )
        }]
      };
    } catch (error: any) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: error?.message ?? String(error) }, null, 2)
        }]
      };
    }
  }

  private async getFafStatus(uri: string) {
    const cwd = this.engineAdapter.getWorkingDirectory();
    const { findFafFile: findFaf, readFafRaw, scoreFafYaml } = await fafCli;
    const fafPath = findFaf(cwd);

    if (!fafPath) {
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: `No .faf found in ${cwd}\nRun faf_init to create one.`
        }]
      };
    }

    try {
      const score = scoreFafYaml(readFafRaw(fafPath));
      const text =
        `${fafPath}\n` +
        `FAF SCORE: ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}`;
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text
        }]
      };
    } catch (error: any) {
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: `Error: ${error?.message ?? String(error)}`
        }]
      };
    }
  }
}
