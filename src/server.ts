import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from './handlers/resources';
import { FafToolHandler } from './handlers/tools';
import { FafEngineAdapter } from './handlers/engine-adapter';
import {
  FAF_IDE_SKILL_URI,
  SKILLS_EXTENSION_ID,
  SkillCatalog,
  SkillsGetRequestSchema,
  SkillsListRequestSchema,
} from './handlers/skills';
import { isError } from './utils/type-guards.js';
import { VERSION } from './version';

export interface FafMcpServerConfig {
  transport: 'stdio';
  port?: number;
  fafEnginePath: string;
  debug?: boolean;
  cors?: boolean;
  host?: string;
}

export class FafMcpServer {
  private server: Server;
  private resourceHandler: FafResourceHandler;
  private toolHandler: FafToolHandler;
  private skills: SkillCatalog;
  private config: FafMcpServerConfig;

  constructor(config: FafMcpServerConfig) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      cors: true,
      ...config,
    };

    this.skills = SkillCatalog.loadFafIde();

    this.server = new Server(
      {
        name: 'faf-mcp',
        version: VERSION,
      },
      {
        // TS MCP SDK ServerCapabilities uses `experimental` (not `extensions`).
        // J1 id lives under experimental; see docs/SKILLS-OVER-MCP.md.
        capabilities: {
          experimental: {
            [SKILLS_EXTENSION_ID]: {},
          },
          // No subscribe/unsubscribe handler is registered, so do NOT advertise
          // `subscribe` — advertising it makes resources/subscribe -32601, which
          // trips strict clients / Glama's capability health-check.
          resources: {
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
        },
        instructions:
          'FAF MCP IDE edition (one.faf/faf-mcp) — IANA application/vnd.faf+yaml. ' +
          'Skills: experimental io.modelcontextprotocol/skills — skills/list · skills/get · ' +
          `resources/read ${FAF_IDE_SKILL_URI} (sha256 digests). Stdio local; tools unchanged.`,
      }
    );

    // Create engine adapter to pass to handlers
    const engineAdapter = new FafEngineAdapter(config.fafEnginePath);

    this.resourceHandler = new FafResourceHandler(engineAdapter);
    this.toolHandler = new FafToolHandler(engineAdapter);

    this.setupHandlers();
  }

  /** The underlying MCP SDK Server. Test/introspection hook — e.g. connect an
   *  in-memory transport to drive real initialize/listTools/callTool round-trips
   *  in conformance tests, without stdio/HTTP. */
  getServer(): Server {
    return this.server;
  }

  /** Skill catalog (tests / introspection). */
  getSkills(): SkillCatalog {
    return this.skills;
  }

  private setupHandlers(): void {
    // Resource handlers (existing + skill:// URIs)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const base = await this.resourceHandler.listResources();
      return {
        resources: [...base.resources, ...this.skills.listResourcesMeta()],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const skillRes = this.skills.findResource(request.params.uri);
      if (skillRes) {
        return {
          contents: [
            {
              uri: skillRes.uri,
              mimeType: 'text/markdown',
              text: skillRes.text,
            },
          ],
        };
      }
      return this.resourceHandler.readResource(request.params.uri);
    });

    // Resource templates: none defined. The advertised `resources` capability
    // must answer this method with a valid (empty) list rather than -32601 —
    // strict clients and Glama's MCP Inspector probe every advertised capability.
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, () => {
      return { resourceTemplates: [] };
    });

    // J1 skills/* — custom methods via setRequestHandler (SDK has no first-class skills API)
    this.server.setRequestHandler(SkillsListRequestSchema, () => {
      return { skills: this.skills.listEntries() };
    });

    this.server.setRequestHandler(SkillsGetRequestSchema, (request) => {
      const uri = request.params?.uri;
      if (!uri || typeof uri !== 'string') {
        throw new Error('skills/get requires params.uri');
      }
      const entry = this.skills.getByUri(uri);
      if (!entry) {
        throw new Error(`unknown skill uri: ${uri}`);
      }
      return entry;
    });

    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return this.toolHandler.listTools();
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      try {
        const result = await this.toolHandler.callTool(
          request.params.name,
          request.params.arguments ?? {}
        );

        if (this.config.debug) {
          const duration = Date.now() - startTime;
          console.error(`Tool ${request.params.name} executed in ${duration}ms`);
        }

        return result;
      } catch (error: unknown) {
        const errorMessage = isError(error) ? error.message : 'Unknown error';
        console.error(`Tool execution failed:`, errorMessage);
        throw error;
      }
    });
  }

  async start(): Promise<void> {
    if (this.config.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      if (this.config.debug) {
        console.error('faf-mcp started with stdio transport');
      }
    } else {
      throw new Error(`Unsupported transport: ${String(this.config.transport)}`);
    }
  }

  async stop(): Promise<void> {
    // stdio transport: nothing to tear down beyond process exit.
  }

  getServerInfo() {
    return {
      name: 'faf-mcp',
      version: VERSION,
      transport: this.config.transport,
      port: this.config.port,
      host: this.config.host,
      championship: 'v3.0.0 - 33+ native tools',
    };
  }
}
