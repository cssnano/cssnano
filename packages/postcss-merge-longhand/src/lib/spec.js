import data from '../data/longhands.json' with { type: 'json' };

/**
 * The shorthand structure and keyword sets the transforms rely on, derived from
 * the specifications by `script/acquire.mjs`. The generated file is JSON, so
 * shorthands and initialValues deserialize as plain objects; wrap entries in
 * Map() to enable safe .get() lookup of property names from the stylesheet.
 */
const shorthands = new Map(Object.entries(data.shorthands));
const initialValues = new Map(Object.entries(data.initialValues));

/**
 * @param {string} name
 * @return {{longhands: string[], resets: string[]}}
 */
function shorthand(name) {
  const definition = shorthands.get(name);

  if (!definition) {
    throw new Error(`${name} is not a shorthand the generated data covers`);
  }

  return definition;
}

/** @type {Map<string, Set<string>>} */
const setsCache = new Map();

/**
 * All properties set when applying a shorthand: recursively follows each
 * shorthand through its named longhands and implicit resets. A property that
 * the generated data does not list as a shorthand sets only itself.
 *
 * Longhands often collide despite dissimilar names: `border-top` and
 * `border-color` both set `border-top-color` without any name overlap;
 * `border` and `border-image-source` collide despite sharing no segments.
 * Such collisions cannot be detected from property names alone.
 *
 * @param {string} name lower-cased
 * @return {Set<string>}
 */
function setsLonghands(name) {
  const cached = setsCache.get(name);

  if (cached) {
    return cached;
  }

  const definition = shorthands.get(name);

  if (!definition) {
    const own = new Set([name]);

    setsCache.set(name, own);
    return own;
  }

  /** @type {Set<string>} */
  const reached = new Set();

  for (const longhand of [...definition.longhands, ...definition.resets]) {
    for (const property of setsLonghands(longhand)) {
      reached.add(property);
    }
  }

  setsCache.set(name, reached);
  return reached;
}
export const sides = data.sides;
export const borderComponents = data.borderComponents;
export const borderProperties = new Set(data.borderProperties);
export const flowRelativeBorderProperties = new Set(
  data.flowRelativeBorderProperties
);
export const cssWideKeywords = new Set(data.cssWideKeywords);
export const lineStyles = new Set(data.lineStyles);
export const lineWidthKeywords = new Set(data.lineWidthKeywords);
export const namedColors = new Set(data.namedColors);
export const colorFunctions = new Set(data.colorFunctions);
export { setsLonghands };
export { shorthand };
export { initialValues };
export default {
  sides,
  setsLonghands,
  borderComponents,
  shorthand,
  initialValues,
  borderProperties,
  flowRelativeBorderProperties,
  cssWideKeywords,
  lineStyles,
  lineWidthKeywords,
  namedColors,
  colorFunctions,
};
