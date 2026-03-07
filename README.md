<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://www.faf.one/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">faf-mcp</h1>
    <p style="margin: 4px 0 0 0;"><strong>IANA-Registered Format for AI Context</strong> · <code>application/vnd.faf+yaml</code></p>
  </div>
</div>

> **Define once. Sync everywhere.** Universal MCP server for Cursor, Windsurf, Cline, VS Code, and all MCP-compatible platforms. At 100% (Gold Code), AI stops guessing and starts knowing.

[![CI](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml)
[![NPM Downloads](https://img.shields.io/npm/dt/faf-mcp?label=total%20downloads&color=00CCFF)](https://www.npmjs.com/package/faf-mcp)
[![npm version](https://img.shields.io/npm/v/faf-mcp?color=00CCFF)](https://www.npmjs.com/package/faf-mcp)
[![Website](https://img.shields.io/badge/Website-faf.one-orange)](https://faf.one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![project.faf](https://img.shields.io/badge/project.faf-inside-00D4D4)](https://github.com/Wolfe-Jam/faf)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp)

---

## The Problem: Context-Drift

AI assistants forget. They misunderstand. They drift.

Every new session, every new file, every new developer — AI starts guessing again. Your codebase context leaks away. Yesterday's perfect assistant becomes today's confused intern.

**.FAF fixes this permanently.**

---

## The Solution: Gold Code

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆  FAF AI-READINESS SCORE: 100/100 — GOLD CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

At 100%, AI is optimized. No more guessing.
Peak AI performance activated.

├─ Project DNA locked in        ├─ Zero context-drift
├─ Architecture understood      ├─ Eternal bi-sync active
├─ Domain model captured        ├─ Team alignment permanent
└─ Every session starts smart   └─ AI works WITH you, not around you

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💎 Lifecycle Value

Setup savings get you started. Lifecycle optimization keeps you ahead.

| When | Without FAF | With FAF |
|------|-------------|----------|
| **Day 1** | 20 min setup per dev | 0 min — instant context |
| **Month 1** | AI forgets between sessions | AI remembers everything |
| **Year 1** | New devs re-explain everything | New devs inherit full context |
| **Year 3+** | Institutional knowledge lost | Project DNA preserved forever |

**Setup savings: 20 minutes. Lifecycle savings: Infinite.**

---

## Three Ways to Deploy

| Door | Method | Best For |
|------|--------|----------|
| **Hosted** | [mcpaas.live](https://mcpaas.live) | Zero-install, point any MCP client to the URL |
| **Self-Deploy** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?repository-url=https://github.com/Wolfe-Jam/faf-mcp) | Your own instance, full control |
| **Local** | `npx faf-mcp` | IDE integration via stdio transport |

### Hosted (mcpaas.live)

Point your MCP client to `https://mcpaas.live/sse` — no install, no config, no maintenance. Served from 300+ Cloudflare edges with sub-ms cold starts via 2.7KB Zig-WASM engine.

### Self-Deploy (Vercel)

Click the Deploy button above to get your own MCP server on Vercel in one click. Once deployed, your server exposes:
- `/health` — Health check
- `/info` — Server metadata + tool list
- `/sse` — MCP Server-Sent Events transport
- `/ghost` — Ghost guardian demo

### Local (npm)

```bash
npx faf-mcp
```

Or install globally and add to your MCP config:

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

## 🔄 AI Format Interop

Define once in `.faf`, sync to every AI platform:

```
                      project.faf
                           │
          ┌────────┬───────┴───────┬────────────┐
          ▼        ▼               ▼            ▼
      CLAUDE.md  AGENTS.md  .cursorrules  GEMINI.md
      (Claude)   (Codex)      (Cursor)    (Gemini)
```

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

**61 tools** (25 core + 36 advanced) · **309 tests** (9 suites) · **7 bundled parsers**

---

## ☁️ Cloud Sync

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

## 🔄 Eternal Bi-Sync

The magic: `.faf` ↔ `CLAUDE.md` stay synchronized in milliseconds.

```
project.faf  ←──── 8ms ────→  CLAUDE.md
     │                            │
     └── Single source of truth ──┘
```

- Update either file → both stay aligned
- `--all` flag syncs to CLAUDE.md + AGENTS.md + .cursorrules + GEMINI.md
- Zero manual maintenance
- Works across teams, branches, sessions
- **Context never goes stale**

---

## Tier System: From Blind to Optimized

| Tier | Score | Status |
|------|-------|--------|
| 🏆 **Trophy** | 100% | **AI Optimized** — Gold Code |
| 🥇 **Gold** | 99%+ | Near-perfect context |
| 🥈 **Silver** | 95%+ | Excellent |
| 🥉 **Bronze** | 85%+ | Production ready |
| 🟢 **Green** | 70%+ | Solid foundation |
| 🟡 **Yellow** | 55%+ | AI flipping coins |
| 🔴 **Red** | <55% | AI working blind |
| 🤍 **White** | 0% | No context at all |

**At 55%, AI is guessing half the time.** At 100%, AI is optimized.

---

## 💬 use>faf | Prompt Pattern

**Start every prompt with "Use FAF"** to invoke MCP tools:

```
Use FAF to initialize my project
Use FAF to score my AI-readiness
Use FAF to sync my context
Use FAF to enhance my project
```

Works on all platforms — stops web search, forces tool usage.

---

## 🛠️ 25 Core MCP Tools

| Tool | Purpose |
|------|---------|
| `faf_init` | Initialize project.faf |
| `faf_score` | Check AI-readiness (0-100%) |
| `faf_sync` | Sync context across platforms |
| `faf_bi_sync` | Bi-directional .faf ↔ CLAUDE.md |
| `faf_enhance` | Intelligent enhancement |
| `faf_read` | Parse and validate FAF files |
| `faf_write` | Create/update FAF with validation |
| **🔄 Interop Tools** | |
| `faf_agents` | Import/export/sync AGENTS.md |
| `faf_cursor` | Import/export/sync .cursorrules |
| `faf_gemini` | Import/export/sync GEMINI.md |
| `faf_conductor` | Import/export directory structure |
| `faf_git` | Generate .faf from GitHub repo URL |
| **☁️ Cloud Tools** | |
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

## 🎯 The .FAF Position

```
  Platform      Context          Protocol
  ────────      ───────          ────────
  Cursor     →   .faf        →    MCP
  Windsurf   →   .faf        →    MCP
  Cline      →   .faf        →    MCP
  VS Code    →   .faf        →    MCP
  Claude     →   .faf        →    MCP
  Any IDE    →   .faf        →    MCP
```

**.FAF is the foundational layer.** Universal context format. IANA-registered. Works everywhere.

---

## 📦 Ecosystem

- **[claude-faf-mcp](https://npmjs.com/package/claude-faf-mcp)** — Claude Desktop (33 tools)
- **[faf-cli](https://npmjs.com/package/faf-cli)** — Terminal CLI (18k+ downloads)
- **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** — WASM SDK (<5ms scoring)
- **[faf.one](https://faf.one)** — Official website

---

## 📄 License

MIT License — Free and open source

---

**Zero drift. Eternal sync. AI optimized.** 🏆

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
