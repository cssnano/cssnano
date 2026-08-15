/**
 * Derives, from the raw `@webref/css` data, the places a custom identifier of
 * each kind the plugin renames can appear. Kept free of I/O so that it can be
 * unit tested.
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

const VENDOR_PREFIX = /^-\w+-/;

/**
 * Matches a reference to another production: `<length>`, `<counter()>` for a
 * function, `<'grid-template'>` for a property's own grammar. Ranges are
 * written inside the brackets, as in `<integer [1,∞]>`.
 */
const REFERENCE = /<'([^'>]+)'>|<([^'>\s]+)(?:\s+\[[^\]]*\])?>/g;

/**
 * The keywords a grammar offers as literal alternatives. A name spelled out
 * with an argument list, such as `minmax(` or `reversed(`, is a function
 * rather than a keyword: it cannot be written as a bare word, so a custom
 * identifier is free to be called that.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function keywordTerminals(syntax) {
  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const keywords = [];
  for (const match of literals.matchAll(/[a-zA-Z][a-zA-Z0-9-]*/g)) {
    const [keyword] = match;
    const rest = literals.slice(
      /** @type {number} */ (match.index) + keyword.length
    );
    if (!/^\s*\(/.test(rest)) {
      keywords.push(keyword);
    }
  }
  return keywords;
}

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
   * by both css-content and css-gcpm. An identifier is renameable in a slot
   * only if no definition of it holds something else, so the alternatives are
   * pooled.
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
    // Prefixed spellings resolve to the property they alias before anything is
    // looked up, so listing them as slots of their own would be noise.
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
  // the strings of `grid-template-areas`, which the `grid` and `grid-template`
  // shorthands write inline rather than through a reference webref records.
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
  // `speak-as: words` and `system: fixed 3` are keywords of the descriptor
  // they are written in, not the name of a counter style, so the descriptors
  // reserve their own keywords the way the properties do.
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
          // webref spells `string-set` with a bare `<string>` rather than the
          // `<content-list>` css-gcpm gives it, so the `counter()` it can hold
          // is not reachable from the grammar and has to be named here.
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
 * The functions that name a counter, and where in their argument list the
 * counter and the style it is rendered with sit. webref spells the counter
 * `<counter-name>` in `counter()` but `<custom-ident>` in `target-counter()`,
 * so an identifier argument counts as a counter name whenever the function
 * also takes a counter style, which is what makes it a counter function in the
 * first place.
 *
 * @param {WebrefDefinition[]} functions
 * @return {{
 *   counterFunctions: Map<string, number[]>,
 *   counterStyleFunctions: Map<string, number[]>
 * }}
 */
