import data from '../data/identSlots.json' with { type: 'json' };

// Convert the generated JSON maps to `Map`s first: property and function
// names come from the stylesheet, so never index those plain objects
// directly.
const aliases = new Map(Object.entries(data.aliases));

const VENDOR_PREFIX = /^-\w+-/v;

/**
 * Return the name the generated data knows a property by: collapse prefixed
 * spellings onto the property they alias, and drop a prefix webref has no
 * alias for.
 *
 * @param {string} prop
 * @return {string}
 */
export function resolveProperty(prop) {
  const name = prop.toLowerCase();
  const alias = aliases.get(name);
  if (alias !== undefined) {
    return alias;
  }
  if (name.startsWith('-')) {
    const unprefixed = name.replace(VENDOR_PREFIX, '');
    return aliases.get(unprefixed) ?? unprefixed;
  }
  return name;
}

/**
 * The same, for at-rules: `@-webkit-keyframes` is `keyframes`.
 *
 * @param {string} name
 * @return {string}
 */
export function resolveAtRule(name) {
  return name.toLowerCase().replace(VENDOR_PREFIX, '');
}

/**
 * @param {Record<string, number[]>} functions
 * @return {Map<string, number[]>}
 */
function toFunctionMap(functions) {
  return new Map(
    Object.entries(functions).map(([name, args]) => [
      // Strip the trailing `()` webref adds; stylesheets spell the function
      // without it.
      name.slice(0, -2),
      args,
    ])
  );
}
export const cssWideKeywords = data.cssWideKeywords;

// Reserve the predefined counter styles: CSS Counter Styles 3 specifies
// them in an appendix, so webref has no data. Leave a shared name unchanged.
export const predefinedCounterStyles = [
  'arabic-indic',
  'armenian',
  'bengali',
  'cambodian',
  'circle',
  'cjk-decimal',
  'cjk-earthly-branch',
  'cjk-heavenly-stem',
  'decimal',
  'decimal-leading-zero',
  'devanagari',
  'disc',
  'disclosure-closed',
  'disclosure-open',
  'ethiopic-numeric',
  'georgian',
  'gujarati',
  'gurmukhi',
  'hebrew',
  'hiragana',
  'hiragana-iroha',
  'japanese-formal',
  'japanese-informal',
  'kannada',
  'katakana',
  'katakana-iroha',
  'khmer',
  'korean-hangul-formal',
  'korean-hanja-formal',
  'korean-hanja-informal',
  'lao',
  'lower-alpha',
  'lower-armenian',
  'lower-greek',
  'lower-latin',
  'lower-roman',
  'malayalam',
  'mongolian',
  'myanmar',
  'oriya',
  'persian',
  'simp-chinese-formal',
  'simp-chinese-informal',
  'square',
  'tamil',
  'telugu',
  'thai',
  'tibetan',
  'trad-chinese-formal',
  'trad-chinese-informal',
  'upper-alpha',
  'upper-armenian',
  'upper-latin',
  'upper-roman',
];
export const keyframes = {
  atRule: data.atRules.keyframes,
  properties: new Set(data.keyframes.properties),
  /** Keywords an `animation` value holds that are not a keyframes name. */
  reservedKeywords: data.keyframes.reservedKeywords,
};
export const counterStyle = {
  atRule: data.atRules.counterStyle,
  /** Properties whose value can name a counter style directly. */
  properties: new Set(data.counterStyle.properties),
  /** `@counter-style` descriptors that name another counter style. */
  descriptors: new Set(data.counterStyle.descriptors),
  /** Properties whose value can name one inside a function. */
  functionProperties: new Set(data.counterStyle.functionProperties),
  /** Function to the arguments of it that name a counter style. */
  functions: toFunctionMap(data.counterStyle.functions),
  /** Keywords a `list-style` value holds that are not a style name. */
  reservedKeywords: data.counterStyle.reservedKeywords,
};
export const counter = {
  /** Properties that define a counter. */
  properties: new Set(data.counter.properties),
  /** Properties whose value can reference one inside a function. */
  functionProperties: new Set(data.counter.functionProperties),
  /** Function to the arguments of it that name a counter. */
  functions: toFunctionMap(data.counter.functions),
  /** Keywords a counter value holds that are not a counter name. */
  reservedKeywords: data.counter.reservedKeywords,
};
export const grid = {
  /** Properties that define gridline and grid area names. */
  templateProperties: new Set(data.grid.templateProperties),
  /** Properties that place an item against those names. */
  referenceProperties: new Set(data.grid.referenceProperties),
  /** Keywords a grid value holds that are not a line or area name. */
  reservedKeywords: data.grid.reservedKeywords,
};

// Treat the single `reversed()` argument as a counter name per the
// counter-reset grammar; webref has no grammar for it as a function-bearing
// property.
const reversedFunctions = new Map([['reversed', [0]]]);

/**
 * Union every function slot a reducer can rename a name in: a name written
 * there is defined by some grammar, so a reducer may rewrite it and it is
 * not opaque. Merge argument lists instead of overwriting entries, since the
 * maps disagree about which slots a function names.
 */
export const knownFunctions = new Map();
for (const [name, args] of [
  ...counter.functions,
  ...counterStyle.functions,
  ...reversedFunctions,
]) {
  const slots = knownFunctions.get(name);
  knownFunctions.set(name, slots ? [...new Set([...slots, ...args])] : args);
}
