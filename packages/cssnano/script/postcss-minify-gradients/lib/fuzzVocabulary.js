/**
 * Gradient functions, colours, positions and spellings the fuzzer draws from.
 */

export const gradientFunctions = [
  { name: 'linear-gradient', kind: 'linear' },
  { name: 'repeating-linear-gradient', kind: 'linear' },
  { name: '-webkit-linear-gradient', kind: 'linear' },
  { name: '-webkit-repeating-linear-gradient', kind: 'linear' },
  { name: 'radial-gradient', kind: 'radial' },
  { name: 'repeating-radial-gradient', kind: 'radial' },
  { name: '-webkit-radial-gradient', kind: 'radial' },
  { name: '-webkit-repeating-radial-gradient', kind: 'radial' },
  { name: 'conic-gradient', kind: 'conic' },
];

/** Leading arguments a linear gradient may hold; `angle` is the shorter `to <side>`. */
const linearSpecifications = [
  { text: '', kind: 'none', angle: '' },
  { text: 'to top', kind: 'to-side', angle: '0deg' },
  { text: 'to right', kind: 'to-side', angle: '90deg' },
  { text: 'to bottom', kind: 'to-side', angle: '180deg' },
  { text: 'to left', kind: 'to-side', angle: '270deg' },
  { text: 'to top left', kind: 'to-corner', angle: '' },
  { text: '45deg', kind: 'angle', angle: '' },
  { text: '0.25turn', kind: 'angle', angle: '' },
  { text: 'left', kind: 'legacy-side', angle: '' },
];
const radialSpecifications = [
  { text: '', kind: 'none', angle: '' },
  { text: 'circle', kind: 'shape', angle: '' },
  { text: 'ellipse at center', kind: 'shape-at', angle: '' },
  { text: 'circle closest-side at 20% 30%', kind: 'shape-at', angle: '' },
  { text: 'at 50%', kind: 'at', angle: '' },
];
const conicSpecifications = [
  { text: '', kind: 'none', angle: '' },
  { text: 'from 0deg', kind: 'from', angle: '' },
  { text: 'at 50% 50%', kind: 'at', angle: '' },
  { text: 'from 10deg at center', kind: 'from-at', angle: '' },
];
export const specificationPools = {
  linear: linearSpecifications,
  radial: radialSpecifications,
  conic: conicSpecifications,
};

/** Arguments generated after the stops; the fixup still scans them for positions. */
export const trailingSpecifications = [
  {
    kind: 'to-side',
    tokens: [
      { text: 'to', number: undefined, unit: '' },
      { text: 'right', number: undefined, unit: '' },
    ],
    tokenSeparators: [' '],
  },
  {
    kind: 'angle',
    tokens: [{ text: '45deg', number: 45, unit: 'deg' }],
    tokenSeparators: [],
  },
  {
    kind: 'shape',
    tokens: [{ text: 'circle', number: undefined, unit: '' }],
    tokenSeparators: [],
  },
  {
    kind: 'zero',
    tokens: [{ text: '0px', number: 0, unit: 'px' }],
    tokenSeparators: [],
  },
];

/**
 * Functions the generated gradient may sit inside. `gradient` makes the inner
 * gradient the outer's leading colour stop, the nesting the position fixup
 * must not corrupt.
 */
export const nestings = [
  { kind: 'none', before: '', after: '' },
  { kind: 'color-mix', before: 'color-mix(in srgb, ', after: ', blue)' },
  { kind: 'light-dark', before: 'light-dark(', after: ', lime)' },
  { kind: 'gradient', before: 'linear-gradient(', after: ' 25%, red)' },
];

export const colorPool = [
  { text: 'red', kind: 'named' },
  { text: 'plum', kind: 'named' },
  { text: 'RED', kind: 'named' },
  { text: 'transparent', kind: 'named' },
  { text: '#fff', kind: 'hex' },
  { text: '#AbCdEf', kind: 'hex' },
  { text: 'rgb(0 0 0 / 50%)', kind: 'functional' },
  { text: 'rgba(0,0,0,.5)', kind: 'functional' },
  { text: 'hsl(120deg 50% 50%)', kind: 'functional' },
  { text: 'currentColor', kind: 'currentcolor' },
  { text: 'canvas', kind: 'system' },
  { text: 'buttontext', kind: 'system' },
];

/**
 * Positions with their numeric meaning under `numeric()`: `number` is
 * `undefined` exactly where the implementation cannot parse one, so the scan
 * loses its running maximum there.
 */
export const positionPool = [
  { text: '0', number: 0, unit: '', kind: 'zero-unitless' },
  { text: '0%', number: 0, unit: '%', kind: 'zero-percent' },
  { text: '0px', number: 0, unit: 'px', kind: 'zero-length' },
  { text: '0EM', number: 0, unit: 'em', kind: 'zero-length' },
  { text: '0rem', number: 0, unit: 'rem', kind: 'zero-length' },
  { text: '0CQW', number: 0, unit: 'cqw', kind: 'zero-length' },
  { text: '0svh', number: 0, unit: 'svh', kind: 'zero-length' },
  { text: '0ic', number: 0, unit: 'ic', kind: 'zero-length' },
  { text: '0Q', number: 0, unit: 'q', kind: 'zero-length' },
  { text: '12%', number: 12, unit: '%', kind: 'percent' },
  { text: '37.5%', number: 37.5, unit: '%', kind: 'percent' },
  { text: '100%', number: 100, unit: '%', kind: 'percent' },
  { text: '-10%', number: -10, unit: '%', kind: 'negative' },
  { text: '-3PX', number: -3, unit: 'px', kind: 'negative' },
  { text: '50px', number: 50, unit: 'px', kind: 'length' },
  { text: '10deg', number: 10, unit: 'deg', kind: 'angle' },
  { text: '0deg', number: 0, unit: 'deg', kind: 'angle-zero' },
  { text: 'calc(0% + 10px)', number: undefined, unit: '', kind: 'calc' },
  { text: 'calc(10px)', number: undefined, unit: '', kind: 'calc' },
];

// PostCSS hoists comments out of declaration values before any plugin runs,
// so the value the plugin sees holds only whitespace where a comment sat.
export const argumentSeparators = [', ', ',  ', ',\t'];
export const colourSeparators = [' ', '  ', '\t'];
export const positionSeparators = [' ', '  ', '\t'];
export const layerPrefixes = ['', 'url(a.png), '];
