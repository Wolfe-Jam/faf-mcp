# FAF MCP - IANA .faf format for AI context

Universal MCP servers for persistent AI context across all platforms.

<div align="center">
  <img src="./assets/Project-faf-pckg-json-README.png" alt="project.faf file positioning" width="600" />
  <p><em>project.faf lives at the project root, between package.json and README.md</em></p>
</div>

## Packages

### Published
- **[faf-mcp](./packages/faf-mcp)** - Universal MCP server (all platforms)

### Planned
- **cursor-faf-mcp** - Cursor IDE specific package (on demand)
- **gemini-faf-mcp** - Google Gemini integration (Beta)
- **codex-faf-mcp** - Microsoft Codex/VS Code (Beta)
- **windsurf-faf-mcp** - Windsurf Editor (on demand)
- **any-faf-mcp** - Request any IDE integration (on demand)

## Architecture

```
faf-mcp-monorepo/
├── packages/
│   ├── faf-mcp/          # Universal package
│   ├── cursor-faf-mcp/   # Future: Cursor-specific
│   └── gemini-faf-mcp/   # Future: Gemini-specific
└── (shared code in future if needed)
```

## Development

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Publish all packages
npm run publish:all
```

## Strategy

Start with universal `faf-mcp`. Add platform-specific packages based on:
1. User demand (GitHub issues)
2. Platform complexity (requires custom implementation)
3. Strategic priority (BIG-3: Gemini → Codex)

## Relationship to claude-faf-mcp

`claude-faf-mcp` remains separate - maintained under Anthropic stewardship.
This monorepo is for universal and non-Claude platforms.

---

**Built with F1-inspired engineering principles** 🏎️⚡

**"It's so logical if it didn't exist, AI would have built it itself" — Claude