<!-- faf:start -->
<!-- faf: faf-mcp | TypeScript | mcp | The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". -->
<!-- faf: claim=project.faf | family=FAF -->

# GitHub Copilot Instructions — faf-mcp

> Authored from project.faf by FAF. Copilot reads these instructions on every request in this repository — keep them short and broadly applicable.

The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF".

## Tech stack

- **Language:** TypeScript
- **Backend:** MCP SDK (TS)
- **API:** MCP (stdio)
- **Runtime:** Node.js >=22
- **Hosting:** npm
- **Package Manager:** npm

## Build & run

- Build with `TypeScript (tsc)`.
- CI runs on GitHub Actions.

## Project context

- **Who:** Developers using Claude, Cursor, Windsurf, VS Code, Cline, and any MCP-compatible IDE
- **What:** The Cursor / IDE Edition — persistent context for Cursor, VS Code, and every MCP-compatible IDE — 29 MCP tools (15 essential shown by default), interop with AGENTS.md, .cursorrules, GEMINI.md
- **Why:** Eliminate the 20-minute AI context tax — give AI instant project understanding in 30 seconds
- **Where:** npm · MCP Registry · any MCP-compatible IDE — people get it how they wish
- **When:** Production/Stable — v3.0.2 The Compose Edition, WJTTC certified
- **How:** npx faf-mcp or npm install -g faf-mcp, then add to your MCP config
<!-- faf:end -->
