import { random } from '../../../../util/fuzzRng.js';
import { computedStyles } from './cascadeOracle.js';
import { processBatched } from './fuzzCrossBlock.js';

/**
 * @typedef {import('./cascadeOracle.js').Environment} Environment
 * @typedef {{css: string, branches: string[]}} CascadeCase
 */

const lengths = ['0', '1px'];
const colors = ['red', 'blue'];
// Weighted by repetition: the properties that relate to others come often.
/** @type {[string, string[]][]} */
const generatedProperties = [
  ['color', colors],
  ['color', colors],
  ['top', lengths],
  ['margin', lengths],
  ['margin-top', lengths],
  ['margin-left', lengths],
  ['margin-block-start', lengths],
  ['margin-inline', lengths],
  ['margin-inline-start', lengths],
  ['background', colors],
  ['background-color', colors],
  ['direction', ['ltr', 'rtl']],
  ['--v', colors],
];
// Near misses: names that differ from a generated name only in case, which
// matters for custom properties alone, and a reset of everything.
/** @type {[string, string[], string][]} */
const rareProperties = [
  ['COLOR', colors, 'property-case'],
  ['--V', colors, 'custom-case'],
  ['all', ['unset', 'initial'], 'all'],
];
const selectors = [
  '.a',
  '.b',
  '.c',
  '.a.b',
  '.b.c',
  '#i',
  '.c#i',
  'div',
  'span',
  'span.a',
  'div.c',
];
// Rule-less at-rules: a `@layer` statement fixes layer order, so nothing may
// move across it; `@font-face` sets no element style.
const separators = [
  ['@layer l2,l1;', 'layer-statement'],
  ['@layer l1;', 'layer-statement'],
  ['@font-face{font-family:x}', 'barrier'],
];
const wrappers = [
  ['@media print', 'media'],
  ['@supports (color:red)', 'supports'],
  ['@layer l1', 'layer-block'],
  ['@layer l2', 'layer-block'],
];
const branchesToCover = [
  'repeated-block',
  'superset-block',
  'subset-block',
  'selector-list',
  'compound',
  'id',
  'type',
  'important',
  'important-case',
  'invalid-value',
  'shorthand',
  'logical',
  'direction',
  'all',
  'property-case',
  'custom-case',
  'media',
  'supports',
  'layer-block',
  'layer-statement',
  'barrier',
];

/**
 * @param {ReturnType<typeof random>} rng
 * @param {Set<string>} branches
 * @return {string}
 */
function generateDeclaration(rng, branches) {
  let [prop, pool] = rng.pick(generatedProperties);
  if (rng.chance(0.06)) {
    const [rareProp, rarePool, branch] = rng.pick(rareProperties);
    [prop, pool] = [rareProp, rarePool];
    branches.add(branch);
  }
  if (prop === 'direction') branches.add('direction');
  if (prop.includes('inline') || prop.includes('block'))
    branches.add('logical');
  if (prop === 'margin' || prop === 'background') branches.add('shorthand');
  // A value from another property's grammar makes the declaration invalid;
  // a value-agnostic merge must still keep it in place.
  let value = rng.pick(pool);
  if (rng.chance(0.05)) {
    value = rng.pick([...lengths, ...colors]);
    branches.add('invalid-value');
  }
  let important = '';
  if (rng.chance(0.1)) {
    important = rng.chance(0.2) ? '!IMPORTANT' : '!important';
    branches.add(important === '!important' ? 'important' : 'important-case');
  }
  return `${prop}:${value}${important}`;
}

/**
 * A declaration list that often repeats an earlier one, whole, with one more
 * declaration, or with one fewer: the shapes that rules can share.
 *
 * @param {ReturnType<typeof random>} rng
 * @param {string[][]} earlier
 * @param {Set<string>} branches
 * @return {string[]}
 */
