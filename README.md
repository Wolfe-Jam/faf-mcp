<!-- faf: faf-mcp | TypeScript | mcp-server | FAF MCP IDE Edition — persistent project context for Cursor, Windsurf, Cline, VS Code -->
<!-- faf: doc=readme | canonical=project.faf | score=100 | family=FAF -->

<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://www.faf.one/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">.FAF Context</h1>
    <p style="margin: 4px 0 0 0;"><strong>Persistent Project Context for Cursor, IDEs and VS Code. Define once. Sync everywhere.</strong> <sub>npm: <code>faf-mcp</code></sub></p>
  </div>
</div>

[![npm](https://img.shields.io/npm/v/faf-mcp?color=008B8B)](https://www.npmjs.com/package/faf-mcp)[![downloads](https://img.shields.io/npm/dm/faf-mcp?color=008B8B&label=downloads)](https://www.npmjs.com/package/faf-mcp)
[![FAF Trophy 100%](https://img.shields.io/badge/FAF-%F0%9F%8F%86%20100%25-000000?labelColor=FF6B35)](https://faf.one)
[![IANA: vnd.faf+yaml](https://img.shields.io/badge/IANA-vnd.faf%2Byaml-008B8B)](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml)
[![DOI: Context paper](https://img.shields.io/badge/DOI-Context%20paper-FF6B35)](https://doi.org/10.5281/zenodo.18251362)
[![DOI: Agents paper](https://img.shields.io/badge/DOI-Agents%20paper-FF6B35)](https://doi.org/10.5281/zenodo.21951641)

**Home:** [wolfe-jam.github.io/faf-mcp](https://wolfe-jam.github.io/faf-mcp/)

The MCP you didn't realise you needed, or wanted but didn't know who to ask, is here. Building on over 100k ecosystem downloads ([latest stats](https://faf.one/downloads)), we bring you faf-mcp to cure your syncing pain and fuel your chosen AI with optimized context, on-demand.

⭐ Bookmarks it for you, helps other devs find it too.

[![CI](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/faf-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![project.faf](https://img.shields.io/badge/project.faf-inside-008B8B)](https://github.com/Wolfe-Jam/faf)

---

## What's New in 3.0.0 — The Compose Edition

**Compose, don't port: faf-mcp 3.0 runs on faf-cli 7.12 in-process — one scorer, one set of renderers, one injector — and every number, file and claim this package makes is true. Local stdio, 29 tools, Node 22+.**

- **Composes faf-cli 7.12.** AGENTS.md, GEMINI.md, .cursorrules and CLAUDE.md are written by faf-cli's own renderers, repo enrichment and block injector — the same bytes `faf export` and `faf sync` write. `faf_auto` runs faf-cli's own update chain. The hand-ported renderers, the pre-v3 CLAUDE.md template and the local injector are gone.
- **One score function.** `faf_auto`, `faf_go`, `faf_dna`, `faf_doctor` and `faf_bi_sync` all report faf-cli's scorer on the bytes on disk — no local heuristics, no frozen birth score, no "0%".
- **Nothing shells out.** The `which faf` detector, the exec fallback and the "install faf-cli first" banner are gone; nothing under `src/` imports `child_process`. A machine with an unrelated `faf` on PATH is no longer a problem.
- **Every tool contract matches its handler.** Descriptions say what the tools do, schemas declare only flags that are read, failures carry their reason.
- **The Mk3 engine is deleted.** 44 unreachable modules, ~15,900 lines; the tarball halves. `prebuild` clears `dist/` so nothing deleted ever ships again.
- **Resource URIs** are `faf://context` and `faf://status`; `claude-faf://` remains readable as an alias for this release.
- **Node 22 or newer.** 18 and 20 are end of life; the CI matrix runs 22 and 24 and a guard keeps the floor honest.

---

## Define once. Sync everywhere.

You maintain `.cursorrules`. Your teammate uses `AGENTS.md`. Someone on the team just switched to Gemini. Every AI tool wants its own context file — and they all say the same thing in different formats.

**faf-mcp is the dedicated MCP server for Cursor, Windsurf, Cline, VS Code, and every non-Claude platform.** One `.faf` file in your repo, synced to every format your team needs.

**Context for Cursor & IDE agents:** faf-cli (v7.12) authors the files this server syncs — `bunx faf export --agents`, zero-install and git-native. See [FAF-CLI for Cursor & IDE agents 👀](https://github.com/Wolfe-Jam/faf-cli/blob/main/docs/faf-cli-for-agents.md).

```
                      project.faf
                           │
          ┌────────┬───────┴───────┬────────────┐
          ▼        ▼               ▼            ▼
      CLAUDE.md  AGENTS.md  .cursorrules  GEMINI.md
      (Claude)   (Codex)      (Cursor)    (Gemini)
```

### Quick Start

**Cursor — one click:** [![Add .FAF Context to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=faf-mcp&config=eyJjb21tYW5kIjoiYnVueCIsImFyZ3MiOlsiZmFmLW1jcCJdfQ==)

**Everywhere else:**

```bash
bunx faf-mcp
```

Add to your MCP config:

```json
{"mcpServers": {"faf": {"command": "bunx", "args": ["faf-mcp"]}}}
```

| Platform | Config File |
|----------|-------------|
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **Cline** | Cline MCP settings |
| **VS Code** | MCP extension config |
| **Claude Desktop** | Use [claude-faf-mcp](https://github.com/Wolfe-Jam/claude-faf-mcp) |

---

## Run It

faf-mcp runs locally over stdio. Point your IDE at one of these commands.

| Method | Command |
|--------|---------|
| **npm** | `npx faf-mcp` |
| **Bun** | `bunx faf-mcp` |

---

## Interop Tools

| Tool | Platform | Action |
|------|----------|--------|
| `faf_agents` | OpenAI Codex | Import/export/sync AGENTS.md |
| `faf_cursor` | Cursor IDE | Import/export/sync .cursorrules |
| `faf_gemini` | Google Gemini | Import/export/sync GEMINI.md |
| `faf_conductor` | Conductor | Import/export directory structure |
| `faf_git` | GitHub | Author .faf from any repo URL |

```bash
# Sync to all formats at once
faf bi-sync --all

# Author .faf from any GitHub repo
faf_git { url: "https://github.com/facebook/react" }
```

**Core tier:** 15 essential tools shown by default; set `FAF_TOOLS=all` for the full **29** (every tool stays callable by name either way) · **9 test suites** · **7 bundled parsers**

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

## 29 MCP Tools

| Tool | Purpose |
|------|---------|
| `faf_init` | Initialize project.faf |
| `faf_score` | Check AI-readiness (0-100%) |
| `faf_sync` | Reconcile project.faf with package.json / git (dry-run; `apply:true` writes) |
| `faf_bi_sync` | Write CLAUDE.md (+ AGENTS.md, .cursorrules, GEMINI.md) from project.faf |
| `faf_read` | Parse and validate FAF files |
| `faf_write` | Create/update FAF with validation |
| **Interop Tools** | |
| `faf_agents` | Import/export/sync AGENTS.md |
| `faf_cursor` | Import/export/sync .cursorrules |
| `faf_gemini` | Import/export/sync GEMINI.md |
| `faf_conductor` | Import/export directory structure |
| `faf_git` | Author .faf from GitHub repo URL |

**Built on faf-cli.** Every tool composes the bundled [faf-cli](https://www.npmjs.com/package/faf-cli) in-process — the same scorer, the same renderers, the same block injector the CLI uses. Nothing shells out to a `faf` on your PATH.

---

## Ecosystem

- **[claude-faf-mcp](https://npmjs.com/package/claude-faf-mcp)** — Claude Desktop
- **[faf-cli](https://npmjs.com/package/faf-cli)** — Terminal CLI
- **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** — WASM SDK (<5ms scoring)
- **[faf-wasm-gen](https://www.npmjs.com/package/faf-wasm-gen)** — Rust→WASM `project.faf` authoring engine, browser/edge (faf-wasm's authoring sibling)
- **[faf-trinity](https://github.com/Wolfe-Jam/faf-trinity)** — reference MCP server exposing all three IANA FAF formats (context/memory/agent) together
- **[faf.one](https://faf.one)** — Official website
- **[docs/SKILLS-OVER-MCP.md](./docs/SKILLS-OVER-MCP.md)** — J1 Agent Skill `faf-ide` (stdio · skills/list · digests)

---

If `faf-mcp` has been useful, consider starring the repo — it helps others find it.

## Citation

If you use `faf-mcp` or the `.faf` / `.fafa` formats in research or production, please cite the format papers:

> Wolfe, J. (2025). *Format-Driven AI Context Architecture: The .faf Standard for Persistent Project Understanding*. Zenodo. https://doi.org/10.5281/zenodo.18251362

> Wolfe, J. (2026). *Why Agents Need a Passport: .fafa — Portable Identity for the Agentic Era*. Zenodo. https://doi.org/10.5281/zenodo.21951641

### BibTeX

```bibtex
@article{wolfe2025faf,
  title     = {Format-Driven AI Context Architecture: The .faf Standard for Persistent Project Understanding},
  author    = {Wolfe, James},
  year      = {2025},
  month     = {nov},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.18251362},
  url       = {https://doi.org/10.5281/zenodo.18251362}
}

@article{wolfe2026fafa,
  title     = {Why Agents Need a Passport: .fafa — Portable Identity for the Agentic Era},
  author    = {Wolfe, James},
  year      = {2026},
  month     = {aug},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.21951641},
  url       = {https://doi.org/10.5281/zenodo.21951641}
}
```

## License

MIT License — Free and open source

---

**Zero drift. Eternal sync. AI optimized.** 🏆

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
