import postcss from 'postcss';
import plugin from '../../src/index.js';

const processor = postcss([plugin()]);

/**
 * @typedef {{
 *   css: string,
 *   branch: string,
 *   output: string,
 *   reason: string
 * }} FuzzFailure
 */

/**
 * Check invariants for one CSS case.
 *
 * @param {string} css
 * @param {string} branch
 * @return {FuzzFailure | undefined}
 */
function check(css, branch) {
  let output;
  try {
    output = processor.process(css, { from: undefined }).css;
  } catch (error) {
    return {
      css,
      branch,
      output: `THREW: ${error instanceof Error ? error.message : String(error)}`,
      reason: 'Plugin threw an error',
    };
  }

  // 1. PostCSS AST parseability
  try {
    postcss.parse(output);
  } catch (error) {
    return {
      css,
      branch,
      output,
      reason: `Output does not parse as valid PostCSS AST: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 2. Idempotence (processing output again yields identical output)
  try {
    const second = processor.process(output, { from: undefined }).css;
    if (second !== output) {
      return {
        css,
        branch,
        output,
        reason: `Transformation was not idempotent (second pass: ${second})`,
      };
    }
  } catch (error) {
    return {
      css,
      branch,
      output,
      reason: `Second pass threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const violation = checkSemanticInvariants(css, branch, output);
  if (violation) {
    return {
      css,
      branch,
      output,
      reason: violation,
    };
  }

  return undefined;
}

/**
 * @param {string} css
 * @param {string} branch
 * @param {string} output
 * @return {string | undefined}
 */
/** @param {string} css @param {string} output @return {string | undefined} */
function checkAtPropertyInvariants(css, output) {
  if (
    /syntax:\s*['"]<(?:length|length-percentage)>['"]/v.test(css) &&
    /\binitial-value:\s*0px\b/v.test(css) &&
    /\binitial-value:\s*0;/v.test(output)
  ) {
    return '@property initial-value unit was stripped from zero length';
  }
  if (
    /syntax:\s*['"]<(?:percentage|angle-percentage)>['"]/v.test(css) &&
    /\binitial-value:\s*0%\b/v.test(css) &&
    /\binitial-value:\s*0;/v.test(output)
  ) {
    return '@property initial-value percentage was stripped to unitless 0';
  }
  if (
    /syntax:\s*['"]<angle>['"]/v.test(css) &&
    /\binitial-value:\s*0(?:deg|rad)\b/v.test(css) &&
    /\binitial-value:\s*0;/v.test(output)
  ) {
    return '@property initial-value angle unit was stripped to unitless 0';
  }
  return undefined;
}

/** @param {string} css @param {string} output @return {string | undefined} */
function checkFunctionInvariants(css, output) {
  if (
    /\banchor(?:-size)?\([^\)]*0%/v.test(css) &&
    /\banchor(?:-size)?\([^\)]*(?<![0-9.])0(?![%a-z])/v.test(output)
  ) {
    return 'anchor/anchor-size stripped percentage from 0%';
  }
  if (
    /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|palette-mix)\([^\)]*0%/v.test(
      css
    ) &&
    /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|palette-mix)\([^\)]*(?<![0-9.])0(?![%a-z])/v.test(
      output
    )
  ) {
    return 'color function stripped percentage from 0%';
  }
  return undefined;
}

/**
 * @param {string} css
 * @param {string} branch
 * @param {string} output
 * @return {string | undefined}
 */
function checkSemanticInvariants(css, branch, output) {
  if (
    /\b(?:-webkit-)?columns:\s*0px\b/v.test(css) &&
    /\b(?:-webkit-)?columns:\s*0(?:;|\s+[0-9]|$)/v.test(output)
  ) {
    return 'columns zero length unit was stripped to unitless 0';
  }

  if (
    /@(?:-webkit-)?keyframes[\s\S]*?stroke-dasharray:\s*0%/v.test(css) &&
    /\bstroke-dasharray:\s*0;/v.test(output)
  ) {
    return 'nested keyframe stroke-dasharray percentage was stripped to unitless 0';
  }

  if (branch === 'at-property') {
    return checkAtPropertyInvariants(css, output);
  }

  if (branch === 'angle') {
    if (/(?<![0-9.])0rad\b/v.test(css) && !output.includes('0deg')) {
      return '0rad was not converted to 0deg';
    }
    if (/rotate\(\s*0\s*\)/v.test(output)) {
      return 'rotate() stripped angle unit to unitless 0';
    }
  }

  if (
    branch === 'flex' &&
    /\bflex-basis:\s*0px\b/v.test(css) &&
    /\bflex-basis:\s*0;/v.test(output)
  ) {
    return 'flex-basis zero length unit was stripped';
  }

  if (
    branch === 'line-height' &&
    /\b(?:-webkit-)?line-height:\s*0(?:rem|px|%)\b/v.test(css) &&
    /\b(?:-webkit-)?line-height:\s*0;/v.test(output)
  ) {
    return 'line-height zero unit was stripped';
  }

  if (
    /\bfont:\s*[^;]*\/\s*0(?:px|%)\b/v.test(css) &&
    /\bfont:\s*[^;]*\/\s*0(?![%a-z])/v.test(output)
  ) {
    return 'font shorthand zero line-height unit was stripped';
  }

  return checkFunctionInvariants(css, output);
}

/**
 * @param {FuzzFailure} failure
 * @param {number} [seed]
 * @param {number} [index]
 * @return {string}
 */
function report(failure, seed, index) {
  return [
    `seed: ${seed ?? 'unknown'}`,
    `case: ${index ?? 'unknown'}`,
    `branch: ${failure.branch}`,
    `reason: ${failure.reason}`,
    `input:  ${failure.css}`,
    `output: ${failure.output}`,
  ].join('\n');
}

export { check, report };
