<!-- faf:start -->
<!-- faf: faf-mcp | TypeScript | mcp | The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". -->
<!-- faf: claim=project.faf | family=FAF -->

# CLAUDE.md — faf-mcp

## What This Is

The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF".

## Stack

- **Language:** TypeScript
- **Backend:** MCP SDK (TS)
- **Api Type:** MCP (stdio + Streamable HTTP)
- **Runtime:** Node.js >=18
- **Hosting:** npm + Cloudflare edge
- **Build:** TypeScript (tsc)
- **Cicd:** GitHub Actions
- **Package Manager:** npm

## Context

- **Who:** Developers using Claude, Cursor, Windsurf, VS Code, Cline, and any MCP-compatible IDE
- **What:** The Cursor / IDE Edition — persistent context for Cursor, VS Code, and every MCP-compatible IDE — 31 MCP tools, interop with AGENTS.md, .cursorrules, GEMINI.md
- **Why:** Eliminate the 20-minute AI context tax — give AI instant project understanding in 30 seconds
- **Where:** npm · MCP Registry · Cloudflare edge (ide.faf.one/mcp/v1) · any MCP-compatible IDE — people get it how they wish
- **When:** Production/Stable — v2.0.0 WJTTC certified (309/309 tests, 9 suites)
- **How:** npx faf-mcp or npm install -g faf-mcp, then add to your MCP config

---

*STATUS: BI-SYNC ACTIVE — 2026-06-16T04:27:45.495Z*
<!-- faf:end -->
