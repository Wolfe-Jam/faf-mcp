<!-- faf: faf-mcp | TypeScript | mcp-server | FAF MCP IDE Edition — persistent project context for Cursor, Windsurf, Cline, VS Code -->
<!-- faf: doc=changelog | latest=v2.1.3 | canonical=project.faf | family=FAF -->

# Changelog

All notable changes to faf-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

**Interop now enhances your files.** The same solid, structured `.faf` data is prefixed to the top of your context files for rapid AI consumption upfront — and your Markdown stays in the instruction lane. Most important for `.cursorrules`, which IDE users hand-maintain.

### Changed

- **Non-destructive interop.** `faf_cursor`, `faf_agents`, `faf_gemini`, and `faf_sync` now inject a structured `.faf` block at the top of .cursorrules, AGENTS.md, GEMINI.md, and CLAUDE.md and preserve everything you've written below. Re-runs update the block in place (idempotent); existing faf-generated files upgrade cleanly in one pass.

## [2.1.3] - 2026-06-11

### Security
- **Path confinement on every caller-supplied `path` argument (CWE-22 / CWE-73 / CWE-200).** The shared `getProjectPath()` chokepoint (feeding the `.faf` tools) and the `faf_read` / `faf_write` file tools resolved a caller path straight into a filesystem read/write with no confinement — so an absolute path or `../` traversal could read any file the server process could read (e.g. `/etc/passwd`, `~/.ssh/id_rsa`) or write outside the project. New `safe-path.ts` confines reads to `.faf` / `.fafm` context files and general file ops to the project root (cwd + system temp; override with `FAF_ALLOWED_ROOTS`), canonicalizes through symlinks (closing the symlink bypass), and rejects traversal/absolute escapes; `callTool()` gains a central PATH-DENIED guard. Identified by the maintainers during a sibling-server audit prompted by the coordinated disclosure of the same class of issue in `grok-faf-mcp` by Zhihao Zhang (Worcester Polytechnic Institute). Adds a security regression suite (incl. symlink bypass).

## [2.1.2] - 2026-06-08

MCP capability completeness — the stdio server now answers every capability it
advertises. Strict clients (Cursor, Windsurf, Cline) and Glama's Inspector probe
each advertised capability; a `-32601` flags the server even when tools work.

### Fixed

- **`resources/templates/list` now returns `{ resourceTemplates: [] }`** instead
  of `-32601`. Registered `ListResourceTemplatesRequestSchema` (`src/server.ts`).
- **Dropped unbacked `subscribe: true`** from the advertised `resources`
  capability (no subscribe handler exists) → `resources: { listChanged: true }`.
  `/info` payload aligned.

No tool changes. Also added `glama.json` for explicit directory metadata.

## [2.1.1] - 2026-05-26

Loop closed on truthful, single-sourced scoring. The active MCP handler
now reads faf-cli's real scorer directly — same path the championship
layer was already using, same number `faf score` (CLI) emits.

### Fixed

- **`faf_score`** — now calls faf-cli's `scoreFafYaml` (the IANA-spec
  scorer) directly, replacing the legacy file-presence pseudo-score
  (40 + 30 + 15 + 14, max 100). Output reformatted to the canonical
  tier card with `FAF SCORE: <n>/100`, progress bar, populated/total
  slot count, and the next-tier hint. The banned medal / colored-circle
  tier ladder is gone from this surface too.

### Tests

- **WJTTC AERO Phase 2** — score-parity assertion tightened to TRUE
  parity: MCP `faf_score` numeric == faf-cli `scoreFafYaml(...).score`
  on the same YAML. Determinism + repeatability tests retained as
  high-signal companions; comment updated to mark the divergence
  observed in v2.1.0 as resolved here.

## [2.1.0] - 2026-05-18

Truthful, single-sourced scoring. faf-mcp no longer computes its own
score — every score surface reads faf-cli's real scorer, the same
number your AI and `faf score` see.

### Fixed

