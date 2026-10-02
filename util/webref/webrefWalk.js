import {
  directReferences,
  functionArguments,
  grammarsByName,
  keywordTerminals,
} from './webref.js';

/** @import {WebrefAtRule, WebrefDefinition, WebrefProperty} from './webref.js'; */

/**
 * Follows a grammar to every production it can expand to and every keyword it
 * can hold. Function productions are reported but not descended into: an
 * identifier inside `counter()` is written where the function is, not where
 * the property that takes the function is. Productions without a grammar, such
 * as `<length>`, are reported and not followed.
 *
 * @param {Map<string, string>} grammars As returned by `grammarsByName`.
 * @param {string | undefined} syntax
 * @return {{references: Set<string>, keywords: Set<string>}}
 */
export function reachableProductions(grammars, syntax) {
  /** @type {Set<string>} */
  const references = new Set();
  /** @type {Set<string>} */
  const keywords = new Set();
  /** @type {string[]} */
  const queue = syntax === undefined ? [] : [syntax];
  while (queue.length > 0) {
    const current = /** @type {string} */ (queue.pop());
    for (const keyword of keywordTerminals(current)) {
      keywords.add(keyword);
    }
    for (const reference of directReferences(current)) {
      if (references.has(reference)) {
        continue;
      }
      references.add(reference);
      if (reference.endsWith('()')) {
        continue;
      }
      const grammar = grammars.get(reference);
      if (grammar !== undefined) {
        queue.push(grammar);
      }
    }
  }
  return { references, keywords };
}

/**
 * The productions each property's grammar reaches. Vendor prefixed spellings
 * and `--*` are left out: they resolve to their alias before any lookup.
 *
 * @param {WebrefProperty[]} properties
 * @param {Map<string, string>} grammars As returned by `grammarsByName`.
 * @return {Map<string, Set<string>>}
 */
export function propertyReach(properties, grammars) {
  /** @type {Map<string, Set<string>>} */
  const reach = new Map();
  for (const property of properties) {
    if (property.legacyAliasOf || property.name === '--*') {
      continue;
    }
    reach.set(
      property.name,
      reachableProductions(grammars, property.syntax).references
    );
  }
  return reach;
}

/**
 * The descriptors of an at-rule whose grammar satisfies a predicate, ordered
 * by name.
 *
 * @param {WebrefAtRule[]} atrules
 * @param {string} atRuleName
 * @param {(syntax: string) => boolean} predicate
 * @return {WebrefDefinition[]}
 */
export function descriptorsWhere(atrules, atRuleName, predicate) {
  const atrule = atrules.find((candidate) => candidate.name === atRuleName);
  /** @type {WebrefDefinition[]} */
  const found = [];
  for (const descriptor of atrule?.descriptors ?? []) {
    if (descriptor.syntax && predicate(descriptor.syntax)) {
      found.push(descriptor);
    }
  }
  return found.toSorted((a, b) => (a.name < b.name ? -1 : 1));
}

/**
 * Return the functions that name a counter and where the counter and its
 * style sit in their arguments. webref spells the counter `<counter-name>`
 * in `counter()` but `<custom-ident>` in `target-counter()`, so count an
 * identifier argument as a counter name whenever the function also takes a
 * counter style.
 *
 * @param {WebrefDefinition[]} functions
 * @return {{
 *   counterFunctions: Map<string, number[]>,
 *   counterStyleFunctions: Map<string, number[]>
 * }}
 */
export function counterFunctionSlots(functions) {
  /** @type {Map<string, number[]>} */
  const counterFunctions = new Map();
  /** @type {Map<string, number[]>} */
  const counterStyleFunctions = new Map();

  for (const { name, syntax } of functions) {
    if (!syntax) {
      continue;
    }
    /** @type {number[]} */
    const styleArguments = [];
    /** @type {number[]} */
    const nameArguments = [];

    for (const [index, argument] of functionArguments(syntax).entries()) {
      const references = directReferences(argument);
      if (
        references.includes('counter-style') ||
        references.includes('counter-style-name')
      ) {
        styleArguments.push(index);
      } else if (
        references.includes('counter-name') ||
        references.includes('custom-ident')
      ) {
        nameArguments.push(index);
      }
    }

    if (styleArguments.length === 0) {
      continue;
    }
    counterStyleFunctions.set(name, styleArguments);
    if (nameArguments.length > 0) {
      counterFunctions.set(name, nameArguments);
    }
  }

  return { counterFunctions, counterStyleFunctions };
}

/**
 * The keywords and functions `<easing-function>` accepts, which several
 * plugins need to tell an easing function from a custom identifier. Function
 * arguments are outside the result grammar and are not followed.
 *
 * @param {{
 *   properties: WebrefProperty[],
 *   types: WebrefDefinition[],
 *   functions?: WebrefDefinition[]
 * }} data
 * @return {{keywords: string[], functions: string[]}}
 */
export function easingFunction(data) {
  const grammars = grammarsByName(data);
  const { references, keywords } = reachableProductions(
    grammars,
    '<easing-function>'
  );
  /** @type {Set<string>} */
  const functions = new Set();
  for (const reference of references) {
    if (reference.endsWith('()')) {
      functions.add(reference.slice(0, -2).toLowerCase());
    } else if (!grammars.has(reference)) {
      throw new Error(`webref does not define <${reference}>`);
    }
  }
  return {
    keywords: [
      ...new Set([...keywords].map((name) => name.toLowerCase())),
    ].toSorted(),
    functions: [...functions].toSorted(),
  };
}

/**
 * A new easing keyword or function changes what is a valid custom identifier,
 * so a refresh that brings one in must be reviewed rather than accepted.
 *
 * @param {{keywords: string[], functions: string[]}} easing
 * @return {void}
 */
export function validateEasingFunction(easing) {
  const expected = {
    keywords: [
      'ease',
      'ease-in',
      'ease-in-out',
      'ease-out',
      'linear',
      'step-end',
      'step-start',
    ],
    functions: ['cubic-bezier', 'linear', 'steps'],
  };
  for (const kind of /** @type {const} */ (['keywords', 'functions'])) {
    if (easing[kind].join(' ') !== expected[kind].join(' ')) {
      throw new Error(`Unexpected easing ${kind}: ${easing[kind].join(' ')}`);
    }
  }
}
