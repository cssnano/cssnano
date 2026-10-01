import { TokenType } from '@csstools/css-tokenizer';

/**
 * Row-major 4x4 matrices for the transform functions the fuzzer models,
 * following the CSS Transforms Level 2 definitions of each function.
 */

/**
 * @return {number[]} identity, row-major
 */
function identity() {
  // prettier-ignore
  return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

/**
 * @param {number} value
 * @param {string} unit
 * @return {number}
 */
function toRadians(value, unit) {
  switch (unit) {
    case 'rad':
      return value;
    case 'grad':
      return (value * Math.PI) / 200;
    case 'turn':
      return value * 2 * Math.PI;
    default:
      // 'deg', or unitless (invalid CSS, but keep a definition for it)
      return (value * Math.PI) / 180;
  }
}

/**
 * Rodrigues' rotation formula, as `rotate3d()` defines it for a normalised
 * axis.
 *
 * @param {[number, number, number]} axis
 * @param {number} angleRad
 * @return {number[]}
 */
function rotationMatrix([x, y, z], angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;
  // prettier-ignore
  return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0,
        0, 0, 0, 1,
    ];
}

/**
 * A translation component's matrix entry. A unitless zero is zero in every
 * unit; other components keep their unit as a tag, because `10px` and `10em`
 * do not resolve alike and `x%`/`y%` resolve against different box
 * dimensions.
 *
 * @param {{value: number, unit: string} | undefined} [component]
 * @return {number | string}
 */
function translationComponent(component) {
  if (!component || component.value === 0) return 0;
  return component.unit
    ? `${component.value}${component.unit}`
    : component.value;
}

/**
 * @param {{value: number, unit: string} | undefined} [tx]
 * @param {{value: number, unit: string} | undefined} [ty]
 * @param {{value: number, unit: string} | undefined} [tz]
 * @return {(number | string)[]}
 */
function translationMatrix(tx, ty, tz) {
  const m = identity();
  m[3] = translationComponent(tx);
  m[7] = translationComponent(ty);
  m[11] = translationComponent(tz);
  return m;
}

/**
 * @param {number} [sx]
 * @param {number} [sy]
 * @param {number} [sz]
 * @return {number[]}
 */
function scaleMatrix(sx = 1, sy = 1, sz = 1) {
  // prettier-ignore
  return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1,
    ];
}

/**
 * @param {number} axRad
 * @param {number} ayRad
 * @return {number[]}
 */
function skewMatrix(axRad, ayRad) {
  const m = identity();
  m[1] = Math.tan(axRad);
  m[4] = Math.tan(ayRad);
  return m;
}

/**
 * `matrix3d()`'s 16 values are column-major; flatten to row-major so every
 * other matrix here shares one layout.
 *
 * @param {number[]} v
 * @return {number[]}
 */
function matrix3dToRowMajor(v) {
  const column = (i) => [v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]];
  const [c0, c1, c2, c3] = [0, 1, 2, 3].map(column);
  // prettier-ignore
  return [
        c0[0], c1[0], c2[0], c3[0],
        c0[1], c1[1], c2[1], c3[1],
        c0[2], c1[2], c2[2], c3[2],
        c0[3], c1[3], c2[3], c3[3],
    ];
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @param {number} e
 * @param {number} f
 * @return {number[]}
 */
