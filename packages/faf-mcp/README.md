<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://raw.githubusercontent.com/Wolfe-Jam/faf/main/assets/logos/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">faf-mcp | use>faf</h1>
    <p style="margin: 4px 0 0 0;"><strong>IANA-Registered Format for AI Context</strong> · <code>application/vnd.faf+yaml</code></p>
  </div>
</div>

> Universal MCP server for .FAF (Foundational AI-context Format) with 50 tools - Persistent project context for Cursor, Windsurf, Cline, VS Code, and all MCP-compatible platforms (including [Claude Desktop](https://github.com/Wolfe-Jam/claude-faf-mcp))

**Universal version of [claude-faf-mcp](https://github.com/Wolfe-Jam/claude-faf-mcp)** — Anthropic-approved MCP server, now compatible with all platforms. Built on the IANA-registered .FAF format (`application/vnd.faf+yaml`).

[![NPM Downloads](https://img.shields.io/npm/dt/faf-mcp?label=total%20downloads&color=00CCFF)](https://www.npmjs.com/package/faf-mcp)
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.com/invite/3pjzpKsP)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)
[![Website](https://img.shields.io/badge/Website-faf.one-orange)](https://faf.one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start

**1. Install:**

```bash
npm install -g faf-mcp
```

**2. Copy and paste this to your AI:**

```
Install the FAF MCP server: npm install -g faf-mcp, then add this to my MCP config: {"mcpServers": {"faf": {"command": "npx", "args": ["-y", "faf-mcp"]}}} and restart.
```

### Platform-Specific Setup

**Cursor IDE:** Add to `~/.cursor/mcp.json` ([setup guide](https://docs.cursor.com/context/model-context-protocol))

**Windsurf Editor:** Add to `~/.codeium/windsurf/mcp_config.json` ([Cascade docs](https://docs.windsurf.com/windsurf/cascade/mcp))

**Cline:** Add to Cline's MCP settings

**VS Code:** Install MCP extension, then add server config

**Claude Desktop:** Use the [dedicated claude-faf-mcp package](https://github.com/Wolfe-Jam/claude-faf-mcp) for optimized Claude integration

---

## 🏁 AI-Readiness Scorecard

> **"README for the AI era"** — Google Gemini

<div align="center">
  <img src="https://raw.githubusercontent.com/Wolfe-Jam/faf-mcp/main/packages/faf-mcp/assets/Project-faf-pckg-json-README.png" alt="project.faf file positioning" width="600" />
  <p><em><strong>project.faf is to AI context what package.json is to dependencies</strong></em></p>
  <p><em>Lives at the project root, between package.json and README.md</em></p>
</div>

**The closer you get to 100% the better AI can assist you.**

At 55% you are building your project with half a blueprint and basically flipping a coin with AI. .FAF defines, and AI becomes optimized for Context with the project.faf file.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏎️  FAF AI-READINESS SCORE: 100/100 — PODIUM EDITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CORE INTELLIGENCE                    🎯 CONTEXT DELIVERY
├─ Project DNA            [██████] 100%  ├─ MCP Protocol      [██████] 100%
├─ Architecture Map       [██████] 100%  ├─ 50 Native Tools   [██████] 100%
├─ Domain Model          [██████] 100%  ├─ IANA Format       [██████] 100%
└─ Version Tracking      [██████] 100%  └─ Universal Context [██████] 100%

🚀 PERFORMANCE                          ⚡ STANDALONE OPERATION
├─ 16.2x CLI Speedup     [██████] 100%  ├─ Zero Dependencies [██████] 100%
├─ 19ms Avg Execution    [██████] 100%  ├─ Bundled Engine    [██████] 100%
├─ 50/50 Tools Active    [██████] 100%  ├─ Direct Function   [██████] 100%
└─ Zero Memory Leaks     [██████] 100%  └─ 14 Bundled Cmds   [██████] 100%

🏆 project.faf score: podium
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 Want a Platform-Specific Package?

We're launching `faf-mcp` as the universal package. If you'd prefer a dedicated package for your platform (like `cursor-faf-mcp` or `windsurf-faf-mcp` with tailored setup instructions), **[request it here](https://github.com/Wolfe-Jam/faf-mcp/issues)**.

We'll publish platform-specific packages based on demand.

---

## 💬 use>faf | Prompt Pattern

**Start every prompt with "Use FAF"** to invoke MCP tools directly:

### All Platforms
```
Use FAF to initialize my project
Use FAF to sync my project.faf to all platforms
Use FAF to score my AI-readiness
Use FAF to enhance my project context
Use FAF to create platform sync files
```

### Why "Use FAF" Works Everywhere

**Claude Desktop:**
- ✅ Calls MCP tool instead of searching web
- ✅ No void container issues
- ✅ Direct tool invocation

**Claude.ai (Web):**
- ✅ Stops web search addiction immediately
- ✅ Forces MCP tool usage
- ✅ No more guessing

**Cursor / Windsurf / Cline:**
- ✅ MCP standard compliance
- ✅ Tool invocation (not manual file creation)
- ✅ Consistent behavior

### The Pattern

**Without "Use FAF":**
- ❌ AI searches the web
- ❌ AI creates files manually
- ❌ Void containers
- ❌ Inconsistent results

**With "Use FAF":**
- ✅ MCP tool called correctly
- ✅ Championship output
- ✅ Every time

---

## 🎯 What is FAF?

**The .FAF Position in the MCP Ecosystem:**

```
  Platform      Context          Protocol
  ────────      ───────          ────────
  Any IDE   →   IANA Format →    Open Protocol
  Cursor    →   .faf        →    MCP
  Windsurf  →   .faf        →    MCP
  Cline     →   .faf        →    MCP
  VS Code   →   .faf        →    MCP
  Claude    →   .faf        →    MCP
  Gemini    →   .faf        →    MCP
```

**.FAF is the foundational, universal base layer** for any platform using the Model Context Protocol. It provides the standardized Context that makes MCP work for everyone.

---

## 🛠️ Core Features

### 50 MCP Tools (100% Standalone)
- **faf_quick** - Lightning-fast project.faf creation (3ms avg)
- **faf_enhance** - Intelligent enhancement with auto-detection
- **faf_read** - Parse and validate FAF files
- **faf_write** - Create/update FAF with validation
- **faf_score** - AI-readiness scoring engine
- **faf_compress** - Intelligent size optimization
- **14 bundled commands** - Zero CLI dependencies, 16.2x faster

### IANA-Registered Standard
- Official MIME type: `application/vnd.faf+yaml`
- W3C-compliant structured format
- Universal AI context protocol
- Cross-platform compatibility

### Championship Performance
- **16.2x faster** than CLI versions (direct function calls vs process spawning)
- **19ms average** execution across all bundled commands
- **Fastest: 1ms** (formats command)
- **Zero memory leaks** with F1-grade engineering

---

## 📚 Documentation

- **[Full Documentation](https://wolfe-jam.github.io/claude-faf-mcp/)** - Complete guide
- **[Getting Started](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/getting-started.md)** - Installation & setup
- **[MCP Tools Reference](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/mcp-tools.md)** - All 50 tools
- **[FAQ](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/FAQ.md)** - Common questions
- **[CHANGELOG](./CHANGELOG.md)** - Version history

---

## 🏆 Why FAF?

### Championship Credentials

**🏅 Creators of the Format** - We designed .FAF (IANA-registered `application/vnd.faf+yaml`)
**🏅 First & Only** - Persistent Project Context MCP Server approved by Anthropic
**🏅 Creators of Context-Mirroring** - faf_bi_sync creates native files for all platforms
**🏅 Google Chrome-Approved** - Published Chrome Extension
**🏅 12K+ npm Downloads** - Proven adoption across the ecosystem

> "README for the AI era" — Google Gemini

### The FAF Advantage

**Persistent Context** - Your project's DNA lives in `project.faf`, readable by any AI or human

**Universal Format** - IANA-registered standard works across Claude, Gemini, Cursor, Windsurf, any MCP platform

**Zero Setup Tax** - One file (`project.faf`) eliminates AI context setup across your entire team

**FREE FOREVER** - MIT License, open source, no subscription

**All Boats Rise Together** - Improving projects, AI performance, code quality, speed to market for everyone

**Championship Engineering** - F1-inspired performance with strict TypeScript, zero runtime errors

---

## 📦 Ecosystem

- **[FAF Format Spec](https://github.com/Wolfe-Jam/faf)** - Official IANA specification
- **[FAF CLI](https://github.com/Wolfe-Jam/faf-cli)** - Command-line tooling
- **[claude-faf-mcp](https://github.com/Wolfe-Jam/claude-faf-mcp)** - Claude Desktop-specific package
- **[Chrome Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)** - Browser integration
- **[faf.one](https://faf.one)** - Official website and documentation
- **[Discord Community](https://discord.com/invite/3pjzpKsP)** - Join the discussion

---

## 📄 License

MIT License - Free and open source

---

**Built with F1-inspired engineering principles** 🏎️⚡

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
