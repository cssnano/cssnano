import postcss from 'postcss';
import minifySelectors from '../../../src/plugins/postcss-minify-selectors/index.js';
import { oneStagePlugin } from '../../../../../util/testHelpers.js';
import jsdom from 'jsdom';
import selectorParser from 'postcss-selector-parser';
import { shrink } from './fuzzGenerate.js';

const { JSDOM } = jsdom;
const plugin = oneStagePlugin(minifySelectors);
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

/* Pseudo-elements that CSS 2 wrote with a single colon. */
const legacyPseudoElements = new Set([
  ':before',
  ':after',
  ':first-line',
  ':first-letter',
]);

/**
 * @param {selectorParser.Node} node
 * @return {string | undefined} the pseudo-element name in its `::` form
 */
function pseudoElementName(node) {
  if (node.type !== 'pseudo') return undefined;
  const name = node.value.toLowerCase();
  if (name.startsWith('::')) return name;
  return legacyPseudoElements.has(name) ? `:${name}` : undefined;
}

/**
 * The text a pseudo-element match is keyed on: names in canonical case,
 * arguments as written but without surrounding whitespace.
 *
 * @param {selectorParser.Node} node
 * @return {string}
 */
function keyText(node) {
  if (node.type !== 'pseudo') return node.toString().trim();
  const name = pseudoElementName(node) ?? node.value.toLowerCase();
  if (node.nodes.length === 0) return name;
  return `${name}(${node.nodes.map((arg) => arg.toString().trim()).join(',')})`;
}

/**
 * Removes the pseudo-element of the subject compound, with any pseudo-classes
 * that qualify it, leaving a selector for its originating element.
 *
 * @param {selectorParser.Selector} complex
 * @return {string} key text of what was removed ('' for no pseudo-element)
 */
function detachPseudoElement(complex) {
  const { nodes } = complex;
  let start = nodes.length;
  for (
    let i = nodes.length - 1;
    i >= 0 && nodes[i].type !== 'combinator';
    i--
  ) {
    if (pseudoElementName(nodes[i]) !== undefined) start = i;
  }
  if (start === nodes.length) return '';
  const detached = nodes.slice(start);
  for (const node of detached) node.remove();
  // A pseudo-element with no compound before it applies to any element.
  if (complex.last === undefined || complex.last.type === 'combinator') {
    complex.append(selectorParser.universal());
  }
  return detached.map(keyText).join('');
}

/**
 * querySelectorAll does not accept CSS namespace prefixes, so a type or
 * universal selector in a generated namespace becomes a match on the
 * attribute that marks its elements.
 *
 * @param {selectorParser.Root} root
 * @return {void}
 */
function translateNamespaces(root) {
  /** @type {(selectorParser.Tag | selectorParser.Universal)[]} */
  const qualified = [];
  root.walk((node) => {
    if (
      (node.type === 'tag' || node.type === 'universal') &&
      typeof node.namespace === 'string' &&
      namespaceUris.has(node.namespace)
    ) {
      qualified.push(node);
    }
  });
  for (const node of qualified) {
    const marker = selectorParser.attribute({
      attribute: 'data-fz-namespace',
      operator: '=',
      value: /** @type {string} */ (node.namespace),
      quoteMark: '"',
      raws: {},
    });
    // The attribute must follow the type selector: `[a]*` is not valid.
    if (node.type === 'tag') {
      node.replaceWith(selectorParser.tag({ value: node.value }), marker);
    } else {
      node.replaceWith(marker);
    }
  }
}

/**
 * Groups the complex selectors of a list by the pseudo-element they end in,
 * each rewritten to a queryable selector for its originating element.
 * querySelectorAll never matches a pseudo-element, so querying the
 * originating elements is what lets the oracle notice a changed compound
 * before one.
 *
 * @param {string} selector
 * @return {Map<string, string>} pseudo-element key ('' for none) →
 * originating selector list
 */
function originatingSelectors(selector) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  selectorParser((root) => {
    translateNamespaces(root);
    for (const complex of root.nodes) {
      const key = detachPseudoElement(complex);
      const group = groups.get(key) ?? [];
      group.push(complex.toString().trim());
      groups.set(key, group);
    }
  }).processSync(selector);
  return new Map(groups.entries().map(([key, list]) => [key, list.join(',')]));
}

/** @param {unknown} error @return {string} */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Builds a jsdom document from generated tree markup, runs the selector
 * against it pre- and post-minification, returns matched element tracking-id
 * sets. Elements are identified by their `data-fz` attribute rather than
 * `id`, since generated ids are drawn from a small shared pool and are not
 * unique; a pseudo-element match appends its key, as in `3::before`.
 *
 * @param {string} selector
 * @param {{html: string, css: string}} tree
 * @return {{ids: Set<string>, error?: string}}
 */
function matchElements(selector, tree) {
  sharedDocument.head.innerHTML = `<style>${tree.css}</style>`;
  sharedDocument.body.innerHTML = tree.html;

  // Mark the namespaced elements for the attribute selectors that stand in
  // for namespace prefixes.
  for (const element of sharedDocument.querySelectorAll('*')) {
    for (const [prefix, uri] of namespaceUris) {
      if (element.namespaceURI === uri) {
        element.setAttribute('data-fz-namespace', prefix);
        break;
      }
    }
  }

  let groups;
  try {
    groups = originatingSelectors(selector);
  } catch (error) {
    return {
      ids: new Set(),
      error: `selector parser rejected it: ${messageOf(error)}`,
    };
  }
  /** @type {Set<string>} */
  const ids = new Set();
  try {
    for (const [key, querySelector] of groups) {
      for (const element of sharedDocument.querySelectorAll(querySelector)) {
        const id = element.getAttribute('data-fz');
        if (id !== null) ids.add(`${id}${key}`);
      }
    }
  } catch (error) {
    return {
      ids: new Set(),
      error: `querySelectorAll threw: ${messageOf(error)}`,
    };
  }
  return { ids };
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
  const pre = matchElements(selector, tree);
  if (pre.error !== undefined) {
    return {
      input: rule,
      output,
      reason: `pre-minify ${pre.error}`,
      preIds: pre.ids,
      postIds: new Set(),
    };
  }

  const post = matchElements(outputSelector, tree);
  if (post.error !== undefined) {
    return {
      input: rule,
      output,
      reason: `post-minify ${post.error}`,
      preIds: pre.ids,
      postIds: post.ids,
    };
  }

  if (
    pre.ids.size !== post.ids.size ||
    ![...pre.ids].every((id) => post.ids.has(id))
  ) {
    return {
      input: rule,
      output,
      reason: 'match set changed',
      preIds: pre.ids,
      postIds: post.ids,
    };
  }

  return undefined;
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
 * @return {Mismatch | undefined}
 */
function checkMinimised(rule, tree) {
  const failure = check(rule, tree);

  return failure === undefined ? undefined : minimize(failure, tree);
}

export { checkMinimised, matchElements, report };
