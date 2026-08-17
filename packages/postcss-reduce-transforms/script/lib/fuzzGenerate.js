'use strict';

/**
 * Random `transform` declarations, biased toward the argument patterns each
 * reducer in `src/index.js` actually branches on (matched sx/sy, a zeroed
 * component, a unit-vector rotation axis, the `matrix3d()` affine pattern)
 * so most generated cases exercise a rename rather than passing through
 * untouched. `fuzzEvaluate.js` can say exactly what each generated function
 * means, so there's no need to special-case "will this match anything" the
 * way `postcss-minify-selectors`' generator does.
 */

const { random } = require('../../../../util/fuzzRng.js');

const lengthUnits = ['px', '%', 'em', 'vw'];
const angleUnits = ['deg', 'rad', 'turn', 'grad'];

/**
 * @param {number} n
 * @return {string}
 */
function formatNumber(n) {
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function length(rng) {
  const unit = rng.pick(lengthUnits);
  if (rng.chance(0.3)) return `0${unit}`;
  return `${formatNumber((rng.int(2000) - 1000) / 10)}${unit}`;
}

/**
 * A unitless scale/matrix component, biased toward 0, 1 and -1 — the values
 * `scale()`, `scale3d()`, `matrix3d()`'s reducers compare against.
 *
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function factor(rng) {
  if (rng.chance(0.25)) return '1';
  if (rng.chance(0.2)) return '0';
  if (rng.chance(0.1)) return '-1';
  return formatNumber((rng.int(400) - 200) / 100);
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function angle(rng) {
  const unit = rng.pick(angleUnits);
  if (rng.chance(0.2)) return `0${unit}`;
  return `${formatNumber(rng.int(721) - 360)}${unit}`;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function axisComponent(rng) {
  if (rng.chance(0.5)) return rng.pick(['0', '1']);
  return formatNumber((rng.int(400) - 200) / 100);
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genMatrix(rng) {
  return `matrix(${Array.from({ length: 6 }, () => factor(rng)).join(',')})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genMatrix3d(rng) {
  if (rng.chance(0.5)) {
    // The affine pattern `reduce()` collapses to `matrix(a,b,c,d,tx,ty)`.
    const [a, b, c, d, tx, ty] = Array.from({ length: 6 }, () => factor(rng));
    return `matrix3d(${a},${b},0,0,${c},${d},0,0,0,0,1,0,${tx},${ty},0,1)`;
  }
  return `matrix3d(${Array.from({ length: 16 }, () => factor(rng)).join(',')})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genTranslate(rng) {
  if (rng.chance(0.35)) return `translate(${length(rng)},0)`;
  if (rng.chance(0.35)) return `translate(0,${length(rng)})`;
  return `translate(${length(rng)},${length(rng)})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genTranslate3d(rng) {
  if (rng.chance(0.4)) return `translate3d(0,0,${length(rng)})`;
  return `translate3d(${length(rng)},${length(rng)},${length(rng)})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genScale(rng) {
  if (rng.chance(0.25)) {
    const v = factor(rng);
    return `scale(${v},${v})`;
  }
  if (rng.chance(0.25)) return `scale(${factor(rng)},1)`;
  if (rng.chance(0.25)) return `scale(1,${factor(rng)})`;
  return `scale(${factor(rng)},${factor(rng)})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genScale3d(rng) {
  if (rng.chance(0.25)) return `scale3d(${factor(rng)},1,1)`;
  if (rng.chance(0.25)) return `scale3d(1,${factor(rng)},1)`;
  if (rng.chance(0.25)) return `scale3d(1,1,${factor(rng)})`;
  return `scale3d(${factor(rng)},${factor(rng)},${factor(rng)})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genRotateZ(rng) {
  return `${rng.pick(['rotateZ', 'ROTATEZ', 'RotateZ'])}(${angle(rng)})`;
}

/** @param {ReturnType<typeof random>} rng @return {string} */
function genRotate3d(rng) {
  if (rng.chance(0.6)) {
    const axis = rng.pick([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    return `rotate3d(${axis.join(',')},${angle(rng)})`;
  }
  return `rotate3d(${axisComponent(rng)},${axisComponent(rng)},${axisComponent(rng)},${angle(rng)})`;
}

/**
 * Functions the plugin never renames, mixed in so the generated `transform`
 * lists aren't exclusively made of functions under test.
 *
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function genNoise(rng) {
  const kind = rng.pick([
    'rotate',
    'rotateX',
    'rotateY',
    'translateX',
    'translateY',
    'translateZ',
    'scaleX',
    'scaleY',
    'scaleZ',
    'skew',
    'skewX',
    'skewY',
    'perspective',
  ]);

  switch (kind) {
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
      return `${kind}(${angle(rng)})`;
    case 'translateX':
    case 'translateY':
    case 'translateZ':
      return `${kind}(${length(rng)})`;
    case 'scaleX':
    case 'scaleY':
    case 'scaleZ':
      return `${kind}(${factor(rng)})`;
    case 'skew':
      return `skew(${angle(rng)},${angle(rng)})`;
    case 'skewX':
    case 'skewY':
      return `${kind}(${angle(rng)})`;
    default:
      return `perspective(${rng.int(2000) + 1}px)`;
  }
}

const reducibleGenerators = [
  genMatrix,
  genMatrix3d,
  genRotate3d,
  genRotateZ,
  genScale,
  genScale3d,
  genTranslate,
  genTranslate3d,
];

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function transformFunction(rng) {
  if (rng.chance(0.15)) return genNoise(rng);
  return rng.pick(reducibleGenerators)(rng);
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function rule(rng) {
  const count = rng.int(3) + 1;
  const functions = Array.from({ length: count }, () =>
    transformFunction(rng)
  ).join(' ');
  const property = rng.chance(0.15) ? '-webkit-transform' : 'transform';

  return `a{${property}:${functions}}`;
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {Generator<string>}
 */
function* generate(seed, count) {
  const rng = random(seed);

  for (let i = 0; i < count; i++) {
    yield rule(rng);
  }
}

/**
 * Drops one space-separated function at a time from the `transform` list
 * while `fails` keeps reporting a mismatch, same greedy strategy as
 * `postcss-merge-longhand`'s declaration-level shrink.
 *
 * @param {string} css
 * @param {(candidate: string) => boolean} fails
 * @return {string}
 */
function shrink(css, fails) {
  const match = /^(a\{(?:-webkit-)?transform:)(.*)(\})$/.exec(css);

  if (!match) {
    return css;
  }

  const [, head, body, tail] = match;
  let functions = body.split(' ');

  for (let i = functions.length - 1; i >= 0; i--) {
    const candidate = functions.filter((_, index) => index !== i);

    if (candidate.length > 0 && fails(`${head}${candidate.join(' ')}${tail}`)) {
      functions = candidate;
    }
  }

  return `${head}${functions.join(' ')}${tail}`;
}

module.exports = { generate, shrink };
