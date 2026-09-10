<!-- faf:start -->
<!-- faf: faf-mcp | TypeScript | mcp | The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". -->
<!-- faf: claim=project.faf | family=FAF -->

# AGENTS.md — faf-mcp

The Interop MCP for Context — the Cursor / IDE Edition. Persistent context for Cursor, VS Code, and every MCP-compatible IDE. IANA-registered application/vnd.faf+yaml. Start with "Use FAF". — TypeScript · type: mcp · v3.0.2

> Authored by faf — do not edit the managed block; refresh with `faf export --agents`. Hand-written content outside the managed block is preserved.

## Setup & build

```bash
npm run build    # build
npm run dev    # dev
```

## Run the tests

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

## Conventions

- TypeScript strict mode (tsconfig.json)
- Style enforced by ESLint — obey the configs

## Guardrails

- **Always OK:** read the tree · run the tests (`npm run test`) · build the project · `npm run lint`.
- **Ask first:** dependency installs, deletions, migrations, schema changes, publish/release.
- **Never:** force-push · push straight to `main` (branch and open a PR) · commit secrets.

## Definition of Done

Done when: `npm run lint` exits 0 · `npm run test` passes · changes committed with a conventional message.

## When stuck

Ask a clarifying question, propose a short plan, or open a draft PR with notes — do not push large speculative changes to `main`.

## Security & secrets

- Secrets live in `.env.local`. Never read or commit them.

## Commit & PR

- Conventional Commits preferred (`feat:`, `fix:`, `chore:`, …).
- Branch off `main` and open a PR — never commit to `main` directly.
- If build/test scripts or layout change, refresh this file in the **same PR** (`faf export --agents`).

## Stack

- **Backend:** MCP SDK (TS)
- **API:** MCP (stdio)
- **Runtime:** Node.js >=22
- **Hosting:** npm
- **Build:** TypeScript (tsc)
- **CI/CD:** GitHub Actions
- **Package Manager:** npm
<!-- faf:end -->

## Working in this repo (hand-maintained)

Outside the managed block on purpose: `faf export --agents` refreshes the block above and keeps this section.

### Verify before you push

- `npm run type-check` · `npm run lint` · `npm test` (bun, WJTTC suites in `tests/`) · `npm run check:engines`
- `npm run build` runs `prebuild` first, which cleans `dist/` — tsc never removes stale output on its own.
- Run the server locally over stdio with `npm run dev:stdio`.

### Layout beyond the entry points

- `src/server.ts` — server wiring · `src/handlers/tools.ts` — the MCP tool surface (29 tools, 15 shown by default) · `src/handlers/resources.ts`, `skills.ts` — resources and skills
- `src/faf-core/` — parsers, extract, fix-once, engines, and the `commands/` that compose faf-cli · scoring is `scoreFafYaml` from faf-cli via `src/utils/faf-cli-bridge.ts`
- `tests/` — WJTTC suites: compose parity with faf-cli, interop freshness, line-anchored injection, security and path confinement, MCP conformance
- `scripts/sync-version.js` — runs on `npm version`; reads package.json and stamps project.faf, server.json, CHANGELOG.md, docs/index.html and AGENTS.md

### Load-bearing conventions

- **Compose, don't port.** Renderers, the injector and `updateExistingFaf` are imported from `faf-cli` (pinned floor in package.json). Never copy faf-cli code into `src/`.
- **`project.faf` is the source of truth.** AGENTS.md, CLAUDE.md, GEMINI.md, `.cursorrules` and `.github/copilot-instructions.md` are rendered from it. Refresh them; do not hand-edit the managed blocks.
- **Node 22 is the floor** and equals CI's lowest Node. `check:engines` fails the build if `engines.node` drifts.
- **The tool count is a gate.** 29 tools, 15 default. Changing either means updating the gate and every surface that states the number.
- **A release is one motion:** version bump → gates → npm publish → tag → GitHub Release → MCP Registry via CI (DNS login as faf.one). Never push a tag without publishing right after it.
