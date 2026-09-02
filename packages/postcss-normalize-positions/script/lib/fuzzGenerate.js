import { random } from '../../../../util/fuzzRng.js';

const properties = [
  'background',
  'background-position',
  'perspective-origin',
  '-webkit-perspective-origin',
];
const horizontal = ['left', 'right'];
const vertical = ['top', 'bottom'];
const coordinates = ['0', '12px', '95%', '-1em'];
const mathCoordinates = [
  'calc(100% - 5px)',
  'min(80%, 40px)',
  'clamp(0px, 20%, 100px)',
];

/** @typedef {{value:string, branch:string, features:string[], shape:string}} Position */
/** @typedef {{css:string, branch:string, semanticKey:string, features:string[]}} Case */

/** @param {ReturnType<typeof random>} rng @param {boolean} excludePrefixAmbiguity @return {Position} */
function position(rng, excludePrefixAmbiguity = false) {
  const builders = [
    () => ({
      value: rng.pick(['center', ...horizontal]),
      branch: 'single-keyword',
      features: [],
      shape: 'keyword',
    }),
    () => ({
      value: `${rng.pick([...horizontal, ...vertical, 'center'])} center`,
      branch: 'keyword-center',
      features: [],
      shape: 'keyword-center',
    }),
    () => ({
      value: `center ${rng.pick([...horizontal, ...vertical])}`,
      branch: 'center-keyword',
      features: [],
      shape: 'center-keyword',
    }),
    () => ({
      value: `${rng.pick(horizontal)} ${rng.pick(vertical)}`,
      branch: 'keyword-pair',
      features: [],
      shape: 'horizontal-vertical',
    }),
    () => ({
      value: `${rng.pick(vertical)} ${rng.pick(horizontal)}`,
      branch: 'keyword-pair-reversed',
      features: [],
      shape: 'vertical-horizontal',
    }),
    () => ({
      value: `${rng.pick(coordinates)} center`,
      branch: 'arbitrary-coordinate',
      features: ['coordinate'],
      shape: 'coordinate-center',
    }),
    () => ({
      value: `${rng.pick(mathCoordinates)} center`,
      branch: 'nested-math-coordinate',
      features: ['nested', 'coordinate'],
      shape: 'math-center',
    }),
    () => ({
      value: `center var(--position-${rng.int(8)})`,
      branch: 'variable-abort',
      features: ['variable'],
      shape: 'variable',
    }),
  ];
  return rng.pick(
    builders.filter(
      (_, index) =>
        !excludePrefixAmbiguity || (index !== 0 && index !== 1 && index !== 2)
    )
  )();
}

/** @param {ReturnType<typeof random>} rng @return {Case} */
function caseFor(rng) {
  const property = rng.pick(properties);
  const prefix =
    property === 'background'
      ? rng.pick(['', 'url(image.png) no-repeat ', 'rgb(0 0 0 / 0) '])
      : '';
  const first = position(rng, Boolean(prefix));
  const useLayers = property === 'background' && rng.chance(0.3);
  const second = useLayers ? position(rng) : undefined;
  const suffix =
    property === 'background' && !prefix && rng.chance(0.45) ? ' / cover' : '';
  const value = `${prefix}${first.value}${suffix}${
    second ? `, ${second.value}` : ''
  }`;
  const spaces = rng.pick([' ', '  ', '\t']);
  const css = `a{${property}:${value.replaceAll(' ', spaces)}}`;
  const features = [
    `property:${property}`,
    `context:${prefix ? 'background-components' : 'bare'}`,
    `boundary:${suffix ? 'slash' : 'none'}`,
    `layers:${second ? 'multiple' : 'single'}`,
    ...first.features,
    ...(second?.features ?? []),
  ];
  return {
    css,
    branch: second ? `${first.branch}+comma-layer` : first.branch,
    semanticKey: [
      property,
      first.shape,
      second?.shape ?? 'no-second-layer',
      prefix ? 'background-components' : 'bare',
      suffix ? 'slash' : 'no-slash',
    ].join('|'),
    features,
  };
}

const branches = [
  'single-keyword',
  'keyword-center',
  'center-keyword',
  'keyword-pair',
  'keyword-pair-reversed',
  'arbitrary-coordinate',
  'nested-math-coordinate',
  'variable-abort',
];

const collisionCases = [
  {
    css: 'a.collision0{background-position:url("left center") left bottom}',
    expected: 'url("left center") 0 100%',
    feature: 'collision:quoted-keyword',
  },
  {
    css: 'a.collision1{background-position:linear-gradient(to right) right bottom}',
    expected: 'linear-gradient(to right) 100% 100%',
    feature: 'collision:function-name',
  },
  {
    css: 'a.collision2{background-position:right 10px bottom 20px}',
    expected: 'right 10px bottom 20px',
    feature: 'protected:four-component-position',
  },
];

/** @param {number} seed @param {number} count @return {Generator<Case>} */
function* generate(seed, count) {
  const rng = random(seed);
  for (let index = 0; index < count; index++) yield caseFor(rng);
}

export { branches, collisionCases, generate };