function counterFunctionSlots(functions) {
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
 * Guards against publishing data a webref release has silently gutted. Every
 * slot below is one the plugin renames into, so losing one turns a rename into
 * a dangling reference rather than into a missed optimisation. Keep in sync
 * with the cases in test/slots.js.
 *
 * @param {IdentSlots} data
 * @return {void}
 */
/**
 * @param {Map<string, number[]>} functionSlots
 * @return {(reach: Set<string>) => boolean}
 */
function takesOneOf(functionSlots) {
  return (reach) => [...functionSlots.keys()].some((name) => reach.has(name));
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 */
function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what} to include ${name}`);
    }
  }
}

export function validate(data) {
  expectAll(
    data.cssWideKeywords,
    ['inherit', 'initial', 'revert', 'unset'],
    'the CSS-wide keywords'
  );
  expectAll(
    data.keyframes.properties,
    ['animation', 'animation-name'],
    'the keyframes name properties'
  );
  expectAll(
    data.counterStyle.properties,
    ['list-style', 'list-style-type'],
    'the counter style properties'
  );
  expectAll(
    data.counterStyle.descriptors,
    ['fallback', 'speak-as', 'system'],
    'the counter style descriptors'
  );
  expectAll(
    data.counterStyle.functionProperties,
    ['content'],
    'the counter style function properties'
  );
  expectAll(
    data.counter.properties,
    ['counter-increment', 'counter-reset', 'counter-set'],
    'the counter properties'
  );
  expectAll(
    data.counter.functionProperties,
    ['content', 'string-set'],
    'the counter function properties'
  );
  expectAll(
    data.grid.templateProperties,
    [
      'grid',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
    ],
    'the grid template properties'
  );
  expectAll(
    data.grid.referenceProperties,
    [
      'grid-area',
      'grid-column',
      'grid-column-end',
      'grid-column-start',
      'grid-row',
      'grid-row-end',
      'grid-row-start',
    ],
    'the grid line properties'
  );

  // The argument a counter name or a counter style sits at, which decides
  // which word in a `counter(x, y)` gets renamed and which is left alone.
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [0]],
    ['counters()', [0]],
    ['target-counter()', [1]],
    ['target-counters()', [1]],
  ])) {
    assertArguments(data.counter.functions, name, expected, 'counter name');
  }
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [1]],
    ['counters()', [2]],
    ['target-counter()', [2]],
    ['target-counters()', [3]],
  ])) {
    assertArguments(
      data.counterStyle.functions,
      name,
      expected,
      'counter style'
    );
  }

  // A property renamed as though it held a bare identifier, when the
  // identifier really sits inside a function, would rename the wrong word.
  for (const name of data.counterStyle.functionProperties) {
    if (data.counterStyle.properties.includes(name)) {
      throw new Error(
        `${name} is listed as taking a counter style both bare and in a function`
      );
    }
  }

  // Keywords a name written in the same declaration would be ambiguous with.
  // A grammar that stopped resolving would leave these empty and every such
  // name renameable again.
  expectAll(
    data.keyframes.reservedKeywords,
    ['ease', 'infinite', 'linear', 'none', 'paused', 'reverse'],
    'the keywords an animation value can hold'
  );
  expectAll(
    data.counterStyle.reservedKeywords,
    ['inside', 'none', 'outside'],
    'the keywords a list style value can hold'
  );
  expectAll(
    data.counterStyle.reservedKeywords,
    ['bullets', 'extends', 'fixed', 'spell-out', 'words'],
    'the keywords a counter style descriptor can hold'
  );
  expectAll(
    data.grid.reservedKeywords,
    ['auto', 'auto-flow', 'dense', 'none', 'span', 'subgrid'],
    'the keywords a grid value can hold'
  );
  // Function names are written with an argument list, so a custom identifier
  // is free to be called that.
  for (const keyword of ['minmax', 'repeat', 'fit-content']) {
    if (data.grid.reservedKeywords.includes(keyword)) {
      throw new Error(`Expected the function ${keyword}() not to be a keyword`);
    }
  }
}

/**
 * @param {Map<string, number[]>} functions
 * @param {string} name
 * @param {number[]} expected
 * @param {string} what
 * @return {void}
 */
function assertArguments(functions, name, expected, what) {
  const actual = functions.get(name);
  if (actual?.join() !== expected.join()) {
    throw new Error(
      `Expected ${name} to take a ${what} at argument ${expected.join()}, got ${actual?.join() ?? 'nothing'}`
    );
  }
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

/**
 * The keyword alternatives a grammar offers, ignoring anything that is a
 * reference to another production.
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
    .filter((alternative) => /^[a-z][a-z-]*$/.test(alternative))
    .toSorted();
}

/**
 * The unprefixed name of an at-rule the plugin defines identifiers with. The
 * prefixed spellings webref lists, such as `@-webkit-keyframes`, collapse onto
 * it, the same way the plugin unprefixes an at-rule before comparing.
 *
 * @param {WebrefAtRule[]} atrules
 * @param {string} name
 * @return {string}
 */
function unprefixedAtRule(atrules, name) {
  const found = atrules.some(
    (atrule) => atrule.name.slice(1).replace(VENDOR_PREFIX, '') === name
  );
  if (!found) {
    throw new Error(`webref does not define the @${name} rule`);
  }
  return name;
}

/**
 * @param {WebrefAtRule[]} atrules
 * @param {string} atRuleName
 * @param {(syntax: string) => boolean} predicate
 * @return {WebrefDefinition[]}
 */
function descriptorsWhere(atrules, atRuleName, predicate) {
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
 * The property itself and every shorthand that sets it.
 *
 * @param {string} longhand
 * @param {WebrefProperty[]} properties
 * @return {string[]}
 */
function shorthandsOf(longhand, properties) {
  const byName = new Map(
    properties.map((property) => [property.name, property])
  );
  /** @type {string[]} */
  const names = [];
  for (const property of properties) {
    if (property.name === longhand || sets(property, longhand)) {
      names.push(property.name);
    }
  }
  return names.toSorted();

  /**
   * @param {WebrefProperty} property
   * @param {string} target
   * @param {Set<string>} [seen]
   * @return {boolean}
   */
  function sets(property, target, seen = new Set()) {
    if (seen.has(property.name)) {
      return false;
    }
    seen.add(property.name);
    for (const part of [
      ...(property.longhands ?? []),
      ...(property.resetLonghands ?? []),
    ]) {
      const definition = byName.get(part);
      if (part === target || (definition && sets(definition, target, seen))) {
        return true;
      }
    }
    return false;
  }
}
