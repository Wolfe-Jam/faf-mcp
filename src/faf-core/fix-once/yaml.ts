/**
 * 🔥 YAML FIX-ONCE ABSTRACTION
 *
 * ROCK SOLID YAML PARSING - FIX ONCE, DONE FOREVER
 *
 * This module handles ALL YAML edge cases:
 * ✅ Empty files
 * ✅ Null/undefined content
 * ✅ Invalid YAML syntax
 * ✅ Type validation
 * ✅ Corrupted files
 * ✅ Clear error messages
 * ✅ Primitive vs Object validation
 *
 * NEVER touch raw YAML parsing outside this file.
 */

import * as yaml from 'yaml';

/**
 * Safe YAML parse - handles ALL edge cases
 * ROCK SOLID - FIX ONCE, DONE FOREVER
 */
export function parse(content: string | null | undefined, options?: { filepath?: string }): any {
  const filepath = options?.filepath || 'unknown file';

  // Edge case 1: Null/undefined (CHECK FIRST before any operations)
  if (content === null || content === undefined) {
    throw new Error(
      'Empty content passed to YAML parser\n' +
      `File: ${filepath}\n` +
      `Fix: Ensure file exists and has content before parsing`
    );
  }

  // Edge case 2: Not a string (CHECK BEFORE calling string methods)
  if (typeof content !== 'string') {
    throw new Error(
      'Invalid content type passed to YAML parser\n' +
      `Expected: string\n` +
      `Got: ${typeof content}\n` +
      `File: ${filepath}`
    );
  }

  // Edge case 3: Empty string or whitespace only
  if (content.trim() === '') {
    throw new Error(
      'Empty .faf file detected\n' +
      `File: ${filepath}\n` +
      'Fix: run faf_init with force: true to recreate the file'
    );
  }

  // Edge case 4: Parse YAML and handle syntax errors
  let result: any;
  try {
    result = yaml.parse(content);
  } catch (error: any) {
    // Wrap yaml parsing errors with helpful context
    throw new Error(
      'Invalid YAML syntax\n' +
      `File: ${filepath}\n` +
      `Error: ${error.message}\n` +
      'Fix: correct the YAML syntax, or recreate the file with faf_init (force: true)'
    );
  }

  // Edge case 5: Parsed successfully but result is null/undefined
  // (valid YAML like "null" or "~" or empty documents)
  if (result === null || result === undefined) {
    throw new Error(
      'YAML file parsed but contains no data\n' +
      `File: ${filepath}\n` +
      'Fix: ensure the file has valid YAML content, or recreate it with faf_init (force: true)'
    );
  }

  // Edge case 6: Parsed to primitive (not an object)
  // .faf files must be YAML objects, not scalars
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(
      'Invalid .faf structure - must be a YAML object\n' +
      `File: ${filepath}\n` +
      `Got: ${Array.isArray(result) ? 'array' : typeof result}\n` +
      `Fix: .faf files must contain key-value pairs, not ${Array.isArray(result) ? 'lists' : 'simple values'}`
    );
  }

  return result;
}

/**
 * Safe YAML stringify - handles edge cases
 * ROCK SOLID - FIX ONCE, DONE FOREVER
 */
export function stringify(data: any, options?: any): string {
  // Edge case 1: Null/undefined data
  if (data === null || data === undefined) {
    throw new Error(
      'Cannot stringify null/undefined data to YAML\n' +
      `Fix: Provide valid data object`
    );
  }

  // Edge case 2: Not an object (primitives should not be stringified for .faf)
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      'Invalid data for .faf stringify\n' +
      `Expected: object\n` +
      `Got: ${Array.isArray(data) ? 'array' : typeof data}\n` +
      `Fix: .faf files must be objects with key-value pairs`
    );
  }

  // Edge case 3: Stringify and catch any errors
  try {
    const result = yaml.stringify(data, options);

    // Edge case 4: Empty result
    if (!result || result.trim() === '') {
      throw new Error('Stringify produced empty output');
    }

    return result;
  } catch (error: any) {
    throw new Error(
      'Failed to convert data to YAML\n' +
      `Error: ${error.message}`
    );
  }
}

// Export raw versions for advanced usage (use with caution)
export const parseDocument = yaml.parseDocument;
export const Document = yaml.Document;

// Re-export as default for compatibility
export default {
  parse,
  stringify,
  Document,
  parseDocument
};

// Also export as YAML for compatibility
export const YAML = {
  parse,
  stringify,
  Document,
  parseDocument
};

/**
 * 🔥 ROCK SOLID STATUS: ACHIEVED
 *
 * All edge cases handled:
 * ✅ Null/undefined → Clear error
 * ✅ Empty files → Clear error
 * ✅ Wrong types → Clear error
 * ✅ Invalid YAML → Wrapped error with context
 * ✅ Primitives → Clear error (.faf must be objects)
 * ✅ Arrays → Clear error (.faf must be objects)
 *
 * FIX ONCE, DONE FOREVER
 */
