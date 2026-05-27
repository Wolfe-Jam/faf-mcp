<!-- faf: faf-mcp | TypeScript | mcp-server | FAF MCP IDE Edition — persistent project context for Cursor, Windsurf, Cline, VS Code -->
<!-- faf: doc=readme | canonical=project.faf | score=100 | family=FAF -->

<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://www.faf.one/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">faf-mcp</h1>
    <p style="margin: 4px 0 0 0;"><strong>Persistent Project Context for Cursor, IDEs and VS Code. Define once. Sync everywhere.</strong></p>
  </div>
</div>

[![FAF Trophy 100%](https://img.shields.io/badge/FAF-%F0%9F%8F%86%20100%25-000000?labelColor=FF6B35)](https://faf.one)
[![IANA: vnd.faf+yaml](https://img.shields.io/badge/IANA-vnd.faf%2Byaml-00D4D4)](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml)
[![DOI: Context paper](https://img.shields.io/badge/DOI-Context%20paper-FF6B35)](https://doi.org/10.5281/zenodo.18251362)

**Home:** [faf-mcp.vercel.app](https://faf-mcp.vercel.app)

The MCP you didn't realise you needed, or wanted but didn't know who to ask, is here. Building on 62,000+ downloads across the FAF ecosystem, we bring you faf-mcp to cure your syncing pain and fuel your chosen AI with optimized context, on-demand.

[![CI](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/faf-mcp?color=00CCFF)](https://www.npmjs.com/package/faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![project.faf](https://img.shields.io/badge/project.faf-inside-00D4D4)](https://github.com/Wolfe-Jam/faf)

---

## Define once. Sync everywhere.

You maintain `.cursorrules`. Your teammate uses `AGENTS.md`. Someone on the team just switched to Gemini. Every AI tool wants its own context file — and they all say the same thing in different formats.

**faf-mcp is the dedicated MCP server for Cursor, Windsurf, Cline, VS Code, and every non-Claude platform.** One `.faf` file in your repo, synced to every format your team needs.

```
                      project.faf
                           │
          ┌────────┬───────┴───────┬────────────┐
          ▼        ▼               ▼            ▼
      CLAUDE.md  AGENTS.md  .cursorrules  GEMINI.md
      (Claude)   (Codex)      (Cursor)    (Gemini)
```

### Quick Start

```bash
npx faf-mcp
```

Add to your MCP config:

```json
{"mcpServers": {"faf": {"command": "npx", "args": ["-y", "faf-mcp"]}}}
```

| Platform | Config File |
|----------|-------------|
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **Cline** | Cline MCP settings |
| **VS Code** | MCP extension config |
| **Claude Desktop** | Use [claude-faf-mcp](https://github.com/Wolfe-Jam/claude-faf-mcp) |

---

## Three Ways to Deploy

| Door | Method | Best For |
|------|--------|----------|
| **Hosted** | [mcpaas.live](https://mcpaas.live) | Zero-install, point any MCP client to the URL |
| **Self-Deploy** | [Deploy to Vercel](https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp) | Your own instance, full control |
| **Local** | `npx faf-mcp` | IDE integration via stdio transport |

### Hosted (mcpaas.live)

Point your MCP client to `https://mcpaas.live/sse` — no install, no config, no maintenance. Served from 300+ Cloudflare edges with sub-ms cold starts via 2.7KB Zig-WASM engine.

### Self-Deploy (Vercel)

Deploy your own MCP server on Vercel in one click. Once deployed, your server exposes:
- `/health` — Health check
- `/info` — Server metadata + tool list
- `/sse` — MCP Server-Sent Events transport

### Local (npm)

```bash
npx faf-mcp
```

---

## Interop Tools

| Tool | Platform | Action |
|------|----------|--------|
| `faf_agents` | OpenAI Codex | Import/export/sync AGENTS.md |
| `faf_cursor` | Cursor IDE | Import/export/sync .cursorrules |
| `faf_gemini` | Google Gemini | Import/export/sync GEMINI.md |
| `faf_conductor` | Conductor | Import/export directory structure |
| `faf_git` | GitHub | Generate .faf from any repo URL |

```bash
# Sync to all formats at once
faf bi-sync --all

# Generate .faf from any GitHub repo
faf_git { url: "https://github.com/facebook/react" }
```

**25 MCP tools** (with CLI fallback) · **309 tests** (9 suites) · **7 bundled parsers**

---

## Cloud Sync

Share your FAF context globally via [mcpaas.live](https://mcpaas.live):

| Tool | Purpose |
|------|---------|
| `faf_cloud_publish` | Upload to cloud, get shareable URL |
| `faf_cloud_fetch` | Pull context from cloud |
| `faf_cloud_list` | List available souls |
| `faf_cloud_search` | Search across souls |
| `faf_cloud_share` | Generate share links |

**Example Workflow:**
```bash
# Upload your project.faf
faf_cloud_publish { soul_name: "my-project" }
→ https://mcpaas.live/souls/my-project

# Anyone can fetch it
faf_cloud_fetch { soul_name: "my-project" }
→ Context merged into local project.faf
```

**Zero-install sharing** - Recipients need no MCP setup. Served from 300+ Cloudflare edges with <1ms cold starts via 2.7KB Zig-WASM engine.

---

## Eternal Bi-Sync

Your `.faf` file and your platform context files stay synchronized in milliseconds.

```
project.faf  ←── 8ms ──→  .cursorrules / AGENTS.md / CLAUDE.md / GEMINI.md
                    Single source of truth
```

- Update either side → both stay aligned
- `--all` flag syncs to all four formats at once
- Zero manual maintenance
- Works across teams, branches, sessions

AI assistants forget. They drift. Every new session, AI starts guessing again. Bi-sync means **context never goes stale**.

---

## Tier System: From Blind to Optimized

| Tier | Score | Status |
|------|-------|--------|
| 🏆 **TROPHY** | 100% | AI never has to guess |
| ★ **GOLD** | 99%+ | 1 slot from Trophy |
| ◆ **SILVER** | 95%+ | Close — keep going |
| ◇ **BRONZE** | 85%+ | Interim — keep going |
| ● **GREEN** | 70%+ | Interim — keep going |
| ● **YELLOW** | 55%+ | AI flipping coins |
| ○ **RED** | <55% | AI working blind |
| ♡ **WHITE** | 0% | No context at all |

**At 55%, AI is guessing half the time.** At 100%, AI is optimized.

---

## use>faf | Prompt Pattern

**Start every prompt with "Use FAF"** to invoke MCP tools:

```
Use FAF to initialize my project
Use FAF to score my AI-readiness
Use FAF to sync my context
Use FAF to enhance my project
```

Works on all platforms — stops web search, forces tool usage.

---

## 25 Core MCP Tools

| Tool | Purpose |
|------|---------|
| `faf_init` | Initialize project.faf |
| `faf_score` | Check AI-readiness (0-100%) |
| `faf_sync` | Sync context across platforms |
| `faf_bi_sync` | Bi-directional .faf ↔ CLAUDE.md |
| `faf_enhance` | Intelligent enhancement |
| `faf_read` | Parse and validate FAF files |
| `faf_write` | Create/update FAF with validation |
| **Interop Tools** | |
| `faf_agents` | Import/export/sync AGENTS.md |
| `faf_cursor` | Import/export/sync .cursorrules |
| `faf_gemini` | Import/export/sync GEMINI.md |
| `faf_conductor` | Import/export directory structure |
| `faf_git` | Generate .faf from GitHub repo URL |
| **Cloud Tools** | |
| `faf_cloud_publish` | Upload to mcpaas.live |
| `faf_cloud_fetch` | Pull from cloud |
| `faf_cloud_list` | List souls |
| `faf_cloud_search` | Search souls |
| `faf_cloud_share` | Generate share links |

**Plus 36 advanced tools and CLI fallback** (via faf-cli v5.0.1):
- `faf readme` - Extract 6 Ws from README (+25-35% boost)
- `faf human-add` - Non-interactive YAML merge (6Ws Builder)
- `faf git` - GitHub repo analysis without cloning
- And 40+ more commands...

---

## Ecosystem

- **[claude-faf-mcp](https://npmjs.com/package/claude-faf-mcp)** — Claude Desktop (33 tools)
- **[faf-cli](https://npmjs.com/package/faf-cli)** — Terminal CLI
- **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** — WASM SDK (<5ms scoring)
- **[faf.one](https://faf.one)** — Official website

---

## License

MIT License — Free and open source

---

**Zero drift. Eternal sync. AI optimized.** 🏆

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
