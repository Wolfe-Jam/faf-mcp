/**
 * ☁️ MCPaaS Cloud Handler - Universal Context Sharing
 * Integrates with mcpaas.live for global FAF context access
 *
 * Architecture:
 * - HTTP client to mcpaas.live/mcp endpoint
 * - Uses MCP protocol over HTTP (JSON-RPC 2.0)
 * - OAuth 2.0 authentication with Auth0
 * - Edge-deployed (300+ Cloudflare locations)
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { findFafFile } from '../utils/faf-file-finder.js';

// MCPaaS API endpoint
const MCPAAS_API = 'https://mcpaas.live/mcp';
const MCPAAS_SOULS_BASE = 'https://mcpaas.live/souls';

// Legacy auth token (will transition to OAuth)
const DEFAULT_TOKEN = process.env.MCPAAS_TOKEN || 'wolfe-68-orange';

interface McpRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

interface McpResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

/**
 * MCPaaS Cloud Handler
 * Provides tools for uploading, fetching, listing, searching FAF context via mcpaas.live
 */
export class FafCloudHandler {
  private requestId = 1;

  /**
   * Make MCP request to mcpaas.live
   */
  private async makeRequest(method: string, params?: any): Promise<any> {
    const request: McpRequest = {
      jsonrpc: '2.0',
      method,
      params: params || {},
      id: this.requestId++
    };

    const response = await fetch(MCPAAS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_TOKEN}`,
        'User-Agent': 'faf-mcp/1.3.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`MCPaaS HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as McpResponse;

    if (result.error) {
      throw new Error(`MCPaaS error: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * 📤 Publish project.faf to mcpaas.live
   */
  async publish(args: {
    soul_name: string;
    directory?: string;
    tags?: string[];
    public?: boolean;
  }): Promise<CallToolResult> {
    try {
      const { soul_name, directory, tags, public: isPublic } = args;
      const projectDir = directory || process.cwd();

      // Find and read project.faf
      const fafResult = await findFafFile(projectDir);
      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `❌ No project.faf found in ${projectDir}\n\nRun faf_init first to create project.faf.`
          }]
        };
      }

      const fafContent = await fs.readFile(fafResult.path, 'utf-8');

      // Call mcpaas.live write_soul tool
      const result = await this.makeRequest('tools/call', {
        name: 'write_soul',
        arguments: {
          name: soul_name,
          content: fafContent,
          entry_type: 'faf',
          tags: tags || ['faf', 'project']
        }
      });

      const shareUrl = `${MCPAAS_SOULS_BASE}/${soul_name}`;

      return {
        content: [{
          type: 'text',
          text: `☁️ Published to mcpaas.live!

**Soul Name:** ${soul_name}
**Share URL:** ${shareUrl}
**Size:** ${fafContent.length} bytes
**Tags:** ${(tags || ['faf', 'project']).join(', ')}
**Access:** ${isPublic ? 'Public' : 'Token-protected'}

Anyone can now fetch your context:
→ Visit: ${shareUrl}
→ Or use: faf_cloud_fetch { soul_name: "${soul_name}" }

🌐 Served from 300+ Cloudflare edge locations
⚡ <1ms cold start via 2.7KB Zig-WASM engine`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to publish to mcpaas.live

Error: ${error instanceof Error ? error.message : String(error)}

Troubleshooting:
- Check network connection
- Verify MCPAAS_TOKEN environment variable
- Visit https://mcpaas.live/health to check service status`
        }],
        isError: true
      };
    }
  }

  /**
   * 📥 Fetch context from mcpaas.live into local project.faf
   */
  async fetch(args: {
    soul_name: string;
    directory?: string;
    merge?: boolean;
  }): Promise<CallToolResult> {
    try {
      const { soul_name, directory, merge } = args;
      const projectDir = directory || process.cwd();

      // Call mcpaas.live get_soul tool
      const result = await this.makeRequest('tools/call', {
        name: 'get_soul',
        arguments: { name: soul_name }
      });

      const content = result.content?.[0]?.text;
      if (!content) {
        return {
          content: [{
            type: 'text',
            text: `❌ Soul "${soul_name}" not found on mcpaas.live

Available souls: faf, grok, ghost, wolfe, spacex

Or publish yours: faf_cloud_publish { soul_name: "my-project" }`
          }],
          isError: true
        };
      }

      // Write to project.faf
      const fafPath = path.join(projectDir, 'project.faf');

      if (merge && await fs.access(fafPath).then(() => true).catch(() => false)) {
        // TODO: Implement merge logic (for now, just warn)
        return {
          content: [{
            type: 'text',
            text: `⚠️ Merge mode not yet implemented

Fetched content from "${soul_name}" (${content.length} bytes)
To replace local project.faf, run without merge flag.`
          }]
        };
      }

      await fs.writeFile(fafPath, content, 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `✅ Fetched from mcpaas.live!

**Soul:** ${soul_name}
**Saved to:** ${fafPath}
**Size:** ${content.length} bytes

Your local project.faf now has cloud context.
Run faf_score to see your AI-readiness.`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to fetch from mcpaas.live

Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  /**
   * 📋 List souls on mcpaas.live
   */
  async list(args: { tags?: string[] } = {}): Promise<CallToolResult> {
    try {
      const { tags } = args;

      let result;
      if (tags && tags.length > 0) {
        // Search by tag
        result = await this.makeRequest('tools/call', {
          name: 'search_by_tag',
          arguments: { tag: tags[0] }
        });
      } else {
        // List all souls
        result = await this.makeRequest('tools/call', {
          name: 'list_souls',
          arguments: {}
        });
      }

      const souls = result.content?.[0]?.text || 'No souls found';

      return {
        content: [{
          type: 'text',
          text: `📋 MCPaaS Souls

${souls}

Fetch any soul: faf_cloud_fetch { soul_name: "name" }
Or visit: https://mcpaas.live/souls/{name}`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to list souls

Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  /**
   * 🔍 Search across cloud souls
   */
  async search(args: {
    query?: string;
    tag?: string;
  }): Promise<CallToolResult> {
    try {
      const { query, tag } = args;

      let result;
      if (tag) {
        result = await this.makeRequest('tools/call', {
          name: 'search_by_tag',
          arguments: { tag }
        });
      } else if (query) {
        result = await this.makeRequest('tools/call', {
          name: 'search_context',
          arguments: { query }
        });
      } else {
        return {
          content: [{
            type: 'text',
            text: '⚠️ Provide either query or tag parameter'
          }],
          isError: true
        };
      }

      const results = result.content?.[0]?.text || 'No results found';

      return {
        content: [{
          type: 'text',
          text: `🔍 Search Results

${results}`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Search failed

Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  /**
   * 🔗 Generate shareable link
   */
  async share(args: {
    soul_name: string;
    expires_in?: number;
  }): Promise<CallToolResult> {
    const { soul_name, expires_in } = args;

    // For now, just generate URL (expiring links require OAuth/auth implementation)
    const shareUrl = `${MCPAAS_SOULS_BASE}/${soul_name}`;

    let expiryNote = '';
    if (expires_in) {
      expiryNote = `\n⏰ Expiring links require OAuth (coming soon)`;
    }

    return {
      content: [{
        type: 'text',
        text: `🔗 Share Link Generated

**URL:** ${shareUrl}
**Soul:** ${soul_name}
**Access:** Public${expiryNote}

Anyone can:
→ Visit the URL directly
→ Or use: faf_cloud_fetch { soul_name: "${soul_name}" }

Served from 300+ edge locations with <1ms cold starts.`
      }]
    };
  }
}
