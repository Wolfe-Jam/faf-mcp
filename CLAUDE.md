<!-- faf: faf-mcp | TypeScript | mcp | The Interop MCP for Context. Universal .faf MCP server for Cursor, Windsurf, Cline, VS Code, and all MCP-compatible IDEs. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". -->
<!-- faf: claim=project.faf | family=FAF -->

# CLAUDE.md — faf-mcp

## What This Is

The Interop MCP for Context. Universal .faf MCP server for Cursor, Windsurf, Cline, VS Code, and all MCP-compatible IDEs. IANA-registered application/vnd.faf+yaml. Start with "Use FAF".

## Stack

- **Language:** TypeScript
- **Backend:** MCP SDK (TS)
- **Api Type:** MCP (stdio/HTTP-SSE)
- **Runtime:** Node.js >=18
- **Hosting:** Vercel
- **Build:** TypeScript (tsc)
- **Cicd:** GitHub Actions
- **Package Manager:** npm

## Context

- **Who:** Developers using Claude, Cursor, Windsurf, VS Code, Cline, and any MCP-compatible IDE
- **What:** Universal MCP server providing .faf context tools — 25 core + 36 advanced, interop with AGENTS.md, .cursorrules, GEMINI.md
- **Why:** Eliminate the 20-minute AI context tax — give AI instant project understanding in 30 seconds
- **Where:** Vercel web (faf-mcp.vercel.app) · npm · MCP Registry · any MCP-compatible IDE — people get it how they wish
- **When:** Production/Stable — v2.0.0 WJTTC certified (309/309 tests, 9 suites)
- **How:** npx faf-mcp or npm install -g faf-mcp, then add to your MCP config

---

*STATUS: BI-SYNC ACTIVE — 2026-05-26T06:37:16.305Z*
