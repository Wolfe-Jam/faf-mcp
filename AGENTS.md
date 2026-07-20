<!-- agents:from-facts:start -->
<!-- authored by agents-md-facts — from your repo's facts, never guessed · re-run to refresh -->

# AGENTS.md — faf-mcp

TypeScript · CLI · Bun · npm package manager · v2.3.1

## Setup & build

```bash
npm install    # install dependencies
npm run build    # build
npm run dev    # dev
npm run start    # start
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
- `tests/`
- `README.md`
- `CHANGELOG.md`
- `tsconfig.json`
- `vercel.json`

## Conventions

- TypeScript strict mode (tsconfig.json)
- Style enforced by ESLint — obey the configs

## Guardrails

- **Always OK:** read files, run the tests (`npm run test`), build the project.
- **Ask first:** dependency installs, deletions, migrations / schema changes.
- **Never:** force-push, push to `main`, commit secrets, commit `.env.local`.

## Definition of Done

Done when: `npm run lint` exits 0 · `npm run test` passes · committed with a clear message.

## Security & secrets

- Secrets live in `.env.local`. Never read or commit them.

## Commit & PR

- Write a clear, descriptive commit message.
- Branch off `main`; never commit to `main` directly — open a PR for review.
- If build/test scripts or layout change, refresh this file in the **same PR** (`npx agents-md-facts`).
<!-- agents:from-facts:end -->