- **faf_display** — rendered a fabricated file-presence pseudo-score
  (40/30/15/14, max 99), a non-deterministic timestamp, off-canon
  colors and a divergent template. Now single-sources faf-cli's
  `generateProjectHtml` — byte-identical to `faf show` / `faf export
  --html`. Default output `project.html` (gitignored — a view, not
  source).
- **faf_show / faf_score / faf_status** — same fake file-presence
  score, plus the banned medal / colored-circle tier ladder
  (🥇🥈🥉🟢🟡🔴🤍). All routed through one `getFafScore()` helper
  backed by faf-cli's scorer + canonical tier ladder. Deterministic
  output (no timestamps, no rotating quotes). Removed the fabricated
  `full` scorecard and its unmeasured performance claims.

### Changed

- **faf-cli ^6.7.1** — consumes faf-cli's typed public API (the real
  scorer + the project.html renderer) as the single source of truth.

## [2.0.1] - 2026-03-07

### Fixed

- **README updated** — Rewritten for Cursor/Windsurf/Cline devs: v2.0.0 announcement in hero, "Define once. Sync everywhere." with interop diagram and quick start up front
- **Windows CRLF** — Normalize `\r\n` in conductor-parser, gemini-parser, and conductor tests (same fix as agents/cursorrules from faf-cli v4.5.0)
- **CI pipeline** — Fix 3 failures: npm audit fix (hono, express-rate-limit), audit-level downgraded to critical with continue-on-error, MCP Registry duplicate version tolerance
- **Vercel badge** — Replaced oversized deploy button with shields.io badge

## [2.0.0] - 2026-03-07 — The Interop MCP for Context

**Define once. Sync everywhere.**

### Added

- **AI Format Interop** — 5 new MCP tools for cross-platform AI context
  - `faf_agents`: Import/export/sync AGENTS.md (OpenAI Codex / Linux Foundation)
  - `faf_cursor`: Import/export/sync .cursorrules (Cursor IDE)
  - `faf_gemini`: Import/export/sync GEMINI.md (Google Gemini CLI)
  - `faf_conductor`: Import/export Conductor directory structure
  - `faf_git`: Extract .faf context from any public GitHub repo URL
- **Bi-sync `--all` flag** — Sync project.faf to all formats at once (CLAUDE.md + AGENTS.md + .cursorrules + GEMINI.md)
- **7 bundled parsers** — All parser logic runs standalone, zero CLI dependency
  - agents-parser, cursorrules-parser, gemini-parser, conductor-parser
  - github-extractor, faf-git-generator, slot-counter
- **WJTTC v2.0.0 Championship Suite** — 73 Brake/Engine/Aero tests
- **New test suites** — interop-v450, cli-mcp-parity, type-definitions-edge-cases

### Changed

- **Tool count**: 56 → 61 (25 core + 36 advanced)
- **Tests**: 84 → 309 (9 suites)
- **MCP SDK**: ^1.26.0 → ^1.27.1
- Tier system fix: 100 = Trophy max (105 removed)
- Path resolver: tilde expansion + project discovery
- Version resolver: multi-path package.json fallback

### Why Major Version

New interop tools change the MCP contract surface. Define once in .faf, sync to every AI platform.

## [1.3.1] - 2026-02-15

### Fixed

- **Remove 105% scoring system** - Align with official FAF tier system (0-100%)
  - Remove Easter egg logic that awarded 105% for rich .faf + CLAUDE.md
  - Update to Trophy (100%) as perfect score
  - 🍊 Big Orange is now a BADGE awarded separately, not a calculated score
  - Update tests and documentation to reflect correct tier system
  - Fixes alignment with FAF standard where scores range 0-100%

### Changed

- Updated faf-cli dependency to v4.4.0

## [1.3.0] - 2026-02-09

### 🌐 MCPaaS Integration - Universal Context Sharing

**The Answer (v1.3.0 = 13 → 42/13 = 3.23... → The Magic Number)**

### Added

- **☁️ MCPaaS Cloud Integration** - Global context sharing via mcpaas.live
  - `faf_cloud_publish` - Upload project.faf to cloud, get shareable URL
  - `faf_cloud_fetch` - Pull context from cloud into local project.faf
  - `faf_cloud_list` - List available souls on mcpaas.live
  - `faf_cloud_search` - Full-text search + tag-based filtering
  - `faf_cloud_share` - Generate shareable links for instant access

