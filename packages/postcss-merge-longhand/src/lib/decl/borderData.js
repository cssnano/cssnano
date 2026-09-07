import spec from '../spec.js';

export const widthStyleColor = spec.borderComponents;

/**
 * @param {...string} parts
 * @return {string}
 */
export function borderProperty(...parts) {
  return `border-${parts.join('-')}`;
}

export const physicalBorderShorthands = spec.sides.map((side) =>
  borderProperty(side)
);
export const allSidesBorderShorthands = spec.shorthand('border').longhands;
/** @type {string[]} */
const physicalDirectionalProperties = [];
for (const direction of physicalBorderShorthands) {
  for (const prop of widthStyleColor) {
    physicalDirectionalProperties.push(`${direction}-${prop}`);
  }
}

export const defaultBorderValues = allSidesBorderShorthands.map(
  (prop) => /** @type {string} */ (spec.initialValues.get(prop))
);
/* `border` and the shorthand for each side of the box. */
export const borderAndSideShorthands = new Set([
  'border',
  ...physicalBorderShorthands,
]);
/* Those, and the properties they are made of. */
export const directionalPhysicalProperties = new Set([
  ...physicalBorderShorthands,
  ...physicalDirectionalProperties,
]);
/* What `border` resets without being able to set. */
export const borderImageProperties = new Set(spec.shorthand('border').resets);

const precedence = [
  ['border'],
  physicalBorderShorthands.concat(allSidesBorderShorthands),
  physicalDirectionalProperties,
];

export const allPhysicalBorderProperties = new Set(precedence.flat());
export const borderResetRules = new WeakSet();

/**
 * @param {string} prop
 * @return {number | undefined}
 */
export function getLevel(prop) {
  for (let i = 0; i < precedence.length; i++) {
    if (precedence[i].includes(prop.toLowerCase())) {
      return i;
    }
  }
  return undefined;
}
