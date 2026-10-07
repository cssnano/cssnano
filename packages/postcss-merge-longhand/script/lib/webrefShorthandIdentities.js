import {
  directReferences,
  grammarsByName,
  keywordTerminals,
  serializeJson,
} from '../../../../util/webref/webref.js';
import {
  easingFunction,
  validateEasingFunction,
} from '../../../../util/webref/webrefWalk.js';

const PLACE_SHORTHANDS = ['place-content', 'place-items', 'place-self'];
const ALIGNMENT_LONGHANDS = PLACE_SHORTHANDS.flatMap((name) => {
  const axis = name.slice('place-'.length);
  return [`align-${axis}`, `justify-${axis}`];
});
const MODIFIERS = new Set(['first', 'last', 'safe', 'unsafe']);

/**
 * @typedef {Pick<import('../../../../util/webref/webref.js').WebrefData, 'properties' | 'types' | 'functions'>} WebrefData
 * @typedef {{alignment: Map<string, string[]>, alignmentLonghands: Map<string, string[]>, easing: {keywords: string[], functions: string[]}}} ShorthandIdentities
 */

/**
 * `legacy && [ left | right | center ]` accepts either order.
 *
 * @param {string} syntax
 * @return {string[]}
 */
function legacyForms(syntax) {
  const [, targets = ''] = /legacy\s*&&\s*\[([^\]]+)\]/v.exec(syntax) ?? [];
  return keywordTerminals(targets).flatMap((keyword) => [
    `legacy ${keyword.toLowerCase()}`,
    `${keyword.toLowerCase()} legacy`,
  ]);
}

/**
 * Collect the finite, identifier-only forms accepted by an alignment
 * longhand. This knows only the small composition vocabulary used by CSS
 * Alignment; it does not attempt to parse arbitrary CSS value grammars.
 *
 * @param {string} syntax
 * @param {Map<string, string>} grammars
 * @return {Set<string>}
 */
function alignmentLonghandForms(syntax, grammars) {
  const referenced = new Set(directReferences(syntax));
  const forms = new Set(
    keywordTerminals(syntax)
      .map((name) => name.toLowerCase())
      .filter((name) => !MODIFIERS.has(name))
  );

  if (referenced.has('baseline-position')) {
    const keywords = keywordTerminals(grammars.get('baseline-position')).map(
      (name) => name.toLowerCase()
    );
    forms.add('baseline');
    for (const modifier of keywords.filter((name) => name !== 'baseline')) {
      forms.add(`${modifier} baseline`);
    }
  }

  const positions = new Set();
  for (const name of [
    'content-distribution',
    'content-position',
    'self-position',
  ]) {
    if (!referenced.has(name)) continue;
    for (const keyword of keywordTerminals(grammars.get(name))) {
      forms.add(keyword.toLowerCase());
      if (name !== 'content-distribution') positions.add(keyword.toLowerCase());
    }
  }

  if (referenced.has('overflow-position')) {
    const prefixes = keywordTerminals(grammars.get('overflow-position')).map(
      (name) => name.toLowerCase()
    );
    const [, grouped = ''] =
      /<overflow-position>\?\s*\[([^\]]+)\]/v.exec(syntax) ?? [];
    for (const keyword of keywordTerminals(grouped)) {
      positions.add(keyword.toLowerCase());
    }
    for (const prefix of prefixes) {
      for (const target of positions) forms.add(`${prefix} ${target}`);
    }
  }

  for (const form of legacyForms(syntax)) forms.add(form);

  return forms;
}

/** @param {WebrefData} data @return {ShorthandIdentities} */
export function buildShorthandIdentities(data) {
  const grammars = grammarsByName(data);
  const properties = new Map(
    data.properties.map((property) => [property.name, property])
  );
  const alignmentLonghands = new Map();
  for (const name of ALIGNMENT_LONGHANDS) {
    const property = properties.get(name);
    if (!property) throw new Error(`webref does not define ${name}`);
    alignmentLonghands.set(
      name,
      [...alignmentLonghandForms(property.syntax ?? '', grammars)].toSorted()
    );
  }
  const alignment = new Map();
  for (const shorthandName of PLACE_SHORTHANDS) {
    const shorthand = properties.get(shorthandName);
    if (!shorthand) throw new Error(`webref does not define ${shorthandName}`);
    const longhands = shorthand.longhands ?? [];
    if (longhands.length !== 2) {
      throw new Error(`Expected ${shorthandName} to have two longhands`);
    }
    const [first, second] = longhands.map(
      (name) => new Set(alignmentLonghands.get(name))
    );
    alignment.set(
      shorthandName,
      [...first].filter((form) => second.has(form)).toSorted()
    );
  }
  return {
    alignment,
    alignmentLonghands,
    easing: easingFunction(data),
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
  validateEasingFunction(data.easing);
}

/** @param {ShorthandIdentities} data @return {string} */
export function serializeShorthandIdentities(data) {
  return serializeJson({
    alignment: Object.fromEntries(data.alignment),
    alignmentLonghands: Object.fromEntries(data.alignmentLonghands),
    easing: data.easing,
  });
}
