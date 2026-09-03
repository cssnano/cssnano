import postcss from 'postcss';
import plugin from '../../src/index.js';
import jsdom from 'jsdom';
import { shrink } from './fuzzGenerate.js';

const { JSDOM } = jsdom;
const namespaceUris = new Map([
  ['svg', 'http://www.w3.org/2000/svg'],
  ['math', 'http://www.w3.org/1998/Math/MathML'],
]);
// One window is reused for every case: building a fresh JSDOM per query is the
// dominant allocation, and never closing them lets the heap grow to the 4GB
// limit on a long soak. Re-injecting each tree's markup keeps the match set
// identical while keeping memory bounded.
const sharedDocument = new JSDOM('<!DOCTYPE html>').window.document;

/**
 * Runs the minify-selectors plugin and verifies match set identity before/after.
 */

/**
 * Applies the plugin to a CSS selector.
 *
 * @param {string} css
 * @return {string}
 */
function process(css) {
  try {
    return postcss([plugin()]).process(css, { from: undefined }).css;
  } catch (error) {
    throw new Error(`plugin threw: ${error.message}`, { cause: error });
  }
}

/**
 * Builds a jsdom document from generated tree markup, runs the selector
 * against it pre- and post-minification, returns matched element tracking-id
 * sets. Elements are identified by their `data-fz` attribute rather than
 * `id`, since generated ids are drawn from a small shared pool and are not
 * unique.
 *
 * @param {string} selector
 * @param {{html: string, css: string}} tree
 * @return {{ids: Set<string>, valid: boolean}}
 */
function matchElements(selector, tree) {
  sharedDocument.head.innerHTML = `<style>${tree.css}</style>`;
  sharedDocument.body.innerHTML = tree.html;

  // querySelectorAll does not accept CSS namespace prefixes. Mark the
  // namespaced elements and translate only generated namespace-qualified
  // simple selectors to an equivalent, queryable compound selector.
  for (const element of sharedDocument.querySelectorAll('*')) {
    for (const [prefix, uri] of namespaceUris) {
      if (element.namespaceURI === uri) {
        element.setAttribute('data-fz-namespace', prefix);
        break;
      }
    }
  }
  const querySelector = selector.replace(
    /\b(svg|math)\|(?=[\w*-])/gu,
    '[data-fz-namespace="$1"]'
  );

  try {
    const elements = sharedDocument.querySelectorAll(querySelector);
    return {
      ids: new Set(
        Array.from(elements)
          .map((el) => el.getAttribute('data-fz'))
          .filter((value) => value !== null)
      ),
      valid: true,
    };
  } catch {
    return { ids: new Set(), valid: false };
  }
}

/**
 * @typedef {{ input: string, output: string, reason: string, preIds: Set<string>, postIds: Set<string> }} Mismatch
 */

/**
 * Runs the plugin, compares match sets before/after.
 *
 * @param {string} rule
 * @param {{html: string, css: string}} tree
 * @return {Mismatch | undefined}
 */
function check(rule, tree) {
  const selector = rule.split('{')[0].trim();

  let output;
  try {
    output = process(`${rule}`);
  } catch (error) {
    return {
      input: rule,
      output: '',
      reason: error.message,
      preIds: new Set(),
      postIds: new Set(),
    };
  }

  const outputSelector = output.split('{')[0].trim();
  const preIds = matchElements(selector, tree);
  const postIds = matchElements(outputSelector, tree);

  if (preIds.valid !== postIds.valid) {
    return {
      input: rule,
      output,
      reason: 'selector validity changed',
      preIds: preIds.ids,
      postIds: postIds.ids,
    };
  }
  if (
    !preIds.valid ||
    (preIds.ids.size === postIds.ids.size &&
      [...preIds.ids].every((id) => postIds.ids.has(id)))
  ) {
    return undefined;
  }

  return {
    input: rule,
    output,
    reason: 'match set changed',
    preIds: preIds.ids,
    postIds: postIds.ids,
  };
}

/**
 * @param {string} rule
 * @param {{html: string, css: string}} tree
 * @param {(css: string) => Mismatch | undefined} predicate
 * @return {string}
 */
function shrinkRule(rule, tree, predicate) {
  return shrink(rule, (candidate) => predicate(candidate, tree) !== undefined);
}

/**
 * Shrink a failure to a minimal test case.
 *
 * @param {Mismatch} failure
 * @param {{html: string, css: string}} tree
 * @return {Mismatch}
 */
function minimize(failure, tree) {
  const shrunk = shrinkRule(failure.input, tree, check);
  return check(shrunk, tree) || failure;
}

/**
 * Format a human-readable failure report.
 *
 * @param {Mismatch} failure
 * @param {number} seed
 * @return {string}
 */
function report(failure, seed) {
  const lines = [
    `Seed: ${seed}`,
    `Reason: ${failure.reason}`,
    '',
    'Input:',
    failure.input,
    '',
    'Output:',
    failure.output,
    '',
    'Pre-minify matches:  ' + [...failure.preIds].toSorted().join(', '),
    'Post-minify matches: ' + [...failure.postIds].toSorted().join(', '),
  ];

  return lines.join('\n');
}

/**
 * Check with shrinking on failure.
 *
 * @param {string} rule
 * @param {{html: string, css: string}} tree
 * @return {{failure: Mismatch | undefined, seed: number}}
 */
function checkMinimised(rule, tree, seed) {
  const failure = check(rule, tree);

  if (failure === undefined) {
    return { failure: undefined, seed };
  }

  return { failure: minimize(failure, tree), seed };
}

export { checkMinimised, report };
