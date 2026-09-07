import { REFERENCE, keywordTerminals } from '../../../../util/webref.mjs';

const PLACE_SHORTHANDS = ['place-content', 'place-items', 'place-self'];
const MODIFIERS = new Set(['first', 'last', 'safe', 'unsafe']);

/**
 * @typedef {{name: string, syntax?: string, longhands?: string[]}} Definition
 * @typedef {{properties: Definition[], types: Definition[], functions: Definition[]}} WebrefData
 * @typedef {{alignment: Map<string, string[]>, easing: {keywords: string[], functions: string[]}}} ShorthandIdentities
 */

/** @param {string | undefined} syntax @return {string[]} */
function references(syntax) {
  if (!syntax) return [];
  return [...syntax.matchAll(REFERENCE)].map(([, property, type]) =>
    String(property ?? type)
  );
}

/** @param {WebrefData} data @return {Map<string, Definition>} */
function definitionsByName(data) {
  return new Map(
    [...data.properties, ...data.types, ...data.functions].map((definition) => [
      definition.name,
      definition,
    ])
  );
}

/**
 * Collect the finite, identifier-only forms accepted by an alignment
 * longhand. This knows only the small composition vocabulary used by CSS
 * Alignment; it does not attempt to parse arbitrary CSS value grammars.
 *
 * @param {Definition} property
 * @param {Map<string, Definition>} definitions
 * @return {Set<string>}
 */
function alignmentLonghandForms(property, definitions) {
  const syntax = property.syntax ?? '';
  const referenced = new Set(references(syntax));
  const forms = new Set(
    keywordTerminals(syntax)
      .map((name) => name.toLowerCase())
      .filter((name) => !MODIFIERS.has(name))
  );

  if (referenced.has('baseline-position')) {
    const keywords = keywordTerminals(
      definitions.get('baseline-position')?.syntax
    ).map((name) => name.toLowerCase());
    forms.add('baseline');
    for (const modifier of keywords.filter((name) => name !== 'baseline')) {
      forms.add(`${modifier} baseline`);
    }
  }

  for (const name of [
    'content-distribution',
    'content-position',
    'self-position',
  ]) {
    if (!referenced.has(name)) continue;
    for (const keyword of keywordTerminals(definitions.get(name)?.syntax)) {
      forms.add(keyword.toLowerCase());
    }
  }

  if (referenced.has('overflow-position')) {
    const prefixes = keywordTerminals(
      definitions.get('overflow-position')?.syntax
    ).map((name) => name.toLowerCase());
    const targets = new Set();
    for (const name of ['content-position', 'self-position']) {
      if (!referenced.has(name)) continue;
      for (const keyword of keywordTerminals(definitions.get(name)?.syntax)) {
        targets.add(keyword.toLowerCase());
      }
    }
    const [, grouped = ''] =
      /<overflow-position>\?\s*\[([^\]]+)\]/.exec(syntax) ?? [];
    for (const keyword of keywordTerminals(grouped)) {
      targets.add(keyword.toLowerCase());
    }
    for (const prefix of prefixes) {
      for (const target of targets) forms.add(`${prefix} ${target}`);
    }
  }

  return forms;
}

/**
 * Walk a result type, collecting its literal keywords and function names.
 * Function arguments are outside the result grammar and are not followed.
 *
 * @param {Map<string, Definition>} definitions
 * @param {string} root
 * @return {{keywords: string[], functions: string[]}}
 */
function reachableTerminals(definitions, root) {
  const seen = new Set();
  const keywords = new Set();
  const functions = new Set();
  const queue = [root];
  while (queue.length) {
    const name = /** @type {string} */ (queue.pop());
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.endsWith('()')) {
      functions.add(name.slice(0, -2).toLowerCase());
      continue;
    }
    const syntax = definitions.get(name)?.syntax;
    for (const keyword of keywordTerminals(syntax)) {
      keywords.add(keyword.toLowerCase());
    }
    for (const reference of references(syntax)) queue.push(reference);
  }
  return {
    keywords: [...keywords].toSorted(),
    functions: [...functions].toSorted(),
  };
}

/** @param {WebrefData} data @return {ShorthandIdentities} */
export function buildShorthandIdentities(data) {
  const definitions = definitionsByName(data);
  const alignment = new Map();
  for (const shorthandName of PLACE_SHORTHANDS) {
    const shorthand = definitions.get(shorthandName);
    if (!shorthand) throw new Error(`webref does not define ${shorthandName}`);
    const longhands = shorthand.longhands ?? [];
    if (longhands.length !== 2) {
      throw new Error(`Expected ${shorthandName} to have two longhands`);
    }
    const [first, second] = longhands.map((name) => {
      const property = definitions.get(name);
      if (!property) throw new Error(`webref does not define ${name}`);
      return alignmentLonghandForms(property, definitions);
    });
    alignment.set(
      shorthandName,
      [...first].filter((form) => second.has(form)).toSorted()
    );
  }
  return {
    alignment,
    easing: reachableTerminals(definitions, 'easing-function'),
  };
}

/** @param {ShorthandIdentities} data @return {void} */
export function validateShorthandIdentities(data) {
  const expected = {
    'place-content': ['center', 'safe center', 'space-between', 'stretch'],
    'place-items': ['baseline', 'first baseline', 'safe center', 'stretch'],
    'place-self': [
      'anchor-center',
      'auto',
      'baseline',
      'first baseline',
      'safe normal',
    ],
  };
  for (const [property, required] of Object.entries(expected)) {
    const forms = data.alignment.get(property) ?? [];
    for (const form of required) {
      if (!forms.includes(form)) {
        throw new Error(`Expected ${property} forms to include ${form}`);
      }
    }
  }
  for (const property of ['place-content', 'place-items']) {
    if (data.alignment.get(property)?.includes('auto')) {
      throw new Error(`Expected ${property} forms to exclude auto`);
    }
  }
  for (const [kind, required] of [
    [
      'keywords',
      [
        'ease',
        'ease-in',
        'ease-in-out',
        'ease-out',
        'linear',
        'step-end',
        'step-start',
      ],
    ],
    ['functions', ['cubic-bezier', 'linear', 'steps']],
  ]) {
    const actual = data.easing[kind];
    if (actual.join(' ') !== required.toSorted().join(' ')) {
      throw new Error(`Unexpected easing ${kind}: ${actual.join(' ')}`);
    }
  }
}

/** @param {ShorthandIdentities} data @return {string} */
export function serializeShorthandIdentities(data) {
  return `${JSON.stringify(
    {
      alignment: Object.fromEntries(data.alignment),
      easing: data.easing,
    },
    null,
    2
  )}\n`;
}
