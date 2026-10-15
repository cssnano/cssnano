import postcss from 'postcss';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import plugin from '../../../src/plugins/postcss-normalize-url/index.js';

const processor = postcss([plugin()]);

/**
 * @typedef {{
 *   type: 'crash' | 'syntax-error' | 'idempotence' | 'passthrough-mismatch' | 'domain-invariant',
 *   css: string,
 *   branch: string,
 *   output?: string,
 *   message: string
 * }} FuzzFailure
 */

/**
 * @param {string} css
 * @param {string} branch
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkIdempotence(css, branch, output) {
  try {
    const second = processor.process(output, { from: undefined }).css;
    if (second !== output) {
      return {
        type: 'idempotence',
        css,
        branch,
        output,
        message: `Transformation was not idempotent (second pass: ${second})`,
      };
    }
  } catch (error) {
    return {
      type: 'idempotence',
      css,
      branch,
      output,
      message: `Second pass threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return undefined;
}

/**
 * Check invariants for one fuzz test case.
 * @param {import('./fuzzGenerate.js').FuzzCase} testCase
 * @return {FuzzFailure | undefined}
 */
export function check(testCase) {
  const { css, branch, isPassthrough } = testCase;
  let output;

  try {
    output = processor.process(css, { from: undefined }).css;
  } catch (error) {
    return {
      type: 'crash',
      css,
      branch,
      message: `Plugin threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 1. AST re-parseability
  try {
    postcss.parse(output);
  } catch (error) {
    return {
      type: 'syntax-error',
      css,
      branch,
      output,
      message: `Output did not reparse as CSS: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 2. Idempotence
  const idempotenceFailure = checkIdempotence(css, branch, output);
  if (idempotenceFailure) return idempotenceFailure;

  // 3. Passthrough verification
  if (isPassthrough && output !== css) {
    return {
      type: 'passthrough-mismatch',
      css,
      branch,
      output,
      message: 'Declaration without URL was mutated',
    };
  }

  // 4. Decoded url() and string values must be byte-identical. This keeps
  // Windows drive letters, dot segments and non-empty URLs as written.
  const inputValues = decodedUrlValues(css);
  const outputValues = decodedUrlValues(output);
  if (!sameValues(inputValues, outputValues)) {
    return {
      type: 'domain-invariant',
      css,
      branch,
      output,
      message: `Decoded URL values changed from ${JSON.stringify(inputValues)} to ${JSON.stringify(outputValues)}`,
    };
  }

  // 5. Non-printable control characters in URLs must retain or receive quotes
  if (testCase.hasNonPrintableQuotes) {
    const hasQuotes = output.includes('url("') || output.includes("url('");
    if (!hasQuotes) {
      return {
        type: 'domain-invariant',
        css,
        branch,
        output,
        message: 'URL with non-printable character was unquoted',
      };
    }
  }

  // 6. Semantic validation against WHATWG reference resolver
  return checkReferenceResolver(branch, css, output);
}

const CSS_WHITESPACE_AT_ENDS = /^[ \t\n\r\f]+|[ \t\n\r\f]+$/gv;

/**
 * Decoded values of every url token and string token. The CSS whitespace at
 * their ends is dropped, since the plugin may trim it.
 * @param {string} css
 * @return {string[]}
 */
function decodedUrlValues(css) {
  const values = [];
  for (const token of tokenize({ css })) {
    if (token[0] === TokenType.URL || token[0] === TokenType.String) {
      values.push(token[4].value.replace(CSS_WHITESPACE_AT_ENDS, ''));
    }
  }
  return values;
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @return {boolean}
 */
function sameValues(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const URL_PATTERN = /url\((["']?)([\s\S]*?)\1\)/v;
const REFERENCE_BASE = 'http://localhost/d0/d1/d2/d3/d4/d5/d6/d7/d8/d9/';

/**
 * @param {string} branch
 * @param {string} css
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkReferenceResolver(branch, css, output) {
  if (
    branch !== 'relative-path' &&
    branch !== 'root-relative' &&
    branch !== 'absolute-http'
  ) {
    return undefined;
  }
  const inMatch = css.match(URL_PATTERN);
  const outMatch = output.match(URL_PATTERN);
  if (!inMatch || !outMatch) return undefined;

  const inUrl = inMatch[2];
  const outUrl = outMatch[2];
  try {
    const inResolved = new URL(inUrl, REFERENCE_BASE).href;
    const outResolved = new URL(outUrl, REFERENCE_BASE).href;
    if (inResolved !== outResolved) {
      return {
        type: 'domain-invariant',
        css,
        branch,
        output,
        message: `Semantic resolver mismatch: input resolved to "${inResolved}", but output resolved to "${outResolved}"`,
      };
    }
  } catch {
    /* Ignore malformed inputs that reference resolver rejects */
  }
  return undefined;
}

/**
 * Format a fuzz failure report.
 * @param {FuzzFailure} failure
 * @param {number} [seed]
 * @param {number} [index]
 * @return {string}
 */
export function report(failure, seed, index) {
  return [
    `fuzz failure (${failure.type}) on branch '${failure.branch}' after ${index} cases, seed ${seed}`,
    `input:  ${JSON.stringify(failure.css)}`,
    failure.output !== undefined
      ? `output: ${JSON.stringify(failure.output)}`
      : undefined,
    failure.message,
  ]
    .filter(Boolean)
    .join('\n');
}
