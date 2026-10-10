import cssnanoUtils from 'cssnano-utils';
import spec from '../spec.js';

const { asciiLowerCase } = cssnanoUtils;

export const widthStyleColor = spec.borderComponents;
export const sides = spec.sides;
/** @param {string[]} parts */
const borderProperty = (...parts) => `border-${parts.join('-')}`;
const physicalBorderShorthands = spec.sides.map((side) => borderProperty(side));
export const allSidesBorderShorthands = spec.shorthand('border').longhands;

/** @type {string[]} */
const physicalDirectionalProperties = [];
for (const direction of physicalBorderShorthands) {
  for (const prop of widthStyleColor)
    physicalDirectionalProperties.push(`${direction}-${prop}`);
}

export const borderAndSideShorthands = new Set([
  'border',
  ...physicalBorderShorthands,
]);
/* `border`, the side shorthands and the component shorthands. */
export const allBorderShorthands = new Set([
  ...borderAndSideShorthands,
  ...allSidesBorderShorthands,
]);

/* The twelve longhands in cell order: the cell of side `s` and component `c`
 * is `s * 3 + c`. */
export const cellProperties = sides.flatMap((side) =>
  widthStyleColor.map((component) => `border-${side}-${component}`)
);
/** @type {Map<string, number>} */
export const borderPropertyToCellIndex = new Map(
  cellProperties.map((prop, index) => [prop, index])
);
/* The cells one side shorthand, or one component shorthand, sets. */
export const sideCells = sides.map((_, s) => [s * 3, s * 3 + 1, s * 3 + 2]);
export const componentCells = widthStyleColor.map((_, c) => [
  c,
  c + 3,
  c + 6,
  c + 9,
]);
export const borderImageProperties = new Set(spec.shorthand('border').resets);

const precedence = [
  ['border'],
  physicalBorderShorthands.concat(allSidesBorderShorthands),
  physicalDirectionalProperties,
];

export const allPhysicalBorderProperties = new Set(precedence.flat());
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
const logicalRadiusProperties = new Set([
  'border-start-start-radius',
  'border-start-end-radius',
  'border-end-start-radius',
  'border-end-end-radius',
  'border-block-start-radius',
  'border-block-end-radius',
  'border-inline-start-radius',
  'border-inline-end-radius',
]);
const otherRadiusProperties = new Set([
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

/** @type {Map<string, number>} */
const levelMap = new Map();
for (let i = 0; i < precedence.length; i++) {
  for (const p of precedence[i]) {
    levelMap.set(p, i);
  }
}

/**
 * @param {string} prop
 * @return {number | undefined}
 */
export function getLevel(prop) {
  return levelMap.get(asciiLowerCase(prop));
}