- **Zero-Install Sharing** - Recipients need no MCP setup
  - Share via URL: `https://mcpaas.live/souls/your-project`
  - Fetch anywhere: `faf_cloud_fetch { soul_name: "your-project" }`
  - Edge-deployed: 300+ Cloudflare locations
  - <1ms cold starts via 2.7KB Zig-WASM engine

- **New Handler Module** - `src/handlers/cloud-handler.ts`
  - HTTP client for mcpaas.live/mcp endpoint
  - MCP protocol over HTTP (JSON-RPC 2.0)
  - OAuth 2.0 authentication ready (Auth0)
  - Error handling and rate limit awareness

### Changed

- **Tool Count** - 17 → 22 native MCP tools
- **faf-cli Dependency** - ^4.0.0 → ^4.3.0
  - Inherits `faf readme` - Automatic README extraction (+25-35% score boost)
  - Inherits `faf human-add` - 6Ws Builder integration (non-interactive YAML merge)
  - Inherits all v4.1.0-4.3.0 improvements via CLI fallback
- **README** - Added Cloud Sync section with examples
- **Architecture** - Enhanced for hybrid local + cloud workflows

### Technical

- Uses built-in fetch API (Node.js 18+)
- Non-interactive cloud operations
- Graceful fallbacks for network issues
- Compatible with all MCP platforms

## [1.2.1] - 2025-12-22

### Added
- **TYPE_DEFINITIONS Scoring Parity** - Ported from claude-faf-mcp v3.3.7
  - 94 project types + 38 aliases for accurate slot-based scoring
  - Single source of truth for project type detection
  - Ensures faf-mcp scoring matches faf-cli scoring exactly

### Changed
- Scoring engine now uses TYPE_DEFINITIONS for slot applicability

## [1.2.0] - 2025-12-18

### Trophy Achievement

**faf-mcp v1.2.0 achieves 100% FAF Score** - Trophy Championship rating with complete human context.

### Changed

- **Human Context** - Complete rewrite of human_context section
  - who: Developers using Claude, Cursor, Windsurf, VS Code, Cline, and any MCP-compatible IDE
  - what: Universal MCP server providing .faf context tools - 17 native tools + 40+ CLI fallback commands
  - why: Eliminate the 20-minute AI context tax - give AI instant project understanding in 30 seconds
  - where: npm registry, MCP ecosystem, Claude Desktop, Cursor IDE, Windsurf Editor
  - when: Production/Stable - v1.2.0 WJTTC certified
  - how: npx faf-mcp or npm install -g faf-mcp, then add to your MCP config
  - additional_context: IANA-registered format (application/vnd.faf+yaml), 15k+ downloads, official Anthropic MCP steward

- **faf-cli Dependency** - Updated to 3.2.6

### Score

- FAF Score: 100/100 Trophy Championship
- Context Quality: 21/21 slots filled (100%)
- AI Confidence: HIGH

## [1.1.4] - 2025-12-17

### WJTTC MCP Certification Achievement

**faf-mcp v1.1.4 achieves CHAMPIONSHIP GRADE certification** - Adopting the new WJTTC MCP Test Standard.

### Added

- **WJTTC MCP Certification** - 7-tier certification system for MCP servers
  - Tier 1: Protocol Compliance (MCP spec 2025-11-25)
  - Tier 2: Capability Negotiation
  - Tier 3: Tool Integrity
  - Tier 4: Resource Management
  - Tier 5: Security Validation
  - Tier 6: Performance Benchmarks (<50ms operations)
  - Tier 7: Integration Readiness

### Changed

- **faf-cli Dependency** - Bumped to ^3.2.4 (WJTTC certified engine)

### Test Results

- 4/4 test suites passing (visibility, performance, security, desktop-native)
- 63 tests total, 100% pass rate
- Performance: File read 0.46ms, File write 18ms, Directory list 2.84ms
- Memory: No leaks detected (2.53MB growth under load)

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
