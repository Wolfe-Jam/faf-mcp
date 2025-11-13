<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://raw.githubusercontent.com/Wolfe-Jam/faf/main/assets/logos/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">faf-mcp</h1>
    <p style="margin: 4px 0 0 0;"><strong>IANA-Registered Format for AI Context</strong> · <code>application/vnd.faf+yaml</code></p>
  </div>
</div>

> Universal MCP server for .FAF (Foundational AI-context Format) with 50 tools - Persistent project context for Claude Desktop, Cursor, Windsurf, and all MCP-compatible platforms

---

## 📦 Main Package

**[→ faf-mcp package documentation](./packages/faf-mcp#readme)**

Full README with installation, features, and usage examples.

---

## 🔗 Quick Links

- 🌐 **Website:** [faf.one](https://faf.one)
- 💬 **Discord:** [Join Community](https://discord.com/invite/3pjzpKsP)
- 📦 **npm:** [faf-mcp](https://www.npmjs.com/package/faf-mcp)
- 🏪 **Chrome Extension:** [FAF Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)
- 📚 **About this repo:** [ABOUT.md](./ABOUT.md)

---

## ⚡ Quick Install

```bash
npm install -g faf-mcp
```

Then add to your MCP config:

```json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["-y", "faf-mcp"]
    }
  }
}
```

Start prompting: **"Use FAF to initialize your project"**

---

**Built with F1-inspired engineering principles** 🏎️⚡

**"It's so logical if it didn't exist, AI would have built it itself"** — Claude
