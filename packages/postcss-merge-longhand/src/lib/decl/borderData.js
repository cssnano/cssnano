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
export const physicalRadiusLonghands = [
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
];
export const physicalRadiusProperties = new Set([
  'border-radius',
  ...physicalRadiusLonghands,
]);
export const logicalRadiusProperties = new Set([
  'border-start-start-radius',
  'border-start-end-radius',
  'border-end-start-radius',
  'border-end-end-radius',
  'border-block-start-radius',
  'border-block-end-radius',
  'border-inline-start-radius',
  'border-inline-end-radius',
]);
export const otherRadiusProperties = new Set([
  'border-top-radius',
  'border-right-radius',
  'border-bottom-radius',
  'border-left-radius',
]);
export const allRadiusProperties = new Set([
  ...physicalRadiusProperties,
  ...logicalRadiusProperties,
  ...otherRadiusProperties,
]);

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
