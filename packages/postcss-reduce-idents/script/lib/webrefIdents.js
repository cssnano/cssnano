import {
  counterFunctionSlots,
  descriptorsWhere,
  directReferences,
  functionArguments,
  keywordTerminals,
  keywordsOf,
  shorthandsOf,
  takesOneOf,
  unprefixedAtRule,
} from './webrefIdentsGrammar.js';
import { validate } from './webrefIdentsValidate.js';

/**
 * Derives, from the raw `@webref/css` data, the places a custom identifier of
 * each kind the plugin renames can appear. Kept free of I/O so that it can be
 * unit tested.
 *
 * @typedef {import('./webrefIdentsGrammar.js').WebrefDefinition} WebrefDefinition
 * @typedef {import('./webrefIdentsGrammar.js').WebrefProperty} WebrefProperty
 * @typedef {import('./webrefIdentsGrammar.js').WebrefAtRule} WebrefAtRule
 * @typedef {import('./webrefIdentsGrammar.js').WebrefData} WebrefData
 *
 * @typedef {object} IdentSlots
 * @property {string[]} cssWideKeywords Keywords no custom identifier can be,
 * whatever the property.
 * @property {Map<string, string>} aliases Vendor prefixed spelling to the
 * property it aliases.
 * @property {{keyframes: string, counterStyle: string}} atRules Unprefixed
 * names of the at-rules that define a name.
 * @property {{properties: string[], reservedKeywords: string[]}} keyframes
 * @property {{
 *   properties: string[],
 *   descriptors: string[],
 *   functionProperties: string[],
 *   functions: Map<string, number[]>,
 *   reservedKeywords: string[]
 * }} counterStyle
 * @property {{
 *   properties: string[],
 *   functionProperties: string[],
 *   functions: Map<string, number[]>,
 *   reservedKeywords: string[]
 * }} counter
 * @property {{
 *   templateProperties: string[],
 *   referenceProperties: string[],
 *   reservedKeywords: string[]
 * }} grid
 */

export { directReferences, functionArguments, keywordTerminals, validate };

/**
 * @param {WebrefData} data
 * @return {IdentSlots}
 */
