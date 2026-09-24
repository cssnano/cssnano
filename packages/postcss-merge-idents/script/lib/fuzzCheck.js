import postcss from 'postcss';
import cssnanoUtils from 'cssnano-utils';
import plugin from '../../src/index.js';

const { asciiLowerCase } = cssnanoUtils;

const processor = postcss([plugin()]);

/**
 * @typedef {{
 *   type: string,
 *   css: string,
 *   output?: string,
 *   output2?: string,
 *   message: string
 * }} FuzzFailure
 */

/**
 * @param {import('./fuzzGenerate.js').FuzzCase} testCase
 * @return {FuzzFailure | undefined}
 */
export function check(testCase) {
  let output;
  try {
    output = processor.process(testCase.css, { from: undefined }).css;
  } catch (err) {
    return {
      type: 'crash',
      css: testCase.css,
      message: `Crashed on process: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let output2;
  try {
    output2 = processor.process(output, { from: undefined }).css;
  } catch (err) {
    return {
      type: 'crash-pass2',
      css: testCase.css,
      output,
      message: `Crashed on second pass: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (output !== output2) {
    return {
      type: 'idempotency',
      css: testCase.css,
      output,
      output2,
      message: 'Output is not idempotent after two passes',
    };
  }

  try {
    postcss.parse(output);
  } catch (err) {
    return {
      type: 'invalid-css',
      css: testCase.css,
      output,
      message: `Output failed to parse: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return checkInvariants(testCase, output);
}

/**
 * Collects the bodies defined per normalized at-rule name. Vendor prefixed
 * spellings are their own families, exactly as the plugin treats them.
 *
 * @param {import('postcss').Root} root
 * @return {Map<string, Map<string, number>>} name → body → count
 */
function collectDefinitions(root) {
  /** @type {Map<string, Map<string, number>>} */
  const families = new Map();
  root.walkAtRules((atRule) => {
    const name = asciiLowerCase(atRule.name);
    if (!name.endsWith('keyframes') && !name.endsWith('counter-style')) {
      return;
    }
    const body = atRule.nodes ? atRule.nodes.toString() : '';
    let byBody = families.get(name);
    if (!byBody) {
      byBody = new Map();
      families.set(name, byBody);
    }
    byBody.set(body, (byBody.get(body) ?? 0) + 1);
  });
  return families;
}

/**
 * @param {string} css
 * @return {Map<string, Map<string, number>> | undefined}
 */
function collectDefinitionsWithoutThrowing(css) {
  try {
    return collectDefinitions(postcss.parse(css, { from: undefined }));
  } catch {
    return undefined;
  }
}

/**
 * A name defined with two or more different bodies is never a merge
 * candidate, so every body defined for it must survive. Losing one would
 * change which definition a reference binds to — the dashed-ident and
 * cascade-layer regressions this guards just look like removals.
 *
 * @param {string} css
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkConflictingDefinitions(css, output) {
  const before = collectDefinitionsWithoutThrowing(css);
  if (!before) {
    return undefined;
  }
  const after = collectDefinitionsWithoutThrowing(output);
  if (!after) {
    return undefined;
  }

  for (const [name, bodiesBefore] of before) {
    if (bodiesBefore.size < 2) {
      continue;
    }
    const bodiesAfter = after.get(name);
    for (const body of bodiesBefore.keys()) {
      if (!bodiesAfter?.has(body)) {
        return {
          type: 'conflicting-definition-removed',
          css,
          output,
          message: `A body of @${name} that conflicted with another definition was removed: ${body}`,
        };
      }
    }
  }
  return undefined;
}

/**
 * @param {import('./fuzzGenerate.js').FuzzCase} testCase
 * @param {string} output
 * @return {FuzzFailure | undefined}
 */
function checkInvariants(testCase, output) {
  if (
    testCase.css.includes('--animation:') &&
    !output.includes('--animation:')
  ) {
    return {
      type: 'custom-property-mangled',
      css: testCase.css,
      output,
      message: 'Custom property --animation was mangled or removed',
    };
  }

  if (
    testCase.css.includes('animation-fill-mode:') &&
    !output.includes('animation-fill-mode:')
  ) {
    return {
      type: 'protected-property-mangled',
      css: testCase.css,
      output,
      message: 'Protected property animation-fill-mode was mangled or removed',
    };
  }

  for (const kw of ['replace', 'add', 'accumulate']) {
    if (
      testCase.css.includes(` 1s forwards ${kw}`) &&
      !output.includes(` ${kw}`)
    ) {
      return {
        type: 'composition-keyword-mangled',
        css: testCase.css,
        output,
        message: `Animation composition keyword ${kw} was mangled`,
      };
    }
  }

  if (
    testCase.css.includes(' 1s forwards') &&
    testCase.css.includes('--timeline') &&
    !output.includes('--timeline')
  ) {
    return {
      type: 'timeline-dashed-ident-mangled',
      css: testCase.css,
      output,
      message: 'Timeline dashed ident --timeline in shorthand was mangled',
    };
  }

  for (const invalid of ['extra', '123']) {
    if (
      !testCase.css.includes(`animation:spin ${invalid}`) &&
      output.includes(`animation:spin ${invalid}`)
    ) {
      return {
        type: 'invalid-atrule-target-injected',
        css: testCase.css,
        output,
        message:
          'Invalid multi-token at-rule target was injected into animation declaration',
      };
    }
  }

  if (
    testCase.decl !== undefined &&
    testCase.decl !== '' &&
    !output.includes(testCase.decl)
  ) {
    return {
      type: 'scoped-reference-rewritten',
      css: testCase.css,
      output,
      message: `A reference blocked by its own scope was rewritten: ${testCase.decl}`,
    };
  }

  for (const dashed of ['--timeline', '--scroll']) {
    const defined = new RegExp(`@(?:[a-z]+-)?keyframes ${dashed}\\{`, 'v');
    if (defined.test(testCase.css) && !defined.test(output)) {
      return {
        type: 'dashed-ident-atrule-removed',
        css: testCase.css,
        output,
        message: `The dashed-ident at-rule @keyframes ${dashed} was removed`,
      };
    }
  }

  return checkConflictingDefinitions(testCase.css, output);
}

/**
 * @param {FuzzFailure} failure
 * @param {number} [seed]
 * @return {string}
 */
export function report(failure, seed) {
  const seedInfo = seed !== undefined ? ` (seed ${seed})` : '';
  return `Fuzz failure: ${failure.type}${seedInfo}\nMessage: ${failure.message}\nInput:\n${failure.css}\nOutput:\n${failure.output ?? ''}`;
}
