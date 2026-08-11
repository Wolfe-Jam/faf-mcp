# Skills over MCP (J1 · product · stdio)

**faf-mcp** (`one.faf/faf-mcp`) serves one Agent Skill on the same process as IDE context tools:

```text
initialize → skills/list → resources/read(SKILL.md) → tools/call
```

Same J1 wire contract as mcp-better / rust-faf-mcp. This skill is the **product** IDE playbook (`faf-ide`), not a lab skill.

**Scope:** local **stdio** (`npx` / `bunx faf-mcp`). Hosted HTTP endpoints are out of scope for this surface.

## Advertise

TypeScript MCP SDK (`@modelcontextprotocol/sdk`) types skills under **`capabilities.experimental`** (not `extensions`). On initialize:

```json
"capabilities": {
  "experimental": {
    "io.modelcontextprotocol/skills": {}
  },
  "resources": { "listChanged": true },
  "tools": { "listChanged": true }
}
```

## Methods

| Method | How |
|--------|-----|
| `skills/list` | Custom request via `setRequestHandler` |
| `skills/get` | Custom · `{ "uri": "skill://faf-ide/SKILL.md" }` |
| `resources/list` | Existing URIs + skill URI |
| `resources/read` | SKILL.md text · digest `sha256:<hex>` must match list |

## Skill

```text
skills/faf-ide/SKILL.md
```

- URI: `skill://faf-ide/SKILL.md`
- Guides core tools: `faf_auto`, `faf_init`, `faf_score`, `faf_context`, `faf_sync`, `faf_bi_sync`, `faf_cursor`, `faf_agents`, `faf_gemini`, `faf_about`
- Shipped in the npm package (`package.json` `files` includes `skills/**`)

## Tools

Unchanged. Skills guide; tools act.

## Identity

Registry / product identity stays **`one.faf/faf-mcp`**.
