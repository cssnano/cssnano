import { REFERENCE, keywordTerminals } from '../../../../util/webref.mjs';

/**
 * Derives, from the raw `@webref/css` data, the keyword sets and function
 * argument slots the plugin needs to know which identifiers are safe to
 * merge. Kept free of I/O so that it can be unit tested.
 *
 * The predefined counter style names (CSS Counter Styles Level 3 §6) are
 * specified in prose rather than in any grammar, so they cannot come from
 * here and stay hand-written in the plugin.
 *
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax] Value grammar, absent when a spec only defines
 * the term in prose.
 *
 * @typedef {WebrefDefinition & {
 *   legacyAliasOf?: string,
 *   longhands?: string[],
 *   resetLonghands?: string[]
 * }} WebrefProperty
 *
 * @typedef {WebrefDefinition & {
 *   descriptors?: WebrefDefinition[]
 * }} WebrefAtRule
 *
 * @typedef {object} WebrefData
 * @property {WebrefProperty[]} properties
 * @property {WebrefAtRule[]} atrules
 * @property {WebrefDefinition[]} types
 * @property {WebrefDefinition[]} functions
 *
 * @typedef {object} MergeIdents
 * @property {string[]} cssWideKeywords Keywords no custom identifier can be,
 * whatever the property.
 * @property {{ shorthandKeywords: string[] }} keyframes Keywords an animation
 * shorthand can hold, which a keyframes name would be ambiguous with.
 * @property {{
 *   keywords: string[],
 *   functions: Map<string, number[]>
 * }} counterStyle Keywords a list style value or counter style descriptor can
 * hold, and where in the counter functions the style argument sits.
 */

/** @type {string[]} */
const CSS_WIDE_KEYWORD_EXPECTATIONS = [
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'revert-rule',
  'unset',
];

/** @type {string[]} */
const KEYFRAMES_SHORTHAND_KEYWORD_EXPECTATIONS = [
  'alternate',
  'alternate-reverse',
  'auto',
  'backwards',
  'both',
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'forwards',
  'infinite',
  'linear',
  'none',
  'normal',
  'paused',
  'reverse',
  'running',
  'step-end',
  'step-start',
];

/** @type {string[]} */
const COUNTER_STYLE_KEYWORD_EXPECTATIONS = [
  'additive',
  'alphabetic',
  'auto',
  'bullets',
  'cyclic',
  'extends',
  'fixed',
  'inside',
  'none',
  'numbers',
  'numeric',
  'outside',
  'spell-out',
  'symbolic',
  'words',
];

/**
 * The productions a grammar names directly, without following them any
 * further. Property references are returned quoted, the way they are spelled,
 * so that `<'color'>` cannot be mistaken for `<color>`.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function directReferences(syntax) {
  /** @type {string[]} */
  const references = [];
  for (const [, property, type] of syntax.matchAll(REFERENCE)) {
    references.push(property === undefined ? type : `'${property}'`);
  }
  return references;
}

/**
 * The keyword alternatives a grammar offers at its own level, ignoring
 * anything that is a reference to another production.
 *
 * @param {string | undefined} syntax
 * @return {string[]}
 */
function keywordsOf(syntax) {
  if (!syntax) {
    return [];
  }
  return syntax
    .split('|')
    .map((alternative) => alternative.trim())
    .filter((alternative) => /^[a-z][a-z\-]*$/v.test(alternative))
    .toSorted();
}

