import cssnanoUtils from 'cssnano-utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { cssWideKeywords } from '../spec.js';
import isCustomProp from '../isCustomProp.js';
import { splitValue } from '../valueComponents.js';
import shorthandData from '../../data/shorthandIdentities.json' with { type: 'json' };

const { asciiLowerCase } = cssnanoUtils;

/** @import {Declaration} from 'postcss'; */

/**
 * @typedef {{
 *   shorthand: string,
 *   slots: Map<string, number>,
 *   allProps: Set<string>,
 *   symmetricForms: Set<string>,
 *   alignForms: Set<string>,
 *   justifyForms: Set<string>,
 * }} AlignmentFamilyConfig
 */

/**
 * @param {Record<string, string[]>} forms
 * @return {Map<string, Set<string>>}
 */
function formSets(forms) {
  return new Map(
    Object.entries(forms).map(([property, values]) => [
      property,
      new Set(values),
    ])
  );
}

export const shorthandForms = formSets(shorthandData.alignment);
const longhandForms = formSets(shorthandData.alignmentLonghands);

/**
 * @param {string} shorthand
 * @param {string} align
 * @param {string} justify
 * @return {AlignmentFamilyConfig}
 */
function createFamily(shorthand, align, justify) {
  return {
    shorthand,
    slots: new Map([
      [align, 0],
      [justify, 1],
    ]),
    allProps: new Set([shorthand, align, justify]),
    symmetricForms: /** @type {Set<string>} */ (shorthandForms.get(shorthand)),
    alignForms: /** @type {Set<string>} */ (longhandForms.get(align)),
    justifyForms: /** @type {Set<string>} */ (longhandForms.get(justify)),
  };
}

/** @type {Record<string, AlignmentFamilyConfig>} */
export const alignmentFamilies = {
  'place-content': createFamily(
    'place-content',
    'align-content',
    'justify-content'
  ),
  'place-items': createFamily('place-items', 'align-items', 'justify-items'),
  'place-self': createFamily('place-self', 'align-self', 'justify-self'),
};

/** @type {Map<string, AlignmentFamilyConfig>} */
export const alignmentProperties = new Map();
for (const family of Object.values(alignmentFamilies)) {
  for (const prop of family.allProps) {
    alignmentProperties.set(prop, family);
  }
}

/**
 * Parses a 1- or 2-value alignment shorthand value into its component slots.
 * Returns null if the value is invalid or malformed per CSS Box Alignment 3.
 *
 * @param {AlignmentFamilyConfig} family
 * @param {string} value
 * @return {[string, string] | null}
 */
function parseAlignmentShorthand(family, value) {
  const trimmed = value.trim();
  const lower = asciiLowerCase(trimmed);
  if (!/[\s\\]/v.test(lower)) {
    if (cssWideKeywords.has(lower) || family.symmetricForms.has(lower)) {
      return [trimmed, trimmed];
    }
  }

  const parsed = splitValue(trimmed);
  if (!parsed || parsed.length !== 1) return null;
  const components = parsed[0].components;
  if (components.length < 1 || components.length > 4) return null;

  if (components.length <= 2) {
    const fullNorm = components.map((c) => asciiLowerCase(c.raw)).join(' ');
    if (cssWideKeywords.has(fullNorm) || family.symmetricForms.has(fullNorm)) {
      const fullRaw = components.map((c) => c.raw).join(' ');
      return [fullRaw, fullRaw];
    }
  }

  // With first|last baseline as the only order, at most one split is valid.
  for (let split = 1; split < components.length; split++) {
    const first = components.slice(0, split);
    const second = components.slice(split);
    const firstStr = first.map((c) => c.raw).join(' ');
    const secondStr = second.map((c) => c.raw).join(' ');
    if (
      family.alignForms.has(asciiLowerCase(firstStr)) &&
      family.justifyForms.has(asciiLowerCase(secondStr))
    ) {
      return [firstStr, secondStr];
    }
  }
  return null;
}

/**
 * Parses the value of one alignment declaration into its [align, justify]
 * slots, `null` in the slot a longhand leaves untouched. Returns `null` when
 * the browser would ignore the declaration, so callers need not validate
 * separately. CSS-wide keywords and substitutions are taken as written.
 *
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration} decl
 * @return {[string | null, string | null] | null}
 */
export function parseAlignmentDeclaration(family, decl) {
  const value = decl.value?.trim();
  if (!value) return null;
  const prop = asciiLowerCase(decl.prop);
  if (prop === family.shorthand) return parseAlignmentShorthand(family, value);
  const slot = family.slots.get(prop);
  if (slot === undefined) return null;

  let normalized = value;
  if (!isCssWideKeyword(value) && !isCustomProp(decl)) {
    if (/[\s\\]/v.test(value)) {
      const parsed = splitValue(value);
      if (!parsed || parsed.length !== 1) return null;
      const components = parsed[0].components;
      if (components.length > 2) return null;
      normalized = components.map((c) => c.raw).join(' ');
    }
    const forms = slot === 0 ? family.alignForms : family.justifyForms;
    if (!forms.has(asciiLowerCase(normalized))) return null;
  }
  return slot === 0 ? [normalized, null] : [null, normalized];
}

/* Keywords every engine with place-* has long parsed. Any other keyword may
 * be new to some target: a place-* shorthand is dropped whole for one unknown
 * keyword, whereas separate longhands lose only the axis that uses it. Listing
 * the safe ones keeps a keyword added to the grammar from merging unreviewed. */
export const widelySupported = new Set([
  'normal',
  'stretch',
  'center',
  'start',
  'end',
  'flex-start',
  'flex-end',
  'self-start',
  'self-end',
  'space-between',
  'space-around',
  'space-evenly',
  'baseline',
  'first',
  'auto',
]);

/**
 * The keywords of a value that a target may not support. `safe normal` and
 * `unsafe normal` are recent additions to <overflow-position>, so each pair
 * counts as a feature of its own.
 *
 * @param {string} value - a parsed alignment value, components joined by one space
 * @return {Set<string>}
 */
function supportFeatures(value) {
  const keywords = asciiLowerCase(value).split(' ');
  /** @type {Set<string>} */
  const features = new Set();
  for (const [index, keyword] of keywords.entries()) {
    if (cssWideKeywords.has(keyword) || widelySupported.has(keyword)) {
      continue;
    }
    features.add(keyword);
    if (keywords[index + 1] === 'normal') features.add(`${keyword} normal`);
  }
  return features;
}

/**
 * Whether one shorthand can replace the declarations without changing what
 * an engine lacking a keyword drops. That engine ignores every declaration
 * using the keyword, so all replaced declarations must need the same ones;
 * this includes a keyword on a shorthand axis a later longhand overrides.
 *
 * @param {string[]} values - each merged declaration's parsed value
 * @return {boolean}
 */
export function sharesKeywordSupport(values) {
  const [first, ...rest] = values.map(supportFeatures);
  return rest.every((features) => !features.symmetricDifference(first).size);
}

/**
 * Normalizes two alignment slot values into an emitted shorthand string.
 * Collapses to single value if identical and permitted by symmetricForms or global keywords.
 *
 * @param {AlignmentFamilyConfig} family
 * @param {[string, string]} values
 * @return {string}
 */
export function normalizeAlignment(family, [val0, val1]) {
  const v0 = asciiLowerCase(val0);
  const v1 = asciiLowerCase(val1);
  if (v0 === v1 && (family.symmetricForms.has(v0) || cssWideKeywords.has(v0))) {
    return val0;
  }
  return `${val0} ${val1}`;
}
