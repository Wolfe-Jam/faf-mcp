import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from '../src/handlers/resources.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Import version directly from package.json for Vercel
import packageJson from '../package.json' assert { type: 'json' };
const VERSION = packageJson.version;

// Stripe and billing imports
import { createCheckoutSession, handleStripeWebhook, getBalance } from './stripe-checkout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Full MCP server for Vercel deployment
const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Initialize MCP server
const mcpServer = new Server(
  {
    name: 'faf-mcp',
    version: VERSION,
  },
  {
    capabilities: {
      resources: {
        subscribe: true,
        listChanged: true,
      },
      tools: {
        listChanged: true,
      },
    },
  }
);

// Setup handlers
const engineAdapter = new FafEngineAdapter('faf');
const resourceHandler = new FafResourceHandler(engineAdapter);
const toolHandler = new FafToolHandler(engineAdapter);

mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  return resourceHandler.listResources();
});

mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return resourceHandler.readResource(request.params.uri);
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return toolHandler.listTools();
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  return toolHandler.callTool(
    request.params.name,
    request.params.arguments ?? {}
  );
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'faf-mcp',
    version: VERSION,
    transport: 'http-sse',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    championship: 'Universal MCP - All Platforms'
  });
});

// Info endpoint
app.get('/info', async (req, res) => {
  const toolsList = await toolHandler.listTools();
  res.json({
    name: 'faf-mcp',
    version: VERSION,
    description: 'Universal FAF MCP Server for ALL platforms - AI Context Intelligence',
    transport: 'http-sse',
    platform: 'vercel',
    capabilities: {
      resources: { subscribe: true, listChanged: true },
      tools: { listChanged: true }
    },
    tools: toolsList.tools.map(t => t.name),
    toolCount: toolsList.tools.length,
    endpoints: {
      health: '/health',
      info: '/info',
      sse: '/sse',
      pricing: '/pricing',
      billing: '/billing',
      ghost: '/ghost'
    }
  });
});

// Root endpoint - MCPaaS Landing Page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MCPaaS | MCP as a Service</title>
  <meta name="description" content="MCPaaS - Model Context Protocol as a Service. Zero-install MCP servers via URL.">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 800px;
    }
    .logo {
      font-size: 80px;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 3.5rem;
      margin: 0;
      background: linear-gradient(135deg, #00bf63 0%, #00D4D4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .tagline {
      font-size: 1.5rem;
      color: #888;
      margin: 0.5rem 0 2rem;
    }
    .badge {
      display: inline-block;
      background: #FF6B35;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 2rem;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .feature {
      background: rgba(255,255,255,0.05);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .feature h3 {
      color: #00bf63;
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
    }
    .feature p {
      color: #888;
      margin: 0;
      font-size: 0.9rem;
    }
    .endpoints {
      background: rgba(0, 191, 99, 0.1);
      border: 2px solid #00bf63;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    .endpoint {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      font-family: 'Courier New', monospace;
    }
    .endpoint-name { color: #00D4D4; }
    .endpoint-path { color: #00bf63; }
    .cta {
      margin-top: 2rem;
    }
    .cta a {
      display: inline-block;
      padding: 1rem 2rem;
      margin: 0.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .cta a:hover { transform: translateY(-2px); }
    .btn-primary { background: #00bf63; color: white; }
    .btn-secondary { background: #FF6B35; color: white; }
    .version {
      color: #666;
      font-size: 0.85rem;
      margin-top: 2rem;
    }
    .platforms {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin: 2rem 0;
      flex-wrap: wrap;
    }
    .platform {
      color: #666;
      font-size: 0.9rem;
    }
    .platform.active { color: #00bf63; font-weight: 600; }
    @media (max-width: 768px) {
      .features { grid-template-columns: 1fr; }
      h1 { font-size: 2.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">NEW CATEGORY</div>
    <div class="logo">⚡</div>
    <h1>MCPaaS</h1>
    <p class="tagline">Model Context Protocol as a Service</p>

    <div class="features">
      <div class="feature">
        <h3>Zero Install</h3>
        <p>No npm. No pip. Just point to a URL.</p>
      </div>
      <div class="feature">
        <h3>Universal</h3>
        <p>Works with Claude, Grok, Gemini, any MCP client.</p>
      </div>
      <div class="feature">
        <h3>Always Live</h3>
        <p>Edge-deployed. Globally distributed. Always running.</p>
      </div>
    </div>

    <div class="platforms">
      <span class="platform active">Claude</span>
      <span class="platform active">Grok</span>
      <span class="platform active">Gemini</span>
      <span class="platform active">Cursor</span>
      <span class="platform active">Any MCP</span>
    </div>

    <div class="endpoints">
      <h3 style="color: #00bf63; margin-top: 0;">Endpoints</h3>
      <div class="endpoint">
        <span class="endpoint-name">MCP SSE</span>
        <span class="endpoint-path">/sse</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-name">Health</span>
        <span class="endpoint-path">/health</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-name">Info</span>
        <span class="endpoint-path">/info</span>
      </div>
    </div>

    <div class="cta">
      <a href="https://mcpaas.live" class="btn-primary">mcpaas.live</a>
      <a href="https://faf.one/mcpaas" class="btn-secondary">Learn More</a>
    </div>

    <div class="version">
      v${VERSION} · Vercel Edge · First MCPaaS<br>
      <span style="color: #00bf63;">One URL. Any AI. Zero install.</span>
    </div>
  </div>
  <script defer src="https://va.vercel-scripts.com/v1/script.debug.js"></script>
</body>
</html>
  `);
});

// SSE endpoint - Full MCP with per-request transport
app.get('/sse', async (req, res) => {
  // Create SSE transport for this specific connection
  const transport = new SSEServerTransport('/sse', res);
  await mcpServer.connect(transport);

  // Handle client disconnect
  req.on('close', () => {
    // Connection closed
  });
});

// Pricing page
app.get('/pricing', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'pricing.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving pricing page:', error);
    res.status(500).send('Error loading pricing page');
  }
});

// Billing dashboard
app.get('/billing', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'billing.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving billing page:', error);
    res.status(500).send('Error loading billing page');
  }
});

// Stripe Checkout Session Creation
app.post('/api/create-checkout', createCheckoutSession);

// Stripe Webhook Handler (raw body required)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Get user token balance
app.get('/api/balance', getBalance);

// Ghost guardian page
app.get('/ghost', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'ghost.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving ghost page:', error);
    res.status(500).send('Error loading ghost page');
  }
});

export default app;
