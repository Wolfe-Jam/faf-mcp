import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from './handlers/resources';
import { FafToolHandler } from './handlers/tools';
import { FafEngineAdapter } from './handlers/engine-adapter';
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
  private config: FafMcpServerConfig;

  constructor(config: FafMcpServerConfig) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      cors: true,
      ...config
    };

    this.server = new Server(
      {
        name: 'faf-mcp',
        version: VERSION,
      },
      {
        capabilities: {
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

  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return this.resourceHandler.listResources();
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.resourceHandler.readResource(request.params.uri);
    });

    // Resource templates: none defined. The advertised `resources` capability
    // must answer this method with a valid (empty) list rather than -32601 —
    // strict clients and Glama's MCP Inspector probe every advertised capability.
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      return { resourceTemplates: [] };
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
      throw new Error(`Unsupported transport: ${this.config.transport}`);
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
      championship: 'v3.0.0 - 33+ native tools'
    };
  }
}
