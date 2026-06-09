import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from './handlers/resources';
import { FafToolHandler } from './handlers/tools';
import { FafEngineAdapter } from './handlers/engine-adapter';
import express from 'express';
import cors from 'cors';
import { isError } from './utils/type-guards.js';
import { VERSION } from './version';

export interface FafMcpServerConfig {
  transport: 'stdio' | 'http-sse';
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
  private httpServer?: any;

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

  private createHttpApp(): express.Application {
    const app = express();
    
    // Enable CORS if requested
    if (this.config.cors) {
      app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
      }));
    }

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        server: 'faf-mcp',
        version: VERSION,
        transport: 'http-sse',
        timestamp: new Date().toISOString(),
        championship: '33+ tools, zero shell execution'
      });
    });

    // Server info endpoint
    app.get('/info', (_req, res) => {
      res.json({
        name: 'faf-mcp',
        version: VERSION,
        description: 'Universal FAF MCP Server for Claude - AI Context Intelligence & Project Enhancement',
        transport: 'http-sse',
        capabilities: {
          resources: { listChanged: true },
          tools: { listChanged: true }
        },
        tools: [
          'faf_status', 'faf_score', 'faf_init', 'faf_trust',
          'faf_sync', 'faf_enhance', 'faf_bi_sync', 'faf_clear', 'faf_debug'
        ]
      });
    });

    return app;
  }

  async start(): Promise<void> {
    if (this.config.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      if (this.config.debug) {
        console.error('faf-mcp started with stdio transport');
      }
    } else if (this.config.transport === 'http-sse') {
      const app = this.createHttpApp();

      // Add SSE endpoint handler - create transport per request
      app.get('/sse', async (req, res) => {
        if (this.config.debug) {
          console.error('New SSE connection established');
        }

        // Create SSE transport for this specific connection
        const transport = new SSEServerTransport('/sse', res);
        await this.server.connect(transport);

        // Handle client disconnect
        req.on('close', () => {
          if (this.config.debug) {
            console.error('SSE connection closed');
          }
        });
      });

      // Start HTTP server (ensure port and host are defined)
      const port = this.config.port ?? 3001;
      const host = this.config.host ?? '0.0.0.0';
      this.httpServer = app.listen(port, host, () => {
        if (this.config.debug) {
          console.error(`faf-mcp started with HTTP/SSE transport on ${host}:${port}`);
          console.error(`SSE endpoint: http://${host}:${port}/sse`);
          console.error(`Health check: http://${host}:${port}/health`);
        }
      });

      // Handle server errors
      this.httpServer.on('error', (error: unknown) => {
        const errorMessage = isError(error) ? error.message : 'Unknown HTTP server error';
        console.error('HTTP server error:', errorMessage);
        throw error;
      });
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }
  }

  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          if (this.config.debug) {
            console.error('faf-mcp HTTP/SSE transport stopped');
          }
          resolve();
        });
      });
    }
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
