import spec from '../spec.js';

export const widthStyleColor = spec.borderComponents;
/** @param {string[]} parts */
export const borderProperty = (...parts) => `border-${parts.join('-')}`;
export const physicalBorderShorthands = spec.sides.map((side) =>
  borderProperty(side)
);
export const allSidesBorderShorthands = spec.shorthand('border').longhands;

/** @type {string[]} */
const physicalDirectionalProperties = [];
for (const direction of physicalBorderShorthands) {
  for (const prop of widthStyleColor)
    physicalDirectionalProperties.push(`${direction}-${prop}`);
}

export const defaultBorderValues = allSidesBorderShorthands.map(
  (prop) => /** @type {string} */ (spec.initialValues.get(prop))
);
export const borderAndSideShorthands = new Set([
  'border',
  ...physicalBorderShorthands,
]);
export const directionalPhysicalProperties = new Set([
  ...physicalBorderShorthands,
  ...physicalDirectionalProperties,
]);
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
  const p = prop.toLowerCase();
  for (let i = 0; i < precedence.length; i++) {
    if (precedence[i].includes(p)) return i;
  }
}
