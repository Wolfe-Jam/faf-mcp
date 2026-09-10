/**
 * Git Context Command — Interop (faf-mcp 2.0.0; ported from faf-cli 4.5.0 via claude-faf-mcp 4.5.0)
 *
 * Author project.faf from a GitHub repository URL.
 * Fetches metadata, README, package.json — no cloning needed.
 * Bundled command — no CLI dependency required.
 *
 * The score it reports is faf-cli's scorer on the exact bytes authored —
 * the same number faf_score gives that file. The ported slot counter that
 * used to supply it credited defaults and 'slotignored' slots that were
 * never written, so a 10% file was announced as 100% (Trophy).
 */

import path from 'path';
import { promises as fs } from 'fs';
import {
  parseGitHubUrl,
  fetchGitHubMetadata,
  fetchGitHubFileTree,
} from '../parsers/github-extractor.js';
import { generateEnhancedFaf } from '../parsers/faf-git-generator.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface GitContextOptions {
  /** Replace an existing <outputPath>/project.faf. Without it the command refuses. */
  force?: boolean;
}

export interface GitContextResult {
  success: boolean;
  message: string;
  data?: {
    owner: string;
    repo: string;
    score: number;
    tier: string;
    fafContent: string;
    filePath?: string;
  };
}

/**
 * Author project.faf from a GitHub URL
 */
export async function gitContextCommand(
  url: string,
  outputPath?: string,
  options: GitContextOptions = {}
): Promise<GitContextResult> {
  // Parse the URL
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return {
      success: false,
      message: `Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo or owner/repo`,
    };
  }

  const { owner, repo } = parsed;

  // Never replace an existing project.faf unless asked — checked before any
  // network call, so a refusal costs nothing and writes nothing.
  if (outputPath && !options.force) {
    const existing = path.join(outputPath, 'project.faf');
    const exists = await fs.access(existing).then(() => true, () => false);
    if (exists) {
      return {
        success: false,
        message: `project.faf already exists at ${outputPath}. Pass force: true to overwrite.`,
      };
    }
  }

  try {
    // Fetch metadata with file checks
    const metadata = await fetchGitHubMetadata(owner, repo, true);

    // Fetch file tree
    const files = await fetchGitHubFileTree(owner, repo, metadata.defaultBranch);

    // Author the .faf content
    const { content } = await generateEnhancedFaf(metadata, files);

    // One scorer: faf-cli's, on the bytes authored.
    const { scoreFafYaml } = await fafCli;
    const scored = scoreFafYaml(content);
    const score = scored.score;
    const tier = scored.tier.name;

    // Write to file if output path provided
    let filePath: string | undefined;
    if (outputPath) {
      filePath = path.join(outputPath, 'project.faf');
      await fs.writeFile(filePath, content, 'utf-8');
    }

    return {
      success: true,
      message: `Authored project.faf for ${owner}/${repo} — Score: ${score}% (${tier})`,
      data: {
        owner,
        repo,
        score,
        tier,
        fafContent: content,
        filePath,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to fetch GitHub metadata: ${errorMessage}`,
    };
  }
}