/**
 * Splits a function's grammar into its comma separated arguments, e.g.
 * `counters( <counter-name>, <string>, <counter-style>? )` into three. Commas
 * nested in a group belong to that group rather than to the argument list.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function functionArguments(syntax) {
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close < open) {
    return [];
  }
  const body = syntax.slice(open + 1, close);
  /** @type {string[]} */
  const args = [];
  let depth = 0;
  let current = '';
  for (const character of body) {
    if (character === '[' || character === '(') {
      depth++;
    } else if (character === ']' || character === ')') {
      depth--;
    }
    if (character === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  args.push(current);
  return args.map((argument) => argument.trim());
}

/**
 * @param {WebrefData} data
 * @return {MergeIdents}
 */
export function buildMergeIdents({ properties, atrules, types, functions }) {
  /**
   * A production can be defined by more than one spec, so the alternatives
   * are pooled the same way `postcss-reduce-idents` pools them.
   *
   * @type {Map<string, string>}
   */
  const grammars = new Map();
  for (const definition of [...types, ...functions]) {
    if (!definition.syntax) {
      continue;
    }
    const existing = grammars.get(definition.name);
    grammars.set(
      definition.name,
      existing === undefined
        ? definition.syntax
        : `${existing} | ${definition.syntax}`
    );
  }
  for (const property of properties) {
    if (property.syntax) {
      grammars.set(`'${property.name}'`, property.syntax);
    }
  }

  /**
   * Every keyword a grammar can hold, following it to the productions it
   * names but not descending into function arguments: a keyword inside
   * `counter()` is written where the function is, not where the property
   * that takes the function is.
   *
   * @param {string | undefined} syntax
   * @return {Set<string>}
   */
  function expand(syntax) {
    /** @type {Set<string>} */
    const keywords = new Set();
    /** @type {string[]} */
    const queue = syntax === undefined ? [] : [syntax];
    /** @type {Set<string>} */
    const seen = new Set();
    while (queue.length > 0) {
      const current = /** @type {string} */ (queue.pop());
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      for (const keyword of keywordTerminals(current)) {
        keywords.add(keyword);
      }
      for (const reference of directReferences(current)) {
        if (reference.endsWith('()') || seen.has(reference)) {
          continue;
        }
        const grammar = grammars.get(reference);
        if (grammar !== undefined) {
          queue.push(grammar);
        }
      }
    }
    return keywords;
  }

  /**
   * @param {string[]} names
   * @return {string[]}
   */
  function keywordsOfProperties(names) {
    /** @type {Set<string>} */
    const keywords = new Set();
    for (const name of names) {
      for (const keyword of expand(grammars.get(`'${name}'`))) {
        keywords.add(keyword);
      }
    }
    return [...keywords].toSorted();
  }

  /**
   * The descriptors of an at-rule that can hold a counter style name, whose
   * own keywords would be ambiguous with one: `speak-as: bullets` is a
   * keyword, not the name of a counter style.
   *
   * @param {string} atRuleName
   * @return {string[]}
   */
  function keywordsOfCounterStyleDescriptors(atRuleName) {
    /** @type {Set<string>} */
    const keywords = new Set();
    for (const atrule of atrules) {
      if (atrule.name !== `@${atRuleName}`) {
        continue;
      }
      for (const descriptor of atrule.descriptors ?? []) {
        const holdsStyleName =
          descriptor.syntax &&
          directReferences(descriptor.syntax).some(
            (reference) =>
              reference === 'counter-style' ||
              reference === 'counter-style-name'
          );
        if (!holdsStyleName) {
          continue;
        }
        for (const keyword of expand(descriptor.syntax)) {
          keywords.add(keyword);
        }
      }
    }
    return [...keywords].toSorted();
  }

  return {
    cssWideKeywords: keywordsOf(
      properties.find((property) => property.name === 'all')?.syntax
    ),
    keyframes: {
      shorthandKeywords: keywordsOfProperties(['animation', 'animation-name']),
    },
    counterStyle: {
      keywords: [
        ...new Set([
          ...keywordsOfProperties(['list-style', 'list-style-type']),
          ...keywordsOfCounterStyleDescriptors('counter-style'),
        ]),
      ].toSorted(),
      functions: counterStyleFunctionSlots(functions),
    },
  };
}

/**
 * The argument positions at which the counter functions take the counter
 * style they render the counter with.
 *
 * @param {WebrefDefinition[]} functions
 * @return {Map<string, number[]>}
 */
function counterStyleFunctionSlots(functions) {
  /** @type {Map<string, number[]>} */
  const slots = new Map();
  for (const { name, syntax } of functions) {
    if (!syntax) {
      continue;
    }
    /** @type {number[]} */
    const styleArguments = [];
    for (const [index, argument] of functionArguments(syntax).entries()) {
      const references = directReferences(argument);
      if (
        references.includes('counter-style') ||
        references.includes('counter-style-name')
      ) {
        styleArguments.push(index);
      }
    }
    if (styleArguments.length > 0) {
      slots.set(name, styleArguments);
    }
  }
  return slots;
}

/**
 * Guards against publishing data a webref release has silently gutted: a
 * keyword that went missing would stop reserving a name it used to, turning
 * a reserved merge into a semantic change rather than a missed optimisation.
 *
 * @param {MergeIdents} data
 * @return {void}
 */
export function validate(data) {
  expectAll(data.cssWideKeywords, CSS_WIDE_KEYWORD_EXPECTATIONS, [
    'the CSS-wide keywords',
  ]);
  expectAll(
    data.keyframes.shorthandKeywords,
    KEYFRAMES_SHORTHAND_KEYWORD_EXPECTATIONS,
    ['the keywords an animation value can hold']
  );
  expectAll(data.counterStyle.keywords, COUNTER_STYLE_KEYWORD_EXPECTATIONS, [
    'the keywords a list style value or counter style descriptor can hold',
  ]);
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [1]],
    ['counters()', [2]],
    ['target-counter()', [2]],
    ['target-counters()', [3]],
  ])) {
    const actual = data.counterStyle.functions.get(name);
    if (actual?.join() !== expected.join()) {
      throw new Error(
        `Expected ${name} to take a counter style at argument ${expected.join()}, got ${actual?.join() ?? 'nothing'}`
      );
    }
  }
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string[]} what
 * @return {void}
 */
function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what.join(' ')} to include ${name}`);
    }
  }
}

/**
 * Maps only exist in memory; the generated file is JSON.
 *
 * @param {MergeIdents} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(
    {
      cssWideKeywords: data.cssWideKeywords,
      keyframes: data.keyframes,
      counterStyle: {
        ...data.counterStyle,
        functions: Object.fromEntries(data.counterStyle.functions),
      },
    },
    null,
    2
  )}\n`;
}