function generateBody(rng, earlier, branches) {
  if (earlier.length > 0 && rng.chance(0.45)) {
    const base = rng.pick(earlier);
    const variant = rng.int(4);
    if (variant === 0) {
      const at = rng.int(base.length + 1);
      branches.add('superset-block');
      return base.toSpliced(at, 0, generateDeclaration(rng, branches));
    }
    if (variant === 1 && base.length > 1) {
      branches.add('subset-block');
      return base.toSpliced(rng.int(base.length), 1);
    }
    branches.add('repeated-block');
    return base;
  }
  return Array.from({ length: 1 + rng.int(3) }, () =>
    generateDeclaration(rng, branches)
  );
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {Set<string>} branches
 * @return {string}
 */
function generateSelectorList(rng, branches) {
  const list = [
    ...new Set(
      Array.from({ length: rng.chance(0.25) ? 2 : 1 }, () =>
        rng.pick(selectors)
      )
    ),
  ];
  if (list.length > 1) branches.add('selector-list');
  for (const selector of list) {
    if (selector.includes('#')) branches.add('id');
    if (/^[a-z]/v.test(selector)) branches.add('type');
    if (/.[.#]/v.test(selector)) branches.add('compound');
  }
  return list.join(',');
}

/**
 * Stylesheets of rules whose selectors match overlapping sets of elements at
 * different specificities and whose declarations repeat, relate as shorthand
 * and longhand or logical and physical, or conflict, inside conditional
 * rules and cascade layers, with each case's grammar branches.
 *
 * @param {number} seed
 * @param {number} count
 * @return {CascadeCase[]}
 */
export function generateCascadeCases(seed, count) {
  const rng = random(seed);
  return Array.from({ length: count }, () => {
    /** @type {Set<string>} */
    const branches = new Set();
    /** @type {string[][]} */
    const bodies = [];
    let css = '';
    for (let rules = 3 + rng.int(8); rules > 0; rules--) {
      if (rng.chance(0.08)) {
        const [separator, branch] = rng.pick(separators);
        css += separator;
        branches.add(branch);
      }
      const body = generateBody(rng, bodies, branches);
      bodies.push(body);
      const rule = `${generateSelectorList(rng, branches)}{${body.join(';')}}`;
      if (rng.chance(0.25)) {
        const [wrapper, branch] = rng.pick(wrappers);
        css += `${wrapper}{${rule}}`;
        branches.add(branch);
      } else {
        css += rule;
      }
    }
    return { css, branches: [...branches].toSorted() };
  });
}

/**
 * Throws unless every grammar branch occurs and nearly every case differs.
 *
 * @param {CascadeCase[]} cases
 * @return {void}
 */
export function assertCascadeCoverage(cases) {
  const seen = new Set(cases.flatMap((item) => item.branches));
  for (const branch of branchesToCover) {
    if (!seen.has(branch)) throw new Error(`missing branch: ${branch}`);
  }
  const distinct = new Set(cases.map((item) => item.css)).size;
  if (distinct < cases.length * 0.95) {
    throw new Error(`missing diversity: ${distinct} of ${cases.length}`);
  }
}

/** @type {[string, Environment][]} */
const environments = [
  ['screen ltr', { print: false, direction: 'ltr' }],
  ['print ltr', { print: true, direction: 'ltr' }],
  ['screen rtl', { print: false, direction: 'rtl' }],
  ['print rtl', { print: true, direction: 'rtl' }],
];

/**
 * The first element, environment and property whose value differs, or
 * undefined if every computed style is the same.
 *
 * @param {string} before
 * @param {string} after
 * @return {string | undefined}
 */
function firstStyleDifference(before, after) {
  for (const [environmentName, environment] of environments) {
    const expected = computedStyles(before, environment);
    const actual = computedStyles(after, environment);
    for (const [element, style] of expected) {
      const other = actual.get(element) ?? {};
      for (const slot of new Set([
        ...Object.keys(style),
        ...Object.keys(other),
      ])) {
        if (style[slot] !== other[slot]) {
          return `${element} ${environmentName} ${slot}: ${style[slot]} -> ${other[slot]}`;
        }
      }
    }
  }
  return undefined;
}

/**
 * Checks one stylesheet against the properties a merge must preserve: it
 * terminates, every element keeps every computed value in every
 * environment, the output does not grow, and a second pass changes nothing.
 *
 * @param {string} css
 * @param {(css: string) => {css: string | undefined, terminated: boolean}} run
 * @param {(css: string) => number} [measure] the length of a stylesheet as the
 * plugin processed it
 * @return {{reason: string, input: string, output?: string, detail?: string} | undefined}
 */
export function checkCascade(css, run, measure = (text) => text.length) {
  const first = run(css);
  if (first.terminated || first.css === undefined) {
    return { reason: 'did not terminate', input: css };
  }
  const output = first.css;
  const detail = firstStyleDifference(css, output);
  if (detail) {
    return { reason: 'computed style changed', input: css, output, detail };
  }
  if (measure(output) > measure(css)) {
    return { reason: 'output grew', input: css, output };
  }
  const second = run(output);
  if (second.terminated || second.css !== output) {
    return { reason: 'second pass changed the output', input: css, output };
  }
  return undefined;
}

/**
 * Lengthens every generated class name by `suffix`. The generated
 * stylesheets use the classes `a`, `b` and `c` and no other dot, so a plain
 * replacement reaches exactly the class selectors.
 *
 * @param {string} css
 * @param {string} suffix
 * @return {string}
 */
function lengthenClasses(css, suffix) {
  if (!suffix) return css;
  let text = css;
  for (const name of ['a', 'b', 'c']) {
    text = text.replaceAll(`.${name}`, `.${name}${suffix}`);
  }
  return text;
}

/**
 * Checks `cases` in child processes, a chunk at a time, and returns the
 * first failure with the index of its case.
 *
 * A `classSuffix` lengthens the class names the plugin sees, so that sharing
 * declarations between two rules rarely pays and rules join in larger
 * groups. The oracle reads the outputs with the suffix removed.
 *
 * @param {CascadeCase[]} cases
 * @param {number} [chunkSize]
 * @param {string} [classSuffix] lowercase letters that no generated name contains
 * @return {(NonNullable<ReturnType<typeof checkCascade>> & {index: number}) | undefined}
 */
export function firstCascadeFailure(cases, chunkSize = 100, classSuffix = '') {
  const lengthen = (/** @type {string} */ css) =>
    lengthenClasses(css, classSuffix);
  const shorten = (/** @type {string} */ css) =>
    classSuffix ? css.replaceAll(classSuffix, '') : css;
  const measure = (/** @type {string} */ css) => lengthen(css).length;
  for (let start = 0; start < cases.length; start += chunkSize) {
    const chunk = cases.slice(start, start + chunkSize).map((item) => item.css);
    const first = processBatched(chunk.map(lengthen));
    const outputs = [...first.values()].flatMap(({ css }) =>
      css ? [css] : []
    );
    const second = processBatched(outputs);
    const run = (/** @type {string} */ css) => {
      const result = first.get(lengthen(css)) ??
        second.get(lengthen(css)) ?? { css: undefined, terminated: true };
      return result.css === undefined
        ? result
        : { ...result, css: shorten(result.css) };
    };
    for (const [offset, css] of chunk.entries()) {
      const failure = checkCascade(css, run, measure);
      if (failure) return { ...failure, index: start + offset };
    }
  }
  return undefined;
}
