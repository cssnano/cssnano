import {
  directReferences,
  functionArguments,
  keywordTerminals,
  shorthandsOf,
  takesOneOf,
  unprefixedAtRule,
} from './webrefIdentsGrammar.js';
import {
  grammarsByName,
  keywordsOf,
  sortedByName,
} from '../../../../util/webref/webref.js';
import {
  counterFunctionSlots,
  descriptorsWhere,
  propertyReach,
  reachableProductions,
} from '../../../../util/webref/webrefWalk.js';
import { validate } from './webrefIdentsValidate.js';

/**
 * Derives, from the raw `@webref/css` data, the places a custom identifier of
 * each kind the plugin renames can appear. Kept free of I/O so that it can be
 * unit tested.
 *
 * @typedef {import('../../../../util/webref/webref.js').WebrefDefinition} WebrefDefinition
 * @typedef {import('../../../../util/webref/webref.js').WebrefProperty} WebrefProperty
 * @typedef {import('../../../../util/webref/webref.js').WebrefAtRule} WebrefAtRule
 * @typedef {import('../../../../util/webref/webref.js').WebrefData} WebrefData
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

  const grammars = grammarsByName({ properties, types, functions });

  /**
   * @param {string | undefined} syntax
   * @return {Set<string>}
   */
  function reachable(syntax) {
    return reachableProductions(grammars, syntax).references;
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
      for (const keyword of reachableProductions(grammars, syntax).keywords) {
        keywords.add(keyword);
      }
    }
    return [...keywords].toSorted();
  }

  const reachByProperty = propertyReach(properties, grammars);

  /**
   * @param {(reach: Set<string>) => boolean} predicate
   * @return {string[]}
   */
  function propertiesWhere(predicate) {
    /** @type {string[]} */
    const names = [];
    for (const [name, reach] of reachByProperty) {
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
    aliases: new Map(sortedByName(aliases)),
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
          ...(reachByProperty.has('string-set') ? ['string-set'] : []),
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
