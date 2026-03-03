import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from '../src/handlers/resources.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import express from 'express';
import cors from 'cors';

const VERSION = '1.3.1';

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
app.get('/health', (_req, res) => {
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
app.get('/info', async (_req, res) => {
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
    tools: toolsList.tools.map((t: { name: string }) => t.name),
    toolCount: toolsList.tools.length,
    endpoints: {
      health: '/health',
      info: '/info',
      sse: '/sse',
      ghost: '/ghost'
    },
    distribution: {
      hosted: 'https://mcpaas.live',
      selfDeploy: 'https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp',
      local: 'npx faf-mcp'
    }
  });
});

// Root endpoint - MCPaaS Landing Page
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
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
    .three-doors {
      background: rgba(0, 191, 99, 0.1);
      border: 2px solid #00bf63;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    .three-doors h3 {
      color: #00bf63;
      margin: 0 0 1rem;
    }
    .door {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      font-family: 'Courier New', monospace;
    }
    .door-name { color: #00D4D4; }
    .door-value { color: #00bf63; }
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
    .btn-tertiary { background: transparent; border: 2px solid #00D4D4; color: #00D4D4; }
    .version {
      color: #666;
      font-size: 0.85rem;
      margin-top: 2rem;
    }
    @media (max-width: 768px) {
      .features { grid-template-columns: 1fr; }
      h1 { font-size: 2.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">IANA REGISTERED</div>
    <div class="logo">&#9889;</div>
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

    <div class="three-doors">
      <h3>Three Ways to Deploy</h3>
      <div class="door">
        <span class="door-name">Hosted</span>
        <span class="door-value">mcpaas.live</span>
      </div>
      <div class="door">
        <span class="door-name">Self-Deploy</span>
        <span class="door-value">Deploy to Vercel</span>
      </div>
      <div class="door">
        <span class="door-name">Local</span>
        <span class="door-value">npx faf-mcp</span>
      </div>
    </div>

    <div class="cta">
      <a href="https://mcpaas.live" class="btn-primary">mcpaas.live</a>
      <a href="https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp" class="btn-secondary">Deploy to Vercel</a>
      <a href="https://faf.one" class="btn-tertiary">Learn More</a>
    </div>

    <div class="version">
      v${VERSION} · Vercel Edge · IANA Registered (application/vnd.faf+yaml)<br>
      <span style="color: #00bf63;">One URL. Any AI. Zero install.</span>
    </div>
  </div>
</body>
</html>`);
});

// SSE endpoint - Full MCP with per-request transport
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/sse', res);
  await mcpServer.connect(transport);

  req.on('close', () => {
    // Connection closed
  });
});

// Ghost guardian page (inline HTML - no file reads in serverless)
app.get('/ghost', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ghost - MCPaaS Guardian</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a; color: #f5f5f5;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .header {
      position: fixed; top: 0; left: 0; right: 0;
      padding: 1rem 2rem; display: flex; justify-content: space-between;
      align-items: center; background: rgba(10, 10, 10, 0.95);
      border-bottom: 1px solid #222; z-index: 100;
    }
    .logo { font-size: 1.2rem; font-weight: 700; color: #FF6B35; }
    nav { display: flex; gap: 2rem; }
    nav a { color: #888; text-decoration: none; transition: color 0.2s; }
    nav a:hover { color: #00D4D4; }
    .container { text-align: center; padding: 2rem; max-width: 800px; margin-top: 60px; }
    .guardian-locked {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 2rem;
    }
    .ghost-icon {
      font-size: 8rem; animation: float 3s ease-in-out infinite;
      cursor: pointer; transition: transform 0.3s, filter 0.3s;
    }
    .ghost-icon:hover {
      transform: scale(1.1);
      filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    .guardian-message { font-size: 1.5rem; color: #888; margin-bottom: 1rem; }
    .guardian-subtitle { color: #666; font-size: 1rem; max-width: 500px; line-height: 1.6; }
    .reveal-button {
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #00D4D4 0%, #00A8A8 100%);
      color: #0a0a0a; border: none; border-radius: 12px;
      font-size: 1.2rem; font-weight: 700; cursor: pointer;
      transition: transform 0.2s; margin-top: 1rem;
    }
    .reveal-button:hover { transform: translateY(-2px); }
    .guardian-unlocked { display: none; width: 100%; max-width: 900px; }
    .guardian-unlocked.revealed { display: block; animation: fadeIn 0.5s ease-in; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .content-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #00D4D4;
    }
    .content-header h1 { font-size: 2rem; color: #00D4D4; }
    .lock-button {
      padding: 0.75rem 1.5rem; background: rgba(255, 255, 255, 0.1);
      color: #f5f5f5; border: 1px solid #333; border-radius: 8px;
      cursor: pointer; font-size: 1rem; transition: all 0.2s;
    }
    .lock-button:hover { background: rgba(255, 255, 255, 0.15); border-color: #666; }
    .soul-container {
      background: #1a1a1a; border: 1px solid #333;
      border-radius: 16px; padding: 2rem; text-align: left;
    }
    .soul-meta {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem; margin-bottom: 2rem;
    }
    .meta-item { background: #0a0a0a; padding: 1rem; border-radius: 8px; border: 1px solid #222; }
    .meta-label { color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .meta-value { color: #00D4D4; font-size: 1.1rem; font-weight: 600; }
    .soul-content {
      background: #0a0a0a; border: 1px solid #222; border-radius: 12px;
      padding: 1.5rem; font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem; line-height: 1.8; color: #f5f5f5;
      white-space: pre-wrap; overflow-x: auto; max-height: 600px; overflow-y: auto;
    }
    .ai-note {
      background: rgba(0, 212, 212, 0.1); border: 1px solid #00D4D4;
      border-radius: 8px; padding: 1rem; margin-top: 2rem;
      text-align: center; color: #888; font-size: 0.9rem;
    }
    .ai-note strong { color: #00D4D4; }
    .footer { margin-top: 4rem; padding: 2rem; text-align: center; color: #666; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">&#9889; MCPaaS</div>
    <nav>
      <a href="/ghost">Ghost</a>
      <a href="/info">API</a>
      <a href="/">Home</a>
    </nav>
  </div>
  <div class="container">
    <div class="guardian-locked" id="guardian-locked">
      <div class="ghost-icon" onclick="revealSoul()">&#128123;</div>
      <div class="guardian-message">Ziggy Guards This Soul</div>
      <p class="guardian-subtitle">
        Your .faf project DNA is protected by Ziggy, the 2.7KB Zig WASM guardian.
        Click the ghost to reveal the contents. AI assistants always have access.
      </p>
      <button class="reveal-button" onclick="revealSoul()">Reveal Soul Content</button>
    </div>
    <div class="guardian-unlocked" id="guardian-unlocked">
      <div class="content-header">
        <h1>Soul Revealed</h1>
        <button class="lock-button" onclick="lockSoul()">Lock Again</button>
      </div>
      <div class="soul-container">
        <div class="soul-meta">
          <div class="meta-item"><div class="meta-label">Soul ID</div><div class="meta-value">demo-soul-001</div></div>
          <div class="meta-item"><div class="meta-label">Project</div><div class="meta-value">MCPaaS Demo</div></div>
          <div class="meta-item"><div class="meta-label">Last Updated</div><div class="meta-value" id="timestamp">Just now</div></div>
          <div class="meta-item"><div class="meta-label">AI-Readiness</div><div class="meta-value">99%</div></div>
        </div>
        <div class="soul-content">name: MCPaaS Demo Project
version: 1.0.0
tier: Gold

context:
  what: "Universal MCP server for all platforms"
  why: "Zero-install MCP via URL - works with any AI client"
  how: "Vercel Edge deployment with HTTP-SSE transport"

stack:
  runtime: Node.js + TypeScript
  framework: Express + MCP SDK
  deployment: Vercel Edge Functions
  transport: HTTP Server-Sent Events (SSE)

architecture:
  - MCP Server (Anthropic SDK)
  - FAF Resource Handler (project DNA)
  - FAF Tool Handler (context operations)
  - Ghost Guardian (Ziggy - 2.7KB Zig WASM)

ai_readiness: 99%
faf_certified: true
guardian: "Ziggy"</div>
        <div class="ai-note">
          <strong>Note for AI Assistants:</strong> This content is always accessible to you via the MCP protocol.
          The guardian only protects human viewing during demos and screenshares.
        </div>
      </div>
    </div>
  </div>
  <div class="footer">
    MCPaaS Ghost Guardian · Powered by Ziggy (2.7KB Zig WASM) · <a href="https://faf.one" style="color: #FF6B35;">FAF.one</a>
  </div>
  <script>
    document.getElementById('timestamp').textContent = new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    function revealSoul() {
      document.getElementById('guardian-locked').style.display = 'none';
      document.getElementById('guardian-unlocked').classList.add('revealed');
      sessionStorage.setItem('soul-revealed', 'true');
    }
    function lockSoul() {
      document.getElementById('guardian-unlocked').classList.remove('revealed');
      document.getElementById('guardian-locked').style.display = 'flex';
      sessionStorage.removeItem('soul-revealed');
    }
    if (sessionStorage.getItem('soul-revealed') === 'true') { revealSoul(); }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'g' || e.key === 'G') {
        var isRevealed = document.getElementById('guardian-unlocked').classList.contains('revealed');
        if (isRevealed) { lockSoul(); } else { revealSoul(); }
      }
    });
  </script>
</body>
</html>`);
});

export default app;
