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

// Smithery server-card.json — allows Smithery to discover capabilities without scanning
app.get('/.well-known/mcp/server-card.json', async (_req, res) => {
  const toolsList = await toolHandler.listTools();
  res.json({
    serverInfo: { name: 'faf-mcp', version: VERSION },
    authentication: { required: false },
    tools: toolsList.tools,
    resources: [],
    prompts: []
  });
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
  <meta name="description" content="MCPaaS - Model Context Protocol as a Service. The future of MCP is Instant.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      position: relative;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at 70% 30%, rgba(139, 26, 43, 0.12) 0%, transparent 60%);
      pointer-events: none;
    }
    .accent-line {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent 0%, #8B1A2B 30%, #FFD700 50%, #8B1A2B 70%, transparent 100%);
      z-index: 100;
    }
    .container {
      position: relative;
      max-width: 1000px;
      margin: 0 auto;
      padding: 80px 2rem 0;
    }

    /* Hero */
    .hero {
      display: flex;
      align-items: center;
      gap: 60px;
      min-height: 70vh;
    }
    .hero-left { flex: 1; }
    .hero-right {
      width: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .so-2025 {
      font-size: 14px;
      font-weight: 700;
      color: #666;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .so-2025 span {
      color: #E23B3B;
      text-decoration: line-through;
    }
    .title {
      font-size: 5rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 16px;
      letter-spacing: -3px;
    }
    .title .accent { color: #8B1A2B; }
    .subtitle {
      font-size: 1.4rem;
      font-weight: 600;
      color: #ccc;
      margin-bottom: 12px;
    }
    .subtitle .gold { color: #FFD700; }
    .tagline {
      font-size: 1rem;
      color: #666;
      margin-bottom: 32px;
    }
    .lightning {
      font-size: 120px;
      line-height: 1;
      margin-bottom: 20px;
      filter: drop-shadow(0 0 40px rgba(255, 215, 0, 0.4));
    }
    .hero-badge {
      background: #8B1A2B;
      color: #fff;
      padding: 10px 24px;
      border-radius: 24px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .iana-label {
      margin-top: 12px;
      font-size: 11px;
      color: #E23B3B;
      font-weight: 700;
      letter-spacing: 1px;
    }

    /* Stats */
    .stats {
      display: flex;
      gap: 40px;
      margin-bottom: 32px;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 800;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* CTAs */
    .ctas {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ctas a {
      display: inline-block;
      padding: 12px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      transition: transform 0.2s;
    }
    .ctas a:hover { transform: translateY(-2px); }
    .btn-primary { background: #8B1A2B; color: #fff; }
    .btn-primary:hover { background: #a52035; }
    .btn-secondary { background: #E23B3B; color: #fff; }
    .btn-tertiary { background: transparent; border: 2px solid #444; color: #ccc; }
    .btn-tertiary:hover { border-color: #888; color: #fff; }

    /* Features */
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin: 80px 0 60px;
    }
    .feature {
      background: rgba(139, 26, 43, 0.06);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid rgba(139, 26, 43, 0.2);
    }
    .feature h3 {
      color: #E23B3B;
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 700;
    }
    .feature p {
      color: #888;
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    /* Three Doors */
    .three-doors {
      background: rgba(139, 26, 43, 0.06);
      border: 1px solid rgba(139, 26, 43, 0.3);
      border-radius: 12px;
      padding: 2rem;
      margin: 0 0 60px;
    }
    .three-doors h3 {
      color: #fff;
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      font-weight: 800;
    }
    .door {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      margin: 0.5rem 0;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      border: 1px solid rgba(139, 26, 43, 0.15);
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem;
    }
    .door-name { color: #ccc; font-weight: 600; }
    .door-value { color: #E23B3B; font-weight: 600; }
    .door-value a {
      color: #E23B3B;
      text-decoration: none;
    }
    .door-value a:hover { color: #FFD700; }

    /* Bottom bar */
    .bottom-bar {
      border-top: 2px solid transparent;
      border-image: linear-gradient(90deg, transparent 0%, #8B1A2B 30%, #FFD700 50%, #8B1A2B 70%, transparent 100%) 1;
      padding: 20px 0;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bottom-left {
      font-size: 13px;
      color: #999;
      font-weight: 600;
    }
    .bottom-platforms {
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: #ccc;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .bottom-platforms .dot { color: #E23B3B; }
    .bottom-version {
      text-align: center;
      padding: 20px 0 40px;
      color: #444;
      font-size: 0.8rem;
    }

    @media (max-width: 768px) {
      .hero { flex-direction: column; text-align: center; min-height: auto; padding-top: 40px; }
      .hero-right { width: 100%; }
      .title { font-size: 3.5rem; }
      .stats { justify-content: center; }
      .ctas { justify-content: center; }
      .features { grid-template-columns: 1fr; }
      .bottom-bar { flex-direction: column; gap: 12px; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="accent-line"></div>

  <div class="container">
    <div class="hero">
      <div class="hero-left">
        <div class="so-2025">MCP Servers are <span>so 2025</span></div>
        <div class="title">MCP<span class="accent">aa</span>S</div>
        <div class="subtitle">The future of MCP is Instant <span class="gold">&#9889;</span></div>
        <p class="tagline">Model Context Protocol as a Service</p>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">21</div>
            <div class="stat-label">MCP Tools</div>
          </div>
          <div class="stat">
            <div class="stat-value">0</div>
            <div class="stat-label">Config Required</div>
          </div>
          <div class="stat">
            <div class="stat-value">33k+</div>
            <div class="stat-label">Downloads</div>
          </div>
        </div>

        <div class="ctas">
          <a href="https://mcpaas.live" class="btn-primary">mcpaas.live</a>
          <a href="https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp" class="btn-secondary">Deploy to Vercel</a>
          <a href="https://faf.one" class="btn-tertiary">Learn More</a>
        </div>
      </div>

      <div class="hero-right">
        <div class="lightning">&#9889;</div>
        <div class="hero-badge">ZERO CONFIG DEPLOY</div>
        <div class="iana-label">IANA REGISTERED<br><span style="color:#888;font-size:10px;letter-spacing:1.5px;">SINCE OCT 2025</span></div>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <h3>Zero Install</h3>
        <p>No npm. No pip. Just point your MCP client to a URL and go.</p>
      </div>
      <div class="feature">
        <h3>Universal</h3>
        <p>Works with Claude, Grok, Gemini, Cursor, Windsurf, any MCP client.</p>
      </div>
      <div class="feature">
        <h3>Always Live</h3>
        <p>Edge-deployed on 300+ locations. Sub-ms cold starts via 2.7KB Zig-WASM.</p>
      </div>
    </div>

    <div class="three-doors">
      <h3>Three Ways to Deploy</h3>
      <div class="door">
        <span class="door-name">Hosted</span>
        <span class="door-value"><a href="https://mcpaas.live">mcpaas.live</a></span>
      </div>
      <div class="door">
        <span class="door-name">Self-Deploy</span>
        <span class="door-value"><a href="https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp">Deploy to Vercel</a></span>
      </div>
      <div class="door">
        <span class="door-name">Local</span>
        <span class="door-value">npx faf-mcp</span>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="bottom-left">v${VERSION} · IANA Registered · application/vnd.faf+yaml</div>
      <div class="bottom-platforms">
        <span>Claude</span><span class="dot">&bull;</span>
        <span>Grok</span><span class="dot">&bull;</span>
        <span>Gemini</span><span class="dot">&bull;</span>
        <span>Cursor</span><span class="dot">&bull;</span>
        <span>Any MCP</span>
      </div>
    </div>
    <div class="bottom-version">One URL. Any AI. Zero install.</div>
  </div>
  <script defer src="/_vercel/insights/script.js"></script>
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
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`);
});

export default app;
