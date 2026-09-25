import postcss from 'postcss';
import { TokenType, tokenize } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import plugin from '../../src/index.js';

const { balancedTokens } = cssnanoUtils;
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

// Forbidden characters in unquoted CSS url() tokens
// eslint-disable-next-line no-control-regex
const FORBIDDEN_UNQUOTED = /[\s\(\)"'\\\x00-\x08\x0b\x0e-\x1f\x7f]/v;

/**
 * Checks idempotence of the transformation.
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
 * Validates CSS tokenization invariants on output.
 * @param {string} css
 * @param {string} branch
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkTokenInvariants(css, branch, output) {
  const tokens = tokenize({ css: output });

  for (const token of tokens) {
    if (token[0] === TokenType.BadString) {
      return {
        type: 'domain-invariant',
        css,
        branch,
        output,
        message: `Output contains bad-string-token: ${token[1]}`,
      };
    }
    if (token[0] === TokenType.BadURL) {
      return {
        type: 'domain-invariant',
        css,
        branch,
        output,
        message: `Output contains bad-url-token: ${token[1]}`,
      };
    }
    if (token[0] === TokenType.String) {
      // CSS strings must never contain literal newlines
      if (/[\r\n\f]/v.test(token[1])) {
        return {
          type: 'domain-invariant',
          css,
          branch,
          output,
          message: `Output string token contains literal newline: ${token[1]}`,
        };
      }
    }
    if (token[0] === TokenType.URL) {
      // Unquoted URL value check
      const urlValue = token[4]?.value ?? '';
      if (FORBIDDEN_UNQUOTED.test(urlValue)) {
        return {
          type: 'domain-invariant',
          css,
          branch,
          output,
          message: `Unquoted url() token contains forbidden characters: ${urlValue}`,
        };
      }
    }
  }

  return undefined;
}

/**
 * Semantic oracle for the valid branches: a minified SVG payload must still
 * contain an SVG root element. Corruption such as url('data:image/svg+xml;
 * charset=utf-8,#ff0') (document dropped, fragment promoted to payload) is
 * valid, idempotent CSS, so only a document check catches it.
 * @param {string} css
 * @param {string} branch
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkSvgRootPreserved(css, branch, output) {
  if (!branch.startsWith('valid-svg')) return undefined;

  const dataUri = /data:image\/svg\+xml[^,]*,/iv.exec(output);
  if (!dataUri) {
    return {
      type: 'domain-invariant',
      css,
      branch,
      output,
      message: 'Optimized output lost the SVG data URI',
    };
  }
  // Base64 payloads do not carry a literal root element to look for.
  if (/base64/iv.test(dataUri[0])) return undefined;

  const payload = output.slice(dataUri.index + dataUri[0].length);
  // Percent-decode first so encoded and raw payloads share one probe;
  // the SVG root element must survive minification.
  const decodedPayload = payload.replace(/%([0-9a-f]{2})/giv, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
  if (/<svg(?![\w_.:\-])/iv.test(decodedPayload)) {
    return undefined;
  }

  return {
    type: 'domain-invariant',
    css,
    branch,
    output,
    message: `Minified SVG payload lost its root element: ${payload.slice(0, 80)}`,
  };
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

  // 1. PostCSS parse invariant
  try {
    const root = postcss.parse(output);
    const decl = root.first;
    if (decl && 'value' in decl) {
      const balanced = balancedTokens(decl.value);
      if (!balanced) {
        return {
          type: 'domain-invariant',
          css,
          branch,
          output,
          message: `Output declaration value is not balanced: ${decl.value}`,
        };
      }
    }
  } catch (error) {
    return {
      type: 'syntax-error',
      css,
      branch,
      output,
      message: `Output did not reparse as CSS: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 2. CSS Syntax Level 3 Tokenization invariants
  const tokenFailure = checkTokenInvariants(css, branch, output);
  if (tokenFailure) return tokenFailure;

  // 3. Idempotence
  const idempotenceFailure = checkIdempotence(css, branch, output);
  if (idempotenceFailure) return idempotenceFailure;

  // 4. Passthrough verification
  if (isPassthrough && output !== css) {
    return {
      type: 'passthrough-mismatch',
      css,
      branch,
      output,
      message: 'Expected passthrough input was mutated',
    };
  }

  // 5. Semantic output check: the SVG document must survive minification.
  return checkSvgRootPreserved(css, branch, output);
}

/**
 * Formats a fuzz failure report.
 * @param {FuzzFailure} failure
 * @param {number} [seed]
 * @param {number} [index]
 * @return {string}
 */
export function report(failure, seed, index) {
  const seedStr =
    seed !== undefined ? ` (seed ${seed}, index ${index ?? '?'})` : '';
  return [
    `Fuzz failure: ${failure.type} on branch "${failure.branch}"${seedStr}`,
    `Message: ${failure.message}`,
    `Input:   ${failure.css}`,
    `Output:  ${failure.output ?? '(none)'}`,
  ].join('\n');
}
