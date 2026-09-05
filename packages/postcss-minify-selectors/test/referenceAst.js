import parser from 'postcss-selector-parser';

/**
 * Reference AST oracle using `postcss-selector-parser`.
 * Bounded strictly to the Selectors Level 3 / Level 4 subset supported by
 * `postcss-selector-parser` (standard combinators, compounds, basic functional pseudos).
 * Modern Level 4+ constructs (such as `:dir()`, `:lang()`, `:state()`,
 * and `::view-transition-*()`) are tested via focused spec-derived assertions in
 * `characterization.js` and `wptInspired.js` rather than this reference oracle.
 */
const selectorParser = parser();
const selectorPseudos = new Set([':is', ':not', ':has', ':where']);
const pseudoElements = new Set([
  'after',
  'before',
  'first-letter',
  'first-line',
  'marker',
  'placeholder',
  'selection',
  'backdrop',
  'file-selector-button',
  'target-text',
  'cue',
  'details-content',
  'view-transition',
  'grammar-error',
  'spelling-error',
]);
const safePseudos = new Set(['hover', 'focus', 'active', 'visited', 'link']);

/** @param {string} source @return {import('postcss-selector-parser').Root} */
function parse(source) {
  return selectorParser.astSync(source);
}

/** @param {import('postcss-selector-parser').Node} node @return {[number, number, number]} */
function pseudoSpecificity(node) {
  const name = node.value.toLowerCase().replace(/^::?/u, '');
  if (node.value.startsWith('::') || pseudoElements.has(name)) {
    if (name === 'slotted' && node.nodes?.length) {
      let maximum = [0, 0, 0];
      for (const selector of node.nodes) {
        maximum = maxSpecificity(maximum, specificity(selector));
      }
      return add([0, 0, 1], maximum);
    }
    return [0, 0, 1];
  }
  if (name === 'where') return [0, 0, 0];
  if (selectorPseudos.has(`:${name}`)) {
    let maximum = [0, 0, 0];
    for (const selector of node.nodes) {
      maximum = maxSpecificity(maximum, specificity(selector));
    }
    return maximum;
  }
  if (name.startsWith('nth-') && node.nodes.length > 1) {
    const formula = node.nodes[0].toString();
    const of = /\bof\s+(.+)$/iu.exec(formula);
    if (!of) return [0, 1, 0];
    let maximum = specificity(parse(of[1]).first);
    for (const selector of node.nodes.slice(1)) {
      maximum = maxSpecificity(maximum, specificity(selector));
    }
    return add([0, 1, 0], maximum);
  }
  return [0, 1, 0];
}

/** @param {import('postcss-selector-parser').Node} node @return {[number, number, number]} */
function addSpecificity(node) {
  if (node.type === 'id') return [1, 0, 0];
  if (node.type === 'class' || node.type === 'attribute') return [0, 1, 0];
  if (node.type === 'tag') return [0, 0, 1];
  if (node.type !== 'pseudo') return [0, 0, 0];
  return pseudoSpecificity(node);
}

/** @param {import('postcss-selector-parser').Container} selector @return {[number, number, number]} */
function specificity(selector) {
  let total = [0, 0, 0];
  for (const node of selector.nodes) total = add(total, addSpecificity(node));
  return total;
}

/** @param {[number, number, number]} a @param {[number, number, number]} b @return {[number, number, number]} */
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** @param {[number, number, number]} a @param {[number, number, number]} b @return {[number, number, number]} */
function maxSpecificity(a, b) {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? a : b;
  }
  return a;
}

/** @param {string} source @return {string} */
function referenceSpecificity(source) {
  const root = parse(source);
  if (root.nodes.length !== 1)
    throw new Error(`expected one selector: ${source}`);
  return specificity(root.first).join(',');
}

/** @param {string} source @return {{compounds: string[], combinators: string[]}} */
function compoundBoundaries(source) {
  const selector = parse(source).first;
  const compounds = [''];
  const combinators = [];
  for (const node of selector.nodes) {
    if (node.type === 'combinator') {
      combinators.push(node.toString().trim() || ' ');
      compounds.push('');
    } else {
      compounds[compounds.length - 1] += node.toString();
    }
  }
  return { compounds, combinators };
}

/** @param {import('postcss-selector-parser').Node} node @return {boolean} */
function unsafeNode(node) {
  if (node.type === 'nesting' || node.type === 'combinator') return true;
  if (node.type === 'attribute' && node.insensitive) return true;
  if ((node.type === 'universal' || node.type === 'tag') && node.namespace)
    return true;
  if (node.type !== 'pseudo') return false;
  const name = node.value.toLowerCase().replace(/^::?/u, '');
  if (node.value.startsWith('::') || pseudoElements.has(name)) return true;
  if (node.nodes.length > 0) return true;
  return !safePseudos.has(name);
}

/** @param {string} source @return {{safe: boolean, specificity: string, hasNthOf: boolean}} */
function classifyFoldCandidate(source) {
  const root = parse(source);
  if (root.nodes.length !== 1)
    throw new Error(`expected one selector: ${source}`);
  const selector = root.first;
  const hasNthOf = selector.nodes.some(
    (node) =>
      node.type === 'pseudo' &&
      node.value.toLowerCase().startsWith(':nth-') &&
      node.nodes.some((child) => /\bof\s/iu.test(child.toString()))
  );
  const safe =
    selector.nodes.length > 0 &&
    selector.nodes.every((node) => !unsafeNode(node));
  return { safe, specificity: specificity(selector).join(','), hasNthOf };
}

/** @param {string} source @return {boolean} */
function parsesSelectorList(source) {
  try {
    parse(source);
    return true;
  } catch {
    return false;
  }
}

export {
  classifyFoldCandidate,
  compoundBoundaries,
  parsesSelectorList,
  referenceSpecificity,
};
