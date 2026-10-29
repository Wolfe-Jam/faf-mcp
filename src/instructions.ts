/**
 * InitializeResult.instructions: how the tools fit together, for the model.
 * Relationships and rules only; each tool's own description covers what it does.
 * The last line keeps the J1 skills pointer (2026-08-10) to the bundled skill.
 * Keep it under 1,000 characters: tests/server-instructions.test.ts checks the
 * length and that every tool named here is on the default tool list.
 */
import { FAF_IDE_SKILL_URI } from './handlers/skills';

export const SERVER_INSTRUCTIONS = [
  'Works on one project at a time: faf_context sets or shows it; tools without a path use it.',
  'For questions about the project (stack, goal, commands), read project.faf first and answer from it. faf_score shows what is missing; faf_doctor says why.',
  "No project.faf yet: faf_auto creates it; faf_git drafts one from a public GitHub repo. Human fields come from the user through faf_go or faf_check: ask, don't invent answers.",
  "project.faf is the source: faf_claude, faf_agents, faf_cursor and faf_gemini write CLAUDE.md, AGENTS.md, .cursorrules and GEMINI.md from it (or import them). faf_sync refreshes project.faf from the repo's manifests.",
  `Skill guide: ${FAF_IDE_SKILL_URI}, through skills/get or resources/read.`,
].join('\n');
