import {
  cssWideKeywords,
  directReferences,
  functionArguments,
  grammarsByName,
  serializeJson,
} from '../../../../util/webref/webref.js';
import {
  counterFunctionSlots,
  descriptorsWhere,
  propertyReach,
  reachableProductions,
} from '../../../../util/webref/webrefWalk.js';

export { directReferences, functionArguments };

/**
 * Derives, from the raw `@webref/css` data, the keyword sets and function
 * argument slots the plugin needs to know which identifiers are safe to
 * merge. Kept free of I/O so that it can be unit tested.
 *
 * The predefined counter style names (CSS Counter Styles Level 3 §6) are
 * specified in prose rather than in any grammar, so they cannot come from
 * here and stay hand-written in the plugin.
 *
 * @typedef {import('../../../../util/webref/webref.js').WebrefDefinition} WebrefDefinition
 * @typedef {import('../../../../util/webref/webref.js').WebrefProperty} WebrefProperty
 * @typedef {import('../../../../util/webref/webref.js').WebrefAtRule} WebrefAtRule
 * @typedef {import('../../../../util/webref/webref.js').WebrefData} WebrefData
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

/**
 * @param {WebrefData} data
 * @return {MergeIdents}
 */
export function buildMergeIdents({ properties, atrules, types, functions }) {
  const grammars = grammarsByName({ properties, types, functions });

  /**
   * The keywords of the productions a declaration of these properties, or
   * these grammars, can hold. A keyframes name or counter style name that
   * reads as one of them is ambiguous with it.
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

  /** @param {string[]} names */
  const keywordsOfProperties = (names) =>
    keywordsOfSyntaxes(names.map((name) => grammars.get(`'${name}'`)));

  const counterStyleProperties = [...propertyReach(properties, grammars)]
    .filter(([, reach]) => reach.has('counter-style-name'))
    .map(([name]) => name)
    .toSorted();
  // `speak-as: bullets` is a keyword, not the name of a counter style.
  const counterStyleDescriptors = descriptorsWhere(
    atrules,
    '@counter-style',
    (syntax) =>
      reachableProductions(grammars, syntax).references.has(
        'counter-style-name'
      )
  );

  return {
    cssWideKeywords: cssWideKeywords({ properties }),
    keyframes: {
      shorthandKeywords: keywordsOfProperties(['animation', 'animation-name']),
    },
    counterStyle: {
      keywords: keywordsOfSyntaxes([
        ...counterStyleProperties.map((name) => grammars.get(`'${name}'`)),
        ...counterStyleDescriptors.map((descriptor) => descriptor.syntax),
      ]),
      functions: counterFunctionSlots(functions).counterStyleFunctions,
    },
  };
}

/**
 * Maps only exist in memory; the generated file is JSON.
 *
 * @param {MergeIdents} data
 * @return {string}
 */
export function serialize(data) {
  return serializeJson({
    cssWideKeywords: data.cssWideKeywords,
    keyframes: data.keyframes,
    counterStyle: {
      ...data.counterStyle,
      functions: Object.fromEntries(data.counterStyle.functions),
    },
  });
}
