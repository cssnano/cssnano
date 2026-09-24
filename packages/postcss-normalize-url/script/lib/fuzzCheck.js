import postcss from 'postcss';
import plugin from '../../src/index.js';

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
 * @param {string} branch
 * @param {string} css
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkColonRetention(branch, css, output) {
  if (branch !== 'relative-path') return undefined;
  const inMatch = css.match(URL_PATTERN);
  const outMatch = output.match(URL_PATTERN);
  if (!inMatch || !outMatch) return undefined;

  const inUrl = inMatch[2];
  const outUrl = outMatch[2];
  const inDelimiter = inUrl.search(/[?#]/v);
  const inPath = inDelimiter === -1 ? inUrl : inUrl.slice(0, inDelimiter);
  if (
    !inPath.startsWith('./') &&
    !inPath.startsWith('../') &&
    !inPath.includes('/../')
  ) {
    return undefined;
  }
  const outDelimiter = outUrl.search(/[?#]/v);
  const outPath = outDelimiter === -1 ? outUrl : outUrl.slice(0, outDelimiter);
  const firstSegment = outPath.split('/')[0];
  if (
    !outPath.startsWith('/') &&
    !outPath.startsWith('../') &&
    /^[a-zA-Z][a-zA-Z\d+\-.]*?:/v.test(firstSegment) &&
    !outPath.startsWith('./')
  ) {
    return {
      type: 'domain-invariant',
      css,
      branch,
      output,
      message: `Relative URL "${outUrl}" first segment contains a colon but lacks leading "./"`,
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
  const { css, branch, isPassthrough, hasDrive } = testCase;
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

  // 4. Windows drive retention
  if (hasDrive) {
    const lowerOutput = output.toLowerCase();
    const drivePrefix = `${hasDrive}/`;
    if (!lowerOutput.includes(drivePrefix)) {
      return {
        type: 'domain-invariant',
        css,
        branch,
        output,
        message: `Windows drive letter ${hasDrive} was lost in output`,
      };
    }
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

  // 6. Dot segments must not collapse to empty url() unless input was empty url()
  if (!css.includes('url()') && output.includes('url()')) {
    return {
      type: 'domain-invariant',
      css,
      branch,
      output,
      message: 'Non-empty URL was collapsed to empty url()',
    };
  }

  // 7. Relative URLs whose first segment contains a colon must retain or prepend ./ (RFC 3986 §4.2)
  const colonFailure = checkColonRetention(branch, css, output);
  if (colonFailure) return colonFailure;

  // 8. Semantic validation against WHATWG reference resolver
  return checkReferenceResolver(branch, css, output);
}

const URL_PATTERN = /url\((["']?)([\s\S]*?)\1\)/v;
const DUPLICATE_SLASH_NORM_REGEX = /([^:])\/{2,}/gv;
const UNRESERVED_NORM_REGEX =
  /%(?:2[dD]|3[0-9]|[46][1-9a-fA-F]|[57][0-9aA]|5[fF]|7[eE])/gv;
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
    const inNorm = inUrl
      .replace(DUPLICATE_SLASH_NORM_REGEX, '$1/')
      .replace(UNRESERVED_NORM_REGEX, decodeURIComponent);
    const outNorm = outUrl
      .replace(DUPLICATE_SLASH_NORM_REGEX, '$1/')
      .replace(UNRESERVED_NORM_REGEX, decodeURIComponent);
    const inResolved = new URL(inNorm, REFERENCE_BASE).href;
    const outResolved = new URL(outNorm, REFERENCE_BASE).href;
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
