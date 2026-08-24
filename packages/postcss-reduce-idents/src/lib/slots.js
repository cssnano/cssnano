import data from '../data/identSlots.json' with { type: 'json' };

// The generated file is JSON, so its maps arrive as plain objects. Property
// and function names come from the stylesheet, and `constructor` or `toString`
// are things a declaration can be called, so never index those objects
// directly.
const aliases = new Map(Object.entries(data.aliases));

const VENDOR_PREFIX = /^-\w+-/;

/**
 * The name the generated data knows a property by: vendor prefixed spellings
 * collapse onto the property they alias, and a prefix webref has no alias for
 * is dropped, since `-moz-animation-name` names keyframes just as
 * `animation-name` does.
 *
 * @param {string} prop
 * @return {string}
 */
function resolveProperty(prop) {
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
function resolveAtRule(name) {
  return name.toLowerCase().replace(VENDOR_PREFIX, '');
}

/**
 * @param {Record<string, number[]>} functions
 * @return {Map<string, number[]>}
 */
function toFunctionMap(functions) {
  return new Map(
    Object.entries(functions).map(([name, args]) => [
      // Stylesheets spell a function without the trailing `()` webref names it
      // by, and postcss-value-parser reports it that way too.
      name.slice(0, -2),
      args,
    ])
  );
}
export const cssWideKeywords = data.cssWideKeywords;
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
export { resolveProperty };
export { resolveAtRule };
export default {
  resolveProperty,
  resolveAtRule,
  cssWideKeywords,
  keyframes,
  counterStyle,
  counter,
  grid,
};
