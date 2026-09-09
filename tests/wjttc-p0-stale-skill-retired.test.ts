/**
 * 🏁 WJTTC — P0 stale skill retired (faf-mcp 3.0)
 *
 * package.json's `files` array shipped both `skill/SKILL.md` (name:
 * faf-expert — frontmatter literally says "Updated for v2.8.0 Tool
 * Visibility System", a mechanism that doesn't exist in this codebase's
 * current tool-visibility approach; generic, non-Cursor-specific framing)
 * and `skills/faf-ide/SKILL.md` (name: faf-ide — already correctly scoped
 * for this package's actual audience and tool surface). The stale one is
 * superseded, not orphaned functionality — retired outright.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('🏁 WJTTC — P0 stale skill file retired', () => {
  test('skill/SKILL.md no longer exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'skill', 'SKILL.md'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'skill'))).toBe(false);
  });

  test('package.json files array no longer lists skill/SKILL.md', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.files).not.toContain('skill/SKILL.md');
    expect(pkg.files).toContain('skills/**');
  });

  test('skills/faf-ide/SKILL.md still exists and is correctly scoped', () => {
    const content = fs.readFileSync(path.join(ROOT, 'skills/faf-ide/SKILL.md'), 'utf-8');
    expect(content).toContain('name: faf-ide');
  });
});
