# Changelog

All notable changes to faf-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-12-01

### Headline Feature
- **`faf readme` - Smart README Extraction** (via CLI fallback)
  - Auto-extract human context from your README.md (+25-35% score boost)
  - Intelligently finds the 6 Ws: WHO, WHAT, WHY, WHERE, WHEN, HOW
  - `faf readme --apply` to fill empty slots
  - `faf readme --apply --force` to overwrite existing

### Changed
- **faf-cli Dependency** - Bumped to >=3.2.1 (from >=3.1.1)
  - `faf readme` - Smart README extraction (see above)
  - `faf human-add` - Non-interactive context entry (Claude Code compatible)
  - Subsite auto-detection (static HTML sites achieve 100% scores)
  - `faf git` uses Git CLI (no more 60/hr API rate limits)

### Fixed
- **Corrected Tool Count** - README now accurately states 17 native tools + CLI fallback
  - 17 tools bundled natively in MCP server
  - 40+ additional commands available via faf-cli fallback

### Certification
- **WJTTC BIG ORANGE** - 105/100 score, 46/46 tests passing

## [1.1.1] - 2025-11-16

### Changed
- Updated Discord community invite link to working URL
- Added Anthropic-approved heritage statement to README
- Updated package.json description with new branding

### Fixed
- Discord invite link now uses permanent invite (never expires)

## [1.0.0] - 2025-11-12

### Added
- **Universal MCP Package** - Platform-agnostic MCP server for all MCP-compatible platforms
  - Works with Claude Desktop, Cursor, Windsurf, VS Code, and any MCP client
  - 50 MCP tools for FAF context management
  - Auto-installs faf-cli as dependency
  - Orange smiley icon included in package
- **Platform-Specific Documentation** - Setup guides for each major platform
  - Claude Desktop config instructions
  - Cursor IDE integration steps
  - Windsurf Editor setup
  - VS Code MCP extension guide

### Technical
- Based on claude-faf-mcp v3.3.0 codebase
- 100% standalone operation (bundled FAF engine)
- 16.2x faster than CLI versions
- 19ms average execution time
- Zero external dependencies

### Ecosystem
This is the universal package for FAF MCP integration. Platform-specific packages (cursor-faf-mcp, windsurf-faf-mcp, etc.) may follow based on demand.

---

*For claude-faf-mcp changelog history, see: https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/CHANGELOG.md*