export function buildIdentSlots({ properties, atrules, types, functions }) {
  /** @type {Map<string, string>} */
  const aliases = new Map();
  for (const property of properties) {
    if (property.legacyAliasOf) {
      aliases.set(property.name, property.legacyAliasOf);
    }
  }

  /**
   * A production can be defined by more than one spec, e.g. `<content-list>`
   * by both css-content and css-gcpm.
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
   * Every production a grammar can expand to and every keyword it can hold,
   * functions included as productions but without descending into their
   * arguments: an identifier inside `counter()` is not written where the
   * property that takes the function is written, so the two are collected
   * separately.
   *
   * @param {string | undefined} syntax
   * @return {{references: Set<string>, keywords: Set<string>}}
   */
  function expand(syntax) {
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
   * @param {string | undefined} syntax
   * @return {Set<string>}
   */
  function reachable(syntax) {
    return expand(syntax).references;
  }

  /**
   * The keywords a declaration of any of these properties can hold. A custom
   * identifier that reads as one of them is ambiguous: `animation: linear 2s
   * linear` names the easing function once and the keyframes once, and which
   * is which depends on the order the grammar is matched in. Renaming those
   * would change what the declaration means, so they are left alone.
   *
   * @param {string[]} names
   * @return {string[]}
   */
  function keywordsOfProperties(names) {
    return keywordsOfSyntaxes(names.map((name) => grammars.get(`'${name}'`)));
  }

  /**
   * The same, for grammars that are not a property's, such as the descriptors
   * of an at-rule.
   *
   * @param {(string | undefined)[]} syntaxes
   * @return {string[]}
   */
  function keywordsOfSyntaxes(syntaxes) {
    /** @type {Set<string>} */
    const keywords = new Set();
    for (const syntax of syntaxes) {
      for (const keyword of expand(syntax).keywords) {
        keywords.add(keyword);
      }
    }
    return [...keywords].toSorted();
  }

  /** @type {Map<string, Set<string>>} */
  const propertyReach = new Map();
  for (const property of properties) {
    // Skip prefixed spellings: they resolve to their alias before any lookup.
    if (property.legacyAliasOf || property.name === '--*') {
      continue;
    }
    propertyReach.set(property.name, reachable(property.syntax));
  }

  /**
   * @param {(reach: Set<string>) => boolean} predicate
   * @return {string[]}
   */
  function propertiesWhere(predicate) {
    /** @type {string[]} */
    const names = [];
    for (const [name, reach] of propertyReach) {
      if (predicate(reach)) {
        names.push(name);
      }
    }
    return names.toSorted();
  }

  const { counterFunctions, counterStyleFunctions } =
    counterFunctionSlots(functions);

  // A grid name is defined either in a gridline name list, `[header]`, or in
  // the strings of `grid-template-areas`
  const gridTemplateProperties = new Set([
    ...propertiesWhere((reach) => reach.has('line-names')),
    ...shorthandsOf('grid-template-areas', properties),
  ]);
  const gridReferenceProperties = propertiesWhere((reach) =>
    reach.has('grid-line')
  );
  const keyframesProperties = propertiesWhere((reach) =>
    reach.has('keyframes-name')
  );
  const counterStyleProperties = propertiesWhere((reach) =>
    reach.has('counter-style-name')
  );
  const counterProperties = propertiesWhere((reach) =>
    reach.has('counter-name')
  );
  // Reserve the descriptors' own keywords like the properties: `speak-as:
  // words` and `system: fixed 3` are not counter-style names.
  const counterStyleDescriptors = descriptorsWhere(
    atrules,
    '@counter-style',
    (syntax) => reachable(syntax).has('counter-style-name')
  );

  return {
    cssWideKeywords: keywordsOf(
      properties.find((property) => property.name === 'all')?.syntax
    ),
    aliases: new Map([...aliases].toSorted(([a], [b]) => (a < b ? -1 : 1))),
    atRules: {
      keyframes: unprefixedAtRule(atrules, 'keyframes'),
      counterStyle: unprefixedAtRule(atrules, 'counter-style'),
    },
    keyframes: {
      properties: keyframesProperties,
      reservedKeywords: keywordsOfProperties(keyframesProperties),
    },
    counterStyle: {
      properties: counterStyleProperties,
      descriptors: counterStyleDescriptors.map((descriptor) => descriptor.name),
      functionProperties: propertiesWhere(takesOneOf(counterStyleFunctions)),
      functions: counterStyleFunctions,
      reservedKeywords: keywordsOfSyntaxes([
        ...counterStyleProperties.map((name) => grammars.get(`'${name}'`)),
        ...counterStyleDescriptors.map((descriptor) => descriptor.syntax),
      ]),
    },
    counter: {
      properties: counterProperties,
      functionProperties: [
        ...new Set([
          ...propertiesWhere(takesOneOf(counterFunctions)),
          // Name `string-set` here: webref spells it with a bare `<string>`,
          // so its `counter()` is unreachable from the grammar.
          ...(propertyReach.has('string-set') ? ['string-set'] : []),
        ]),
      ].toSorted(),
      functions: counterFunctions,
      reservedKeywords: keywordsOfProperties(counterProperties),
    },
    grid: {
      templateProperties: [...gridTemplateProperties].toSorted(),
      referenceProperties: gridReferenceProperties,
      reservedKeywords: keywordsOfProperties([
        ...gridTemplateProperties,
        ...gridReferenceProperties,
      ]),
    },
  };
}

/**
 * Maps only exist in memory; the generated file is JSON.
 *
 * @param {IdentSlots} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(
    {
      cssWideKeywords: data.cssWideKeywords,
      aliases: Object.fromEntries(data.aliases),
      atRules: data.atRules,
      keyframes: data.keyframes,
      counterStyle: {
        ...data.counterStyle,
        functions: Object.fromEntries(data.counterStyle.functions),
      },
      counter: {
        ...data.counter,
        functions: Object.fromEntries(data.counter.functions),
      },
      grid: data.grid,
    },
    null,
    2
  )}\n`;
}
