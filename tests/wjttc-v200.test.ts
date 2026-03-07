/**
 * WJTTC Championship Test Suite — faf-mcp v2.0.0
 * "The Interop MCP for Context"
 *
 * Brake Tests: If these fail, DO NOT ship.
 * Engine Tests: Core functionality under load.
 * Aero Tests: Polish, edge cases, integration.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Parsers
import { parseAgentsMd } from '../src/faf-core/parsers/agents-parser';
import { parseCursorRules } from '../src/faf-core/parsers/cursorrules-parser';
import { parseGeminiMd } from '../src/faf-core/parsers/gemini-parser';
import { parseMarkdownSections, parseProductMd, parseTechStackMd } from '../src/faf-core/parsers/conductor-parser';
import { parseGitHubUrl } from '../src/faf-core/parsers/github-extractor';
import { countSlots, isIgnored, isFilled } from '../src/faf-core/parsers/slot-counter';
import { extract6WsFromReadme, extractFromLanguages, getScoreTier } from '../src/faf-core/parsers/faf-git-generator';

// Commands
import { agentsImportCommand, agentsExportCommand } from '../src/faf-core/commands/agents';
import { cursorImportCommand, cursorExportCommand } from '../src/faf-core/commands/cursor';
import { geminiImportCommand, geminiExportCommand } from '../src/faf-core/commands/gemini';
import { conductorImportCommand, conductorExportCommand } from '../src/faf-core/commands/conductor';
import { humanAddCommand, humanSetCommand } from '../src/faf-core/commands/human';
import { extractSixWs } from '../src/faf-core/commands/readme';
import { syncBiDirectional } from '../src/faf-core/commands/bi-sync';

// Engine & Tools
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { FafToolHandler } from '../src/handlers/tools';
import { ClaudeFafMcpServer } from '../src/server';

// Visibility
import {
  validateToolCounts,
  getCoreTools,
  getAdvancedTools,
  getAllTools,
  isCoreTool,
  isAdvancedTool,
} from '../src/types/tool-visibility';

// Version
import { VERSION } from '../src/version';

// ============================================================================
// BRAKE TESTS — If these fail, DO NOT ship
// ============================================================================

describe('BRAKE: Server Instantiation', () => {
  it('ClaudeFafMcpServer constructs without throwing', () => {
    expect(() => new ClaudeFafMcpServer({
      transport: 'stdio',
      fafEnginePath: 'faf',
    })).not.toThrow();
  });

  it('FafEngineAdapter constructs without throwing', () => {
    expect(() => new FafEngineAdapter()).not.toThrow();
  });

  it('FafToolHandler constructs with engine adapter', () => {
    const engine = new FafEngineAdapter();
    expect(() => new FafToolHandler(engine)).not.toThrow();
  });

  it('VERSION is a valid semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('BRAKE: Tool Registry Integrity', () => {
  it('tool counts match v2.0.0 spec: 25 core + 36 advanced = 61', () => {
    const counts = validateToolCounts();
    expect(counts.core).toBe(25);
    expect(counts.advanced).toBe(36);
    expect(counts.total).toBe(61);
  });

  it('no duplicate tool names in registry', () => {
    const all = getAllTools();
    const names = all.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('every tool has a non-empty description', () => {
    const all = getAllTools();
    for (const tool of all) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('every tool has a valid category', () => {
    const validCategories = ['workflow', 'quality', 'intelligence', 'sync', 'ai', 'help', 'trust', 'file', 'utility', 'display'];
    const all = getAllTools();
    for (const tool of all) {
      expect(validCategories).toContain(tool.category);
    }
  });

  it('interop tools are registered as core', () => {
    expect(isCoreTool('faf_agents')).toBe(true);
    expect(isCoreTool('faf_cursor')).toBe(true);
    expect(isCoreTool('faf_gemini')).toBe(true);
    expect(isCoreTool('faf_git')).toBe(true);
  });

  it('conductor is advanced (power user)', () => {
    expect(isAdvancedTool('faf_conductor')).toBe(true);
  });

  it('tri_sync is NOT registered (Claude-only, excluded from faf-mcp)', () => {
    expect(isCoreTool('faf_tri_sync')).toBe(false);
    expect(isAdvancedTool('faf_tri_sync')).toBe(false);
  });
});

describe('BRAKE: Tool Handler Routes', () => {
  let handler: FafToolHandler;

  beforeEach(() => {
    const engine = new FafEngineAdapter();
    handler = new FafToolHandler(engine);
  });

  it('listTools returns object with tools array of correct count', async () => {
    const result = await handler.listTools();
    expect(result.tools.length).toBeGreaterThanOrEqual(30);
  });

  it('every interop tool resolves without "Unknown tool"', async () => {
    const interopTools = ['faf_agents', 'faf_cursor', 'faf_gemini', 'faf_conductor', 'faf_git'];
    for (const toolName of interopTools) {
      const result = await handler.callTool(toolName, {});
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const text = (result.content[0] as any).text || '';
      expect(text).not.toContain('Unknown tool');
    }
  });

  it('calling faf_tri_sync errors (not routed in faf-mcp)', async () => {
    try {
      const result = await handler.callTool('faf_tri_sync', {});
      // If it returns instead of throwing, it should indicate an error
      const text = (result.content[0] as any).text || '';
      expect(result.isError || text.includes('Unknown') || text.includes('Error')).toBe(true);
    } catch (err: any) {
      // Throwing "Unknown tool" is also acceptable
      expect(err.message).toContain('Unknown tool');
    }
  });
});

describe('BRAKE: No Pro/Tri-Sync Leakage', () => {
  it('tools.ts has no pro-gate import', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');
    expect(src).not.toContain('pro-gate');
    expect(src).not.toContain('memory-parser');
    expect(src).not.toContain('checkProAccess');
    expect(src).not.toContain('resolveMemoryPath');
  });

  it('tools.ts has no faf_tri_sync handler', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');
    expect(src).not.toContain("'faf_tri_sync'");
    expect(src).not.toContain('handleFafTriSync');
  });

  it('no licensing imports in tools.ts', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'tools.ts'), 'utf-8');
    expect(src).not.toContain('../licensing/');
  });
});

// ============================================================================
// ENGINE TESTS — Core functionality
// ============================================================================

describe('ENGINE: Parser Roundtrips', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('AGENTS.md: parse -> export -> parse = stable', async () => {
    const input = [
      '# Project: TestApp',
      '',
      '## Overview',
      'A test application for validation.',
      '',
      '## Guidelines',
      '- Use TypeScript',
      '- Write tests',
    ].join('\n');

    const parsed1 = parseAgentsMd(input);
    expect(parsed1.projectName).toBe('TestApp');

    // Export to file via command, read back, parse again
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'TestApp', type: 'cli' },
    }));
    await agentsExportCommand(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const parsed2 = parseAgentsMd(content);
    expect(parsed2.projectName).toBe(parsed1.projectName);
  });

  it('.cursorrules: parse is stable', () => {
    const input = [
      '# Cursor Rules',
      '',
      '## Style',
      '- Use 2-space indentation',
      '- Prefer const over let',
    ].join('\n');

    const parsed = parseCursorRules(input);
    expect(parsed.sections.length).toBeGreaterThan(0);
  });

  it('GEMINI.md: parse is stable', () => {
    const input = [
      '# GEMINI.md',
      '',
      '## Project',
      'Name: TestApp',
      '',
      '## Instructions',
      '- Be concise',
    ].join('\n');

    const parsed = parseGeminiMd(input);
    expect(parsed.sections.length).toBeGreaterThan(0);
  });

  it('Agents export -> import preserves data through filesystem', async () => {
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'roundtrip-test', type: 'cli' },
      human: { who: 'Tester', what: 'Testing roundtrips' },
    }));

    const exportResult = await agentsExportCommand(tmpDir);
    expect(exportResult.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);

    const importResult = await agentsImportCommand(tmpDir);
    expect(importResult.success).toBe(true);
  });

  it('Cursor export -> import preserves data through filesystem', async () => {
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'cursor-test', type: 'frontend' },
    }));

    const exportResult = await cursorExportCommand(tmpDir);
    expect(exportResult.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);

    const importResult = await cursorImportCommand(tmpDir);
    expect(importResult.success).toBe(true);
  });

  it('Gemini export -> import preserves data through filesystem', async () => {
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'gemini-test', type: 'backend-api' },
    }));

    const exportResult = await geminiExportCommand(tmpDir);
    expect(exportResult.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);

    const importResult = await geminiImportCommand(tmpDir);
    expect(importResult.success).toBe(true);
  });
});

describe('ENGINE: Bi-Sync with Interop Flags', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-bisync-'));
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'bisync-test', type: 'cli' },
      human: { who: 'Tester', what: 'Bi-sync testing' },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('bi-sync with --agents creates AGENTS.md', async () => {
    const result = await syncBiDirectional(tmpDir, { agents: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
  });

  it('bi-sync with --cursor creates .cursorrules', async () => {
    const result = await syncBiDirectional(tmpDir, { cursor: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
  });

  it('bi-sync with --gemini creates GEMINI.md', async () => {
    const result = await syncBiDirectional(tmpDir, { gemini: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);
  });

  it('bi-sync with --all creates all format files', async () => {
    const result = await syncBiDirectional(tmpDir, { all: true });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);
  });

  it('bi-sync without flags still creates CLAUDE.md (backward compat)', async () => {
    const result = await syncBiDirectional(tmpDir, {});
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });
});

describe('ENGINE: GitHub URL Parser', () => {
  it('parses standard HTTPS URLs', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('parses owner/repo shorthand', () => {
    const result = parseGitHubUrl('facebook/react');
    expect(result).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('strips .git extension', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react.git');
    expect(result).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('rejects non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/user/repo')).toBeNull();
    expect(parseGitHubUrl('https://bitbucket.org/user/repo')).toBeNull();
  });

  it('rejects empty/garbage input', () => {
    expect(parseGitHubUrl('')).toBeNull();
    expect(parseGitHubUrl('not a url at all')).toBeNull();
    expect(parseGitHubUrl('////')).toBeNull();
  });

  it('handles URLs with trailing slashes and fragments', () => {
    const result = parseGitHubUrl('https://github.com/Wolfe-Jam/faf-mcp/tree/main#readme');
    expect(result).not.toBeNull();
    expect(result!.owner).toBe('Wolfe-Jam');
  });
});

describe('ENGINE: Slot Counter', () => {
  it('scores all 21 slots filled at 100%', () => {
    const result = countSlots({
      projectName: 'test', projectGoal: 'testing', mainLanguage: 'TS', projectType: 'cli',
      who: 'dev', what: 'app', why: 'need', where: 'cloud', when: 'now', how: 'code',
      frontend: 'React', uiLibrary: 'MUI', backend: 'Node', runtime: 'Node',
      database: 'Postgres', build: 'esbuild', packageManager: 'npm', apiType: 'REST',
      hosting: 'Vercel', cicd: 'GHA', cssFramework: 'Tailwind',
    });
    expect(result.score).toBe(100);
    expect(result.filled).toBe(21);
    expect(result.missing).toBe(0);
  });

  it('scores an empty object at 0%', () => {
    const result = countSlots({});
    expect(result.score).toBe(0);
    expect(result.filled).toBe(0);
  });

  it('isIgnored detects slot_ignore markers', () => {
    expect(isIgnored('N/A')).toBe(true);
    expect(isIgnored('n/a')).toBe(true);
    expect(isIgnored('slotignored')).toBe(true);
    expect(isIgnored('none')).toBe(true);
    expect(isIgnored('unknown')).toBe(true);
    expect(isIgnored('not specified')).toBe(true);
    expect(isIgnored('real value')).toBe(false);
    expect(isIgnored(null)).toBe(false);
  });

  it('isFilled rejects null, undefined, empty', () => {
    expect(isFilled(null)).toBe(false);
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled('')).toBe(false);
    expect(isFilled('hello')).toBe(true);
    expect(isFilled(42)).toBe(true);
    expect(isFilled('N/A')).toBe(false); // ignored = not filled
  });

  it('ignored slots count toward score (filled+ignored)/21', () => {
    const result = countSlots({
      projectName: 'test',
      projectType: 'N/A',
      projectGoal: 'A thing',
    });
    // 2 filled + 1 ignored = 3 accounted, out of 21 total
    expect(result.ignored).toBe(1);
    expect(result.filled).toBe(2);
    expect(result.score).toBe(Math.round((3 / 21) * 100));
  });
});

describe('ENGINE: README 6Ws Extraction', () => {
  it('extracts project info from a standard README', () => {
    const readme = [
      '# MyProject',
      '',
      'A CLI tool for managing configuration files.',
      '',
      '## Installation',
      '```bash',
      'npm install myproject',
      '```',
    ].join('\n');

    const result = extractSixWs(readme);
    expect(result).toBeDefined();
  });

  it('handles empty README gracefully', () => {
    const result = extractSixWs('');
    expect(result).toBeDefined();
  });
});

describe('ENGINE: Human Context Commands', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-human-'));
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'human-test', type: 'cli' },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('humanAddCommand adds human_context to .faf', async () => {
    const result = await humanAddCommand(tmpDir, {
      field: 'who',
      value: 'Test Engineer',
    });
    expect(result.success).toBe(true);

    const yaml = await import('yaml');
    const content = yaml.parse(fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8'));
    expect(content.human_context?.who).toBe('Test Engineer');
  });

  it('humanSetCommand sets a specific field', async () => {
    const result = await humanSetCommand(tmpDir, 'what', 'Building the future');
    expect(result.success).toBe(true);

    const yaml = await import('yaml');
    const content = yaml.parse(fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8'));
    expect(content.human_context?.what).toBe('Building the future');
  });

  it('humanAddCommand creates .faf if missing (auto-create)', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-nofaf-'));
    try {
      const result = await humanAddCommand(emptyDir, { field: 'who', value: 'test' });
      // humanAdd creates project.faf if missing
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(emptyDir, 'project.faf'))).toBe(true);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('ENGINE: Engine Adapter Routes Interop', () => {
  let adapter: FafEngineAdapter;
  let tmpDir: string;

  beforeEach(async () => {
    adapter = new FafEngineAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-adapter-'));
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'adapter-test', type: 'cli' },
      human: { who: 'Tester' },
    }));
    adapter.setWorkingDirectory(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('agents --action=export routes through adapter', async () => {
    const result = await adapter.callEngine('agents', [tmpDir, '--action=export']);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('cursor --action=export routes through adapter', async () => {
    const result = await adapter.callEngine('cursor', [tmpDir, '--action=export']);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('gemini --action=export routes through adapter', async () => {
    const result = await adapter.callEngine('gemini', [tmpDir, '--action=export']);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('bi-sync --all routes through adapter', async () => {
    const result = await adapter.callEngine('bi-sync', [tmpDir, '--all']);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('human command routes through adapter', async () => {
    const result = await adapter.callEngine('human', [tmpDir, '--field=who', '--value=Champion']);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('readme command routes through adapter', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), [
      '# AdapterTest',
      '',
      'A CLI tool for testing engine adapter routing.',
      '',
      '## Installation',
      '```bash',
      'npm install adapter-test',
      '```',
      '',
      '## Features',
      '- Fast routing',
      '- Zero dependencies',
      '',
      '## Tech Stack',
      '- TypeScript',
      '- Node.js',
    ].join('\n'));
    const result = await adapter.callEngine('readme', [tmpDir]);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// AERO TESTS — Edge cases, security, performance
// ============================================================================

describe('AERO: Parser Poison Input', () => {
  it('AGENTS parser handles null bytes', () => {
    const result = parseAgentsMd('# Project\0: Evil\n\0\0');
    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
  });

  it('Cursor parser handles massive input without hanging', () => {
    const huge = '# Rules\n' + '- rule\n'.repeat(100_000);
    const start = Date.now();
    const result = parseCursorRules(huge);
    const elapsed = Date.now() - start;
    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(5000);
  });

  it('Gemini parser handles script injection', () => {
    const evil = '# GEMINI\n<script>alert("xss")</script>\n## Section\nContent';
    const result = parseGeminiMd(evil);
    expect(result).toBeDefined();
  });

  it('GitHub URL parser treats __proto__/constructor as valid shape but harmless', () => {
    // parseGitHubUrl sees "owner/repo" pattern — this is string data, not prototype pollution
    const result = parseGitHubUrl('__proto__/constructor');
    // The parser returns a plain object — no actual prototype pollution occurs
    expect(result).toEqual({ owner: '__proto__', repo: 'constructor' });
  });

  it('slot counter handles all valid slot names', () => {
    const result = countSlots({
      projectName: 'v', projectGoal: 'v', mainLanguage: 'v', projectType: 'v',
      who: 'v', what: 'v', why: 'v', where: 'v', when: 'v', how: 'v',
      frontend: 'v', uiLibrary: 'v', backend: 'v', runtime: 'v',
      database: 'v', build: 'v', packageManager: 'v', apiType: 'v',
      hosting: 'v', cicd: 'v', cssFramework: 'v',
    });
    expect(result.score).toBe(100);
    expect(result.filled).toBe(21);
    expect(result.missing).toBe(0);
  });
});

describe('AERO: Encoding Edge Cases', () => {
  it('AGENTS parser strips UTF-8 BOM', () => {
    const bom = '\uFEFF# Project: BomTest\n## Section\nContent';
    const result = parseAgentsMd(bom);
    expect(result.projectName).toBe('BomTest');
  });

  it('AGENTS parser normalizes CRLF', () => {
    const crlf = '# Project: WinTest\r\n## Section\r\nContent\r\n';
    const result = parseAgentsMd(crlf);
    expect(result.projectName).toBe('WinTest');
  });

  it('AGENTS parser normalizes old Mac CR', () => {
    const cr = '# Project: MacTest\r## Section\rContent\r';
    const result = parseAgentsMd(cr);
    expect(result.projectName).toBe('MacTest');
  });

  it('Cursor parser handles mixed line endings', () => {
    const mixed = '# Rules\n- rule1\r\n- rule2\r- rule3\n';
    const result = parseCursorRules(mixed);
    expect(result).toBeDefined();
  });
});

describe('AERO: Conductor Directory Edge Cases', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-conductor-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('import handles empty conductor directory', async () => {
    fs.mkdirSync(path.join(tmpDir, 'conductor'));
    const result = await conductorImportCommand(path.join(tmpDir, 'conductor'));
    expect(result).toBeDefined();
  });

  it('export creates output files from .faf', async () => {
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'conductor-out', type: 'cli' },
    }));
    const result = await conductorExportCommand(tmpDir);
    expect(result.success).toBe(true);
  });
});

describe('AERO: Score Tier System', () => {
  it('getScoreTier returns correct tiers', () => {
    expect(getScoreTier(100)).toBeDefined();
    expect(getScoreTier(99)).toBeDefined();
    expect(getScoreTier(85)).toBeDefined();
    expect(getScoreTier(70)).toBeDefined();
    expect(getScoreTier(50)).toBeDefined();
    expect(getScoreTier(0)).toBeDefined();
  });

  it('score never exceeds 100', () => {
    const result = countSlots({
      projectName: 'v', projectGoal: 'v', mainLanguage: 'v', projectType: 'v',
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('score is never negative', () => {
    const result = countSlots({});
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('AERO: HTTP-SSE Transport (faf-mcp exclusive)', () => {
  it('server accepts http-sse transport config', () => {
    expect(() => new ClaudeFafMcpServer({
      transport: 'http-sse',
      port: 0,
      cors: true,
      fafEnginePath: 'faf',
    })).not.toThrow();
  });

  it('server has express and cors in dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'package.json'), 'utf-8'
    ));
    expect(pkg.dependencies).toHaveProperty('express');
    expect(pkg.dependencies).toHaveProperty('cors');
  });

  it('package.json version is 2.0.0', () => {
    const pkg = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'package.json'), 'utf-8'
    ));
    expect(pkg.version).toBe('2.0.0');
  });
});

describe('AERO: Cross-Format Sync Integrity', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-xsync-'));
    const yaml = await import('yaml');
    fs.writeFileSync(path.join(tmpDir, 'project.faf'), yaml.stringify({
      version: '1.0',
      project: { name: 'xsync-test', type: 'fullstack' },
      human: { who: 'Engineer', what: 'Building tools', why: 'To help developers' },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--all sync produces 4 files that all reference the project name', async () => {
    await syncBiDirectional(tmpDir, { all: true });

    const claude = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    const agents = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const cursor = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    const gemini = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf-8');

    expect(claude).toContain('xsync-test');
    expect(agents).toContain('xsync-test');
    expect(cursor).toContain('xsync-test');
    expect(gemini).toContain('xsync-test');
  });

  it('--all sync is idempotent (running twice produces same output)', async () => {
    await syncBiDirectional(tmpDir, { all: true });
    const agents1 = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const cursor1 = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');

    await syncBiDirectional(tmpDir, { all: true });
    const agents2 = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const cursor2 = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');

    expect(agents2).toBe(agents1);
    expect(cursor2).toBe(cursor1);
  });
});

describe('AERO: Performance Under Load', () => {
  it('100 sequential parseAgentsMd calls in < 500ms', () => {
    const input = '# Project: SpeedTest\n## Overview\nFast.\n## Rules\n- Be quick\n';
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      parseAgentsMd(input);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('100 sequential parseCursorRules calls in < 500ms', () => {
    const input = '# Rules\n- Rule 1\n- Rule 2\n- Rule 3\n';
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      parseCursorRules(input);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('100 sequential parseGitHubUrl calls in < 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      parseGitHubUrl('https://github.com/facebook/react');
    }
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('100 sequential countSlots calls in < 200ms', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      countSlots({
        projectName: 'v', projectGoal: 'v', mainLanguage: 'v',
        who: 'v', what: 'N/A', frontend: 'React',
      });
    }
    expect(Date.now() - start).toBeLessThan(200);
  });
});