function matrix2d(a, b, c, d, e, f) {
  // prettier-ignore
  return [
        a, c, 0, e,
        b, d, 0, f,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken} node
 * @return {{value: number, unit: string}}
 */
function parseNumber(node) {
  if (
    ![TokenType.Number, TokenType.Dimension, TokenType.Percentage].includes(
      node[0]
    )
  ) {
    return { value: Number.NaN, unit: '' };
  }
  return {
    value: node[4].value,
    unit:
      node[4].unit?.toLowerCase() ??
      (node[0] === TokenType.Percentage ? '%' : ''),
  };
}

/**
 * @param {{value: number, unit: string}} component
 * @return {number}
 */
function rad(component) {
  return toRadians(component.value, component.unit);
}

/**
 * One handler per transform function this evaluator models, keyed by lower-
 * cased name — the same shape as `src/index.js`'s own `reducers` Map, kept
 * separate since this one computes a matrix rather than mutating an AST node.
 *
 * @type {Map<string, (nums: number[], parsed: {value: number, unit: string}[]) => (number | string)[]|undefined>}
 */
const matrixFunctions = new Map([
  ['matrix', (nums) => (nums.length === 6 ? matrix2d(...nums) : undefined)],
  [
    'matrix3d',
    (nums) => (nums.length === 16 ? matrix3dToRowMajor(nums) : undefined),
  ],
  [
    'translate',
    (nums, parsed) => {
      if (nums.length === 1) return translationMatrix(parsed[0]);
      if (nums.length === 2) return translationMatrix(parsed[0], parsed[1]);
      return undefined;
    },
  ],
  [
    'translate3d',
    (nums, parsed) =>
      nums.length === 3
        ? translationMatrix(parsed[0], parsed[1], parsed[2])
        : undefined,
  ],
  [
    'translatex',
    (nums, parsed) =>
      nums.length === 1 ? translationMatrix(parsed[0]) : undefined,
  ],
  [
    'translatey',
    (nums, parsed) =>
      nums.length === 1 ? translationMatrix(undefined, parsed[0]) : undefined,
  ],
  [
    'translatez',
    (nums, parsed) =>
      nums.length === 1
        ? translationMatrix(undefined, undefined, parsed[0])
        : undefined,
  ],
  [
    'scale',
    (nums) => {
      if (nums.length === 1) return scaleMatrix(nums[0], nums[0]);
      if (nums.length === 2) return scaleMatrix(nums[0], nums[1]);
      return undefined;
    },
  ],
  [
    'scale3d',
    (nums) =>
      nums.length === 3 ? scaleMatrix(nums[0], nums[1], nums[2]) : undefined,
  ],
  [
    'scalex',
    (nums) => (nums.length === 1 ? scaleMatrix(nums[0], 1, 1) : undefined),
  ],
  [
    'scaley',
    (nums) => (nums.length === 1 ? scaleMatrix(1, nums[0], 1) : undefined),
  ],
  [
    'scalez',
    (nums) => (nums.length === 1 ? scaleMatrix(1, 1, nums[0]) : undefined),
  ],
  [
    'rotate',
    (nums, parsed) =>
      parsed.length === 1
        ? rotationMatrix([0, 0, 1], rad(parsed[0]))
        : undefined,
  ],
  [
    'rotatez',
    (nums, parsed) =>
      parsed.length === 1
        ? rotationMatrix([0, 0, 1], rad(parsed[0]))
        : undefined,
  ],
  [
    'rotatex',
    (nums, parsed) =>
      parsed.length === 1
        ? rotationMatrix([1, 0, 0], rad(parsed[0]))
        : undefined,
  ],
  [
    'rotatey',
    (nums, parsed) =>
      parsed.length === 1
        ? rotationMatrix([0, 1, 0], rad(parsed[0]))
        : undefined,
  ],
  [
    'rotate3d',
    (nums, parsed) => {
      if (parsed.length !== 4) return undefined;
      const [x, y, z] = nums;
      const length = Math.hypot(x, y, z);
      // A zero-length axis rotates about no line; the spec leaves this
      // undefined, so don't assert an evaluator opinion about it.
      if (length === 0) return undefined;
      return rotationMatrix(
        [x / length, y / length, z / length],
        rad(parsed[3])
      );
    },
  ],
  [
    'skew',
    (nums, parsed) => {
      if (parsed.length === 1) return skewMatrix(rad(parsed[0]), 0);
      if (parsed.length === 2)
        return skewMatrix(rad(parsed[0]), rad(parsed[1]));
      return undefined;
    },
  ],
  [
    'skewx',
    (nums, parsed) =>
      parsed.length === 1 ? skewMatrix(rad(parsed[0]), 0) : undefined,
  ],
  [
    'skewy',
    (nums, parsed) =>
      parsed.length === 1 ? skewMatrix(0, rad(parsed[0])) : undefined,
  ],
]);

/**
 * @param {string} name lower-cased function name
 * @param {import('@csstools/css-tokenizer').CSSToken[]} argNodes
 * @return {(number | string)[]|undefined} undefined for functions this evaluator
 * doesn't model (`perspective()`, `var()`, ...); those never get renamed by
 * the plugin, so callers fall back to comparing the argument text verbatim.
 */
export function matrixOfFunction(name, argNodes) {
  const parsed = argNodes
    .filter((node) =>
      [TokenType.Number, TokenType.Dimension, TokenType.Percentage].includes(
        node[0]
      )
    )
    .map(parseNumber);
  const nums = parsed.map(({ value }) => value);

  if (nums.some(Number.isNaN)) {
    return undefined;
  }

  const handler = matrixFunctions.get(name);
  return handler ? handler(nums, parsed) : undefined;
}
