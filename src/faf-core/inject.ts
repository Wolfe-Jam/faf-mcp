import { promises as fs } from 'fs';

/**
 * Block markers for the faf-managed front section. Markdown files use HTML
 * comments; non-markdown files (.cursorrules) pass hash-comment markers.
 */
export const FAF_START = '<!-- faf:start -->';
export const FAF_END = '<!-- faf:end -->';

/**
 * faf's own metastamp fingerprint (fafMetaTag output: `<!-- faf: name | … -->`,
 * note the space). Every faf-generated file begins with it and a user never
 * hand-writes it — so a MARKERLESS file led by it is legacy faf output we can
 * safely reclaim, never genuine user content. The trailing space matters: the
 * START marker `<!-- faf:start -->` must not match this fingerprint.
 */
const FAF_METASTAMP = '<!-- faf: ';

/** Split into lines keeping each line's own terminator (\r\n, \r or \n). */
function linesWithEnds(text: string): string[] {
  return text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter((l, i, a) => l !== '' || i < a.length - 1) ?? [];
}

const isFenceLine = (trimmed: string): boolean => trimmed.startsWith('```') || trimmed.startsWith('~~~');

/** One scan. START must be a whole marker line (surrounding whitespace and the
 *  line terminator ignored); when `fenceAware`, START candidates inside fenced
 *  code are skipped. END is the first whole marker line AFTER START — fence
 *  state is deliberately ignored there, so an unbalanced fence pasted into the
 *  block can never hide the real end marker. */
function scanForBlock(text: string, start: string, end: string, fenceAware: boolean): { start: number; end: number } | null {
  let offset = 0;
  let inFence = false;
  let blockStart = -1;
  for (const line of linesWithEnds(text)) {
    const body = line.replace(/\r?\n$|\r$/, '');
    // A leading BOM on line 1 stays outside the managed range.
    const bom = offset === 0 && body.charCodeAt(0) === 0xfeff ? 1 : 0;
    const content = body.slice(bom);
    // Markers sit at column 0 (faf writes them there; an indented copy is a
    // code block or a quote, never the block). Trailing whitespace is ignored.
    const atColumn0 = content.trimEnd();
    if (blockStart === -1) {
      if (fenceAware && isFenceLine(content.trim())) inFence = !inFence;
      else if (!inFence && atColumn0 === start) blockStart = offset + bom;
    } else if (atColumn0 === end) {
      return { start: blockStart, end: offset + body.length };
    }
    offset += line.length;
  }
  return null;
}

/** True when `marker` appears as a whole line anywhere in `text`. */
function hasMarkerLine(text: string, marker: string): boolean {
  return linesWithEnds(text).some(l => l.replace(/\r?\n$|\r$/, '').replace(/^\uFEFF/, '').trimEnd() === marker);
}

/**
 * Locate the faf-managed block in `text`: the first START marker line and the
 * first END marker line after it. Returns the char range covering both marker
 * lines (terminator of the END line excluded), or null when there is no
 * complete block.
 *
 * Markers are matched as WHOLE LINES at column 0, never as substrings. Substring search was
 * a real bug: faf-cli 7.1.4–7.11.0 renders an AGENTS.md whose prose quotes
 * `<!-- faf:start -->` … `<!-- faf:end -->` in a sentence, so `indexOf(end)`
 * hit the quote, cut the old block in half and left its stale tail below the
 * new one on every re-run.
 *
 * Two passes. The first skips START candidates that sit inside fenced code, so
 * a user documenting the marker syntax in a fence above the block is not
 * mistaken for the block. Fence detection is a plain toggle and Markdown has
 * shapes it misreads (list-item fences, ```` around ```, a stray unclosed
 * fence), so if the first pass finds nothing the second pass ignores fences
 * entirely. A miss must never be silent: the caller treats "no block" as a
 * user file and prefixes, it does not overwrite.
 */
export function findFafBlock(
  text: string,
  start: string = FAF_START,
  end: string = FAF_END,
): { start: number; end: number } | null {
  return scanForBlock(text, start, end, true) ?? scanForBlock(text, start, end, false);
}

/**
 * Non-destructively write a faf-managed block into a file.
 *
 *   - no file                                 -> create it with just the block
 *   - markers present                         -> replace ONLY between them (update in place)
 *   - legacy faf file (metastamp, no markers) -> reclaim in place (no duplication)
 *   - genuine user file                       -> prefix the block; preserve everything below
 *
 * Idempotent: re-runs update the block, never duplicate or destroy user content.
 * faf owns what's between the markers; the user owns everything else.
 * Enhance, never replace.
 */
export async function injectFafBlock(
  path: string,
  block: string,
  start: string = FAF_START,
  end: string = FAF_END,
): Promise<void> {
  const wrapped = `${start}\n${block.trim()}\n${end}`;

  let existing: string | null = null;
  try {
    existing = await fs.readFile(path, 'utf-8');
  } catch {
    existing = null; // file does not exist yet
  }

  if (existing === null) {
    await fs.writeFile(path, `${wrapped}\n`, 'utf-8');
    return;
  }

  const found = findFafBlock(existing, start, end);
  if (found) {
    await fs.writeFile(path, existing.slice(0, found.start) + wrapped + existing.slice(found.end), 'utf-8');
    return;
  }

  if (
    existing.trimStart().startsWith(FAF_METASTAMP) &&
    !hasMarkerLine(existing, start) &&
    !hasMarkerLine(existing, end)
  ) {
    // Legacy faf output (metastamp-led, no markers anywhere) — reclaim in
    // place, no duplication. A file that carries a marker line but no complete
    // block is NOT legacy output: it falls through to the prefix branch so
    // nothing the user wrote is ever overwritten.
    await fs.writeFile(path, `${wrapped}\n`, 'utf-8');
    return;
  }

  // Genuine user file — prefix the block, preserve everything.
  await fs.writeFile(path, `${wrapped}\n\n${existing}`, 'utf-8');
}
