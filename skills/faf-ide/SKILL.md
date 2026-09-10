---
name: faf-ide
description: Use FAF context and IDE interop tools on this server — score, sync, platform formats; claim equals wire.
---

# faf-ide

Product playbook for **faf-mcp** (`one.faf/faf-mcp`) — IANA `.faf` project context over MCP for Cursor, VS Code, Windsurf, Cline-class hosts.

**Transport:** local stdio (`npx` / `bunx faf-mcp`). Skills guide; tools act.

## Tools (call these)

| Tool | When |
|------|------|
| `faf_auto` | Zero → context in one shot (init or merge, detect, CLAUDE.md, score) |
| `faf_init` | Create a new `project.faf` (use `faf_auto` to enhance an existing one) |
| `faf_score` | AI-readiness 0–100% + gaps |
| `faf_context` | Set or show the active project path |
| `faf_sync` | Reconcile `project.faf` with package.json (dry-run; `apply:true` writes) |
| `faf_claude` | Write CLAUDE.md + IDE format files from `project.faf` |
| `faf_cursor` | Cursor / `.cursorrules` interop |
| `faf_agents` | `AGENTS.md` interop |
| `faf_gemini` | Gemini context interop |
| `faf_about` | What `.faf` is (format overview) |

Default `tools/list` is a curated Core set; more tools may exist when `FAF_TOOLS=all`. Only call tools this server lists.

## Rules

1. Prefer **structured `.faf`** over free-form chat memory for project facts.
2. **Claim equals wire** — only tools advertised by this server.
3. **No secrets** in skill text or tool args you do not own.
4. **Origin** — served by faf-mcp (`skills/*` + `resources/read`); not a remote install authority.

## Flow

```text
initialize → skills/list → resources/read(skill://faf-ide/SKILL.md) → tools/call
```
