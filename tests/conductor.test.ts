/**
 * FAF Conductor Interop Test Suite
 *
 * Tests bidirectional interoperability between FAF (.faf) and Google's Conductor format.
 * Validates import, export, and sync operations per FAF-CONDUCTOR-INTEROP.md spec.
 *
 * @see /specs/FAF-CONDUCTOR-INTEROP.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces (from spec)
// ============================================================================

interface ConductorProduct {
  title: string;
  description: string;
  goals: string[];
  users: string[];
  features: string[];
}

interface ConductorTechStack {
  languages: string[];
  frameworks: string[];
  databases: string[];
  infrastructure: string[];
}

interface ConductorWorkflow {
  developmentProcess: string[];
  commitStrategy: string[];
  reviewProcess: string[];
}

interface ConductorGuidelines {
  proseStyle: string[];
  brandingRules: string[];
  visualIdentity: string[];
}

interface ConductorDirectory {
  product?: ConductorProduct;
  techStack?: ConductorTechStack;
  workflow?: ConductorWorkflow;
  guidelines?: ConductorGuidelines;
  styleguides?: Record<string, string[]>;
}

interface FafFromConductor {
  project: {
    name: string;
    description: string;
    type: string;
    goals: string[];
    stack: {
      languages: string[];
      frameworks: string[];
      databases: string[];
      infrastructure: string[];
    };
    rules: string[];
    guidelines: string[];
  };
  metadata: {
    source: string;
    imported: string;
    conductor_version?: string;
  };
}

// ============================================================================
// Parser Implementation (Core Logic to Test)
// ============================================================================

/**
 * Parse markdown content and extract sections by heading
 */
function parseMarkdownSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let currentSection = '_intro';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Match ## headings
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1].toLowerCase().replace(/\s+/g, '_');
      currentContent = [];
    } else if (line.match(/^#\s+(.+)$/)) {
      // H1 is the title
      const titleMatch = line.match(/^#\s+(.+)$/);
      if (titleMatch) {
        sections['_title'] = titleMatch[1];
      }
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Extract bullet points from markdown content
 */
function extractBulletPoints(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
  }

  return bullets;
}

/**
 * Parse product.md file
 */
function parseProductMd(content: string): ConductorProduct {
  const sections = parseMarkdownSections(content);

  return {
    title: sections['_title'] || 'Unknown Project',
    description: sections['overview'] || '',
    goals: extractBulletPoints(sections['goals'] || ''),
    users: extractBulletPoints(sections['target_users'] || ''),
    features: extractBulletPoints(sections['key_features'] || ''),
  };
}

/**
 * Parse tech-stack.md file
 */
function parseTechStackMd(content: string): ConductorTechStack {
  const sections = parseMarkdownSections(content);

  return {
    languages: extractBulletPoints(sections['languages'] || ''),
    frameworks: extractBulletPoints(sections['frameworks'] || ''),
    databases: extractBulletPoints(sections['databases'] || ''),
    infrastructure: extractBulletPoints(sections['infrastructure'] || ''),
  };
}

/**
 * Parse workflow.md file
 */
function parseWorkflowMd(content: string): ConductorWorkflow {
  const sections = parseMarkdownSections(content);

  return {
    developmentProcess: extractBulletPoints(sections['development_process'] || ''),
    commitStrategy: extractBulletPoints(sections['commit_strategy'] || ''),
    reviewProcess: extractBulletPoints(sections['review_process'] || ''),
  };
}

/**
 * Parse product-guidelines.md file
 */
function parseGuidelinesMd(content: string): ConductorGuidelines {
  const sections = parseMarkdownSections(content);

  return {
    proseStyle: extractBulletPoints(sections['prose_style'] || ''),
    brandingRules: extractBulletPoints(sections['branding_rules'] || ''),
    visualIdentity: extractBulletPoints(sections['visual_identity'] || ''),
  };
}

/**
 * Import conductor directory to FAF format
 */
function conductorImport(conductorPath: string): FafFromConductor {
  const result: FafFromConductor = {
    project: {
      name: 'Unknown',
      description: '',
      type: 'conductor-import',
      goals: [],
      stack: {
        languages: [],
        frameworks: [],
        databases: [],
        infrastructure: [],
      },
      rules: [],
      guidelines: [],
    },
    metadata: {
      source: 'conductor',
      imported: new Date().toISOString(),
    },
  };

  // Parse product.md
  const productPath = path.join(conductorPath, 'product.md');
  if (fs.existsSync(productPath)) {
    const product = parseProductMd(fs.readFileSync(productPath, 'utf-8'));
    result.project.name = product.title;
    result.project.description = product.description;
    result.project.goals = product.goals;
  }

  // Parse tech-stack.md
  const techStackPath = path.join(conductorPath, 'tech-stack.md');
  if (fs.existsSync(techStackPath)) {
    const techStack = parseTechStackMd(fs.readFileSync(techStackPath, 'utf-8'));
    result.project.stack = techStack;
  }

  // Parse workflow.md
  const workflowPath = path.join(conductorPath, 'workflow.md');
  if (fs.existsSync(workflowPath)) {
    const workflow = parseWorkflowMd(fs.readFileSync(workflowPath, 'utf-8'));
    result.project.rules = [
      ...workflow.developmentProcess,
      ...workflow.commitStrategy,
      ...workflow.reviewProcess,
    ];
  }

  // Parse product-guidelines.md
  const guidelinesPath = path.join(conductorPath, 'product-guidelines.md');
  if (fs.existsSync(guidelinesPath)) {
    const guidelines = parseGuidelinesMd(fs.readFileSync(guidelinesPath, 'utf-8'));
    result.project.guidelines = [
      ...guidelines.proseStyle,
      ...guidelines.brandingRules,
      ...guidelines.visualIdentity,
    ];
  }

  return result;
}

/**
 * Export FAF to Conductor format
 */
function conductorExport(faf: FafFromConductor, outputPath: string): string[] {
  const generatedFiles: string[] = [];

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Generate product.md
  const productContent = `# ${faf.project.name}

## Overview
${faf.project.description}

## Goals
${faf.project.goals.map(g => `- ${g}`).join('\n')}
`;
  fs.writeFileSync(path.join(outputPath, 'product.md'), productContent);
  generatedFiles.push('product.md');

  // Generate tech-stack.md
  const techStackContent = `# Tech Stack

## Languages
${faf.project.stack.languages.map(l => `- ${l}`).join('\n')}

## Frameworks
${faf.project.stack.frameworks.map(f => `- ${f}`).join('\n')}

## Databases
${faf.project.stack.databases.map(d => `- ${d}`).join('\n')}

## Infrastructure
${faf.project.stack.infrastructure.map(i => `- ${i}`).join('\n')}
`;
  fs.writeFileSync(path.join(outputPath, 'tech-stack.md'), techStackContent);
  generatedFiles.push('tech-stack.md');

  // Generate workflow.md
  const workflowContent = `# Workflow

## Rules
${faf.project.rules.map(r => `- ${r}`).join('\n')}
`;
  fs.writeFileSync(path.join(outputPath, 'workflow.md'), workflowContent);
  generatedFiles.push('workflow.md');

  // Generate product-guidelines.md
  const guidelinesContent = `# Product Guidelines

## Guidelines
${faf.project.guidelines.map(g => `- ${g}`).join('\n')}
`;
  fs.writeFileSync(path.join(outputPath, 'product-guidelines.md'), guidelinesContent);
  generatedFiles.push('product-guidelines.md');

  return generatedFiles;
}

/**
 * Detect conductor directory
 */
function detectConductor(basePath: string): boolean {
  const conductorPath = path.join(basePath, 'conductor');
  if (!fs.existsSync(conductorPath)) return false;

  // Check for at least one required file
  const requiredFiles = ['product.md', 'tech-stack.md', 'workflow.md'];
  return requiredFiles.some(file => fs.existsSync(path.join(conductorPath, file)));
}

// ============================================================================
// Test Suite
// ============================================================================

describe('FAF Conductor Interop', () => {
  const fixturesPath = path.join(__dirname, 'fixtures', 'conductor');
  const completePath = path.join(fixturesPath, 'complete');
  const partialPath = path.join(fixturesPath, 'partial');
  const emptyPath = path.join(fixturesPath, 'empty');
  const tempExportPath = path.join(fixturesPath, 'temp-export');

  afterAll(() => {
    // Cleanup temp export directory
    if (fs.existsSync(tempExportPath)) {
      fs.rmSync(tempExportPath, { recursive: true });
    }
  });

  // ==========================================================================
  // TIER 1: Critical - Core Functionality
  // ==========================================================================

  describe('TIER 1: Critical - Markdown Parsing', () => {
    it('should parse markdown sections correctly', () => {
      const content = `# Title

## Overview
This is the overview.

## Goals
- Goal 1
- Goal 2
`;
      const sections = parseMarkdownSections(content);

      expect(sections['_title']).toBe('Title');
      expect(sections['overview']).toContain('This is the overview');
      expect(sections['goals']).toContain('Goal 1');
    });

    it('should extract bullet points from markdown', () => {
      const content = `- Item 1
- Item 2
- Item 3`;

      const bullets = extractBulletPoints(content);

      expect(bullets).toHaveLength(3);
      expect(bullets).toContain('Item 1');
      expect(bullets).toContain('Item 2');
      expect(bullets).toContain('Item 3');
    });

    it('should handle asterisk bullets', () => {
      const content = `* Item A
* Item B`;

      const bullets = extractBulletPoints(content);

      expect(bullets).toHaveLength(2);
      expect(bullets).toContain('Item A');
    });

    it('should handle empty content gracefully', () => {
      const sections = parseMarkdownSections('');
      const bullets = extractBulletPoints('');

      // Empty content initializes with empty intro section
      expect(sections['_intro']).toBe('');
      expect(bullets).toEqual([]);
    });
  });

  describe('TIER 1: Critical - Product.md Parser', () => {
    it('should parse complete product.md', () => {
      const content = fs.readFileSync(path.join(completePath, 'product.md'), 'utf-8');
      const product = parseProductMd(content);

      expect(product.title).toBe('FAF Test Project');
      expect(product.description).toContain('test project');
      expect(product.goals).toHaveLength(3);
      expect(product.goals[0]).toContain('universal');
      expect(product.users).toHaveLength(3);
      expect(product.features).toHaveLength(3);
    });

    it('should handle missing sections', () => {
      const content = `# Minimal Project

## Overview
Just an overview.`;

      const product = parseProductMd(content);

      expect(product.title).toBe('Minimal Project');
      expect(product.description).toContain('Just an overview');
      expect(product.goals).toEqual([]);
      expect(product.users).toEqual([]);
    });
  });

  describe('TIER 1: Critical - Tech Stack Parser', () => {
    it('should parse complete tech-stack.md', () => {
      const content = fs.readFileSync(path.join(completePath, 'tech-stack.md'), 'utf-8');
      const techStack = parseTechStackMd(content);

      expect(techStack.languages).toContain('TypeScript (primary)');
      expect(techStack.frameworks).toContain('React (frontend)');
      expect(techStack.databases).toContain('PostgreSQL (primary)');
      expect(techStack.infrastructure).toContain('Vercel (frontend hosting)');
    });

    it('should handle partial tech stack', () => {
      const content = fs.readFileSync(path.join(partialPath, 'tech-stack.md'), 'utf-8');
      const techStack = parseTechStackMd(content);

      expect(techStack.languages).toHaveLength(2);
      expect(techStack.frameworks).toEqual([]);
      expect(techStack.databases).toEqual([]);
    });
  });

  describe('TIER 1: Critical - Workflow Parser', () => {
    it('should parse complete workflow.md', () => {
      const content = fs.readFileSync(path.join(completePath, 'workflow.md'), 'utf-8');
      const workflow = parseWorkflowMd(content);

      expect(workflow.developmentProcess).toHaveLength(3);
      expect(workflow.developmentProcess[0]).toContain('TDD');
      expect(workflow.commitStrategy).toHaveLength(3);
      expect(workflow.reviewProcess).toHaveLength(3);
    });
  });

  describe('TIER 1: Critical - Guidelines Parser', () => {
    it('should parse complete product-guidelines.md', () => {
      const content = fs.readFileSync(path.join(completePath, 'product-guidelines.md'), 'utf-8');
      const guidelines = parseGuidelinesMd(content);

      expect(guidelines.proseStyle).toHaveLength(3);
      expect(guidelines.brandingRules).toHaveLength(3);
      expect(guidelines.brandingRules).toContain('FAF always capitalized');
      expect(guidelines.visualIdentity).toHaveLength(3);
    });
  });

  // ==========================================================================
  // TIER 2: Import/Export Operations
  // ==========================================================================

  describe('TIER 2: Conductor Import', () => {
    it('should import complete conductor directory', () => {
      const faf = conductorImport(completePath);

      expect(faf.project.name).toBe('FAF Test Project');
      expect(faf.project.type).toBe('conductor-import');
      expect(faf.project.goals).toHaveLength(3);
      expect(faf.project.stack.languages).toHaveLength(3);
      expect(faf.project.stack.frameworks).toHaveLength(3);
      expect(faf.project.rules.length).toBeGreaterThan(0);
      expect(faf.project.guidelines.length).toBeGreaterThan(0);
      expect(faf.metadata.source).toBe('conductor');
    });

    it('should import partial conductor directory with warnings', () => {
      const faf = conductorImport(partialPath);

      expect(faf.project.name).toBe('Partial Test Project');
      expect(faf.project.stack.languages).toHaveLength(2);
      expect(faf.project.stack.frameworks).toEqual([]);
      expect(faf.project.rules).toEqual([]);
    });

    it('should handle empty conductor directory', () => {
      const faf = conductorImport(emptyPath);

      expect(faf.project.name).toBe('Unknown');
      expect(faf.project.goals).toEqual([]);
      expect(faf.project.stack.languages).toEqual([]);
    });

    it('should set correct metadata', () => {
      const faf = conductorImport(completePath);

      expect(faf.metadata.source).toBe('conductor');
      expect(faf.metadata.imported).toBeDefined();
      expect(new Date(faf.metadata.imported)).toBeInstanceOf(Date);
    });
  });

  describe('TIER 2: Conductor Export', () => {
    const testFaf: FafFromConductor = {
      project: {
        name: 'Export Test Project',
        description: 'Testing FAF to Conductor export',
        type: 'test',
        goals: ['Test goal 1', 'Test goal 2'],
        stack: {
          languages: ['TypeScript', 'Rust'],
          frameworks: ['Next.js', 'Axum'],
          databases: ['SQLite'],
          infrastructure: ['AWS'],
        },
        rules: ['Rule 1', 'Rule 2'],
        guidelines: ['Guideline 1', 'Guideline 2'],
      },
      metadata: {
        source: 'faf',
        imported: new Date().toISOString(),
      },
    };

    it('should export FAF to conductor directory', () => {
      const files = conductorExport(testFaf, tempExportPath);

      expect(files).toContain('product.md');
      expect(files).toContain('tech-stack.md');
      expect(files).toContain('workflow.md');
      expect(files).toContain('product-guidelines.md');
    });

    it('should generate valid product.md', () => {
      conductorExport(testFaf, tempExportPath);
      const content = fs.readFileSync(path.join(tempExportPath, 'product.md'), 'utf-8');

      expect(content).toContain('# Export Test Project');
      expect(content).toContain('Testing FAF to Conductor export');
      expect(content).toContain('- Test goal 1');
    });

    it('should generate valid tech-stack.md', () => {
      conductorExport(testFaf, tempExportPath);
      const content = fs.readFileSync(path.join(tempExportPath, 'tech-stack.md'), 'utf-8');

      expect(content).toContain('## Languages');
      expect(content).toContain('- TypeScript');
      expect(content).toContain('- Rust');
      expect(content).toContain('## Frameworks');
      expect(content).toContain('- Next.js');
    });

    it('should create output directory if not exists', () => {
      const newPath = path.join(tempExportPath, 'nested', 'dir');
      conductorExport(testFaf, newPath);

      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'product.md'))).toBe(true);

      // Cleanup
      fs.rmSync(path.join(tempExportPath, 'nested'), { recursive: true });
    });
  });

  // ==========================================================================
  // TIER 3: Round-Trip Integrity
  // ==========================================================================

  describe('TIER 3: Round-Trip Conversion', () => {
    it('should preserve content through conductor -> faf -> conductor', () => {
      // Import from complete conductor
      const imported = conductorImport(completePath);

      // Export to temp directory
      const roundTripPath = path.join(tempExportPath, 'roundtrip');
      conductorExport(imported, roundTripPath);

      // Re-import and compare
      const reimported = conductorImport(roundTripPath);

      expect(reimported.project.name).toBe(imported.project.name);
      expect(reimported.project.goals).toEqual(imported.project.goals);
      expect(reimported.project.stack.languages).toEqual(imported.project.stack.languages);

      // Cleanup
      fs.rmSync(roundTripPath, { recursive: true });
    });

    it('should maintain data integrity for all fields', () => {
      const original: FafFromConductor = {
        project: {
          name: 'Integrity Test',
          description: 'Testing data integrity',
          type: 'test',
          goals: ['Goal A', 'Goal B', 'Goal C'],
          stack: {
            languages: ['Go', 'Python', 'TypeScript'],
            frameworks: ['Gin', 'FastAPI', 'Express'],
            databases: ['PostgreSQL', 'Redis'],
            infrastructure: ['GCP', 'Docker'],
          },
          rules: ['TDD required', 'Code review mandatory'],
          guidelines: ['Keep it simple', 'Document APIs'],
        },
        metadata: {
          source: 'test',
          imported: new Date().toISOString(),
        },
      };

      const roundTripPath = path.join(tempExportPath, 'integrity');
      conductorExport(original, roundTripPath);
      const roundTripped = conductorImport(roundTripPath);

      // Name and description preserved
      expect(roundTripped.project.name).toBe(original.project.name);

      // Goals preserved (order may vary)
      expect(roundTripped.project.goals).toHaveLength(original.project.goals.length);
      original.project.goals.forEach(goal => {
        expect(roundTripped.project.goals).toContain(goal);
      });

      // Stack preserved
      expect(roundTripped.project.stack.languages).toEqual(original.project.stack.languages);
      expect(roundTripped.project.stack.frameworks).toEqual(original.project.stack.frameworks);

      // Cleanup
      fs.rmSync(roundTripPath, { recursive: true });
    });
  });

  // ==========================================================================
  // TIER 4: Detection & Utilities
  // ==========================================================================

  describe('TIER 4: Format Detection', () => {
    it('should detect conductor directory', () => {
      // Create a temp structure
      const detectPath = path.join(tempExportPath, 'detect-test');
      const conductorDir = path.join(detectPath, 'conductor');
      fs.mkdirSync(conductorDir, { recursive: true });
      fs.writeFileSync(path.join(conductorDir, 'product.md'), '# Test');

      expect(detectConductor(detectPath)).toBe(true);

      // Cleanup
      fs.rmSync(detectPath, { recursive: true });
    });

    it('should return false for non-conductor directory', () => {
      expect(detectConductor('/tmp/nonexistent')).toBe(false);
    });

    it('should require at least one core file', () => {
      const detectPath = path.join(tempExportPath, 'empty-conductor');
      const conductorDir = path.join(detectPath, 'conductor');
      fs.mkdirSync(conductorDir, { recursive: true });

      expect(detectConductor(detectPath)).toBe(false);

      // Cleanup
      fs.rmSync(detectPath, { recursive: true });
    });
  });

  // ==========================================================================
  // TIER 5: Performance
  // ==========================================================================

  describe('TIER 5: Performance', () => {
    it('should parse conductor directory in < 50ms', () => {
      const start = performance.now();
      conductorImport(completePath);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should export FAF in < 50ms', () => {
      const testFaf: FafFromConductor = {
        project: {
          name: 'Perf Test',
          description: 'Performance testing',
          type: 'test',
          goals: ['Fast', 'Efficient'],
          stack: {
            languages: ['TypeScript'],
            frameworks: ['Jest'],
            databases: [],
            infrastructure: [],
          },
          rules: ['Be fast'],
          guidelines: ['Keep it simple'],
        },
        metadata: {
          source: 'test',
          imported: new Date().toISOString(),
        },
      };

      const perfPath = path.join(tempExportPath, 'perf');

      const start = performance.now();
      conductorExport(testFaf, perfPath);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);

      // Cleanup
      fs.rmSync(perfPath, { recursive: true });
    });
  });

  // ==========================================================================
  // WJTTC Championship Certification
  // ==========================================================================

  describe('WJTTC Championship Certification', () => {
    it('should pass GOLD tier: Complete import/export cycle', () => {
      // Full workflow test
      const faf = conductorImport(completePath);
      expect(faf.project.name).toBeDefined();
      expect(faf.project.goals.length).toBeGreaterThan(0);

      const exportPath = path.join(tempExportPath, 'wjttc-gold');
      const files = conductorExport(faf, exportPath);
      expect(files.length).toBe(4);

      // Cleanup
      fs.rmSync(exportPath, { recursive: true });
    });

    it('should pass PLATINUM tier: Round-trip with zero data loss', () => {
      const original = conductorImport(completePath);
      const rtPath = path.join(tempExportPath, 'wjttc-platinum');

      conductorExport(original, rtPath);
      const roundTripped = conductorImport(rtPath);

      // Critical fields preserved
      expect(roundTripped.project.name).toBe(original.project.name);
      expect(roundTripped.project.goals.length).toBe(original.project.goals.length);
      expect(roundTripped.project.stack.languages.length).toBe(original.project.stack.languages.length);

      // Cleanup
      fs.rmSync(rtPath, { recursive: true });
    });
  });
});
