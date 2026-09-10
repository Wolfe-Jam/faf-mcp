<!-- faf:start -->
<!-- faf: faf-mcp | TypeScript | mcp | The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". -->
<!-- faf: claim=project.faf | family=FAF -->

# GEMINI.md — faf-mcp

> Authored from project.faf — refresh with `faf export --gemini`.

Project: faf-mcp
Goal: The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF".
Language: TypeScript

## Setup & build

```bash
npm run build    # build
npm run dev    # dev
```

## Test & verify

```bash
npm run test
npm run lint
```

## Where things live

- `package.json`
- `src/index.ts`
- `src/cli.ts`
- `README.md`
- `tsconfig.json`
- `vercel.json`

## Stack
- Backend: MCP SDK (TS)
- API: MCP (stdio)
- Runtime: Node.js >=22
- Hosting: npm
- Build: TypeScript (tsc)
- CI/CD: GitHub Actions
- Package Manager: npm

## Before changing things

- Ask first: dependency installs, deletions, migrations, schema changes, publish/release.
- Never: force-push · push straight to `main` · commit secrets.
<!-- faf:end -->
