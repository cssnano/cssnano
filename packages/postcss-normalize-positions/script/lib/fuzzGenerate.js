import { random } from '../../../../util/fuzzRng.js';

const properties = [
  'background',
  'background-position',
  'perspective-origin',
  '-webkit-perspective-origin',
];
/** Properties whose value is a comma-separated list of layers. */
const layered = new Set(['background', 'background-position']);
const termsByKind = {
  horizontal: ['left', 'right'],
  vertical: ['top', 'bottom'],
  center: ['center'],
  coordinate: ['0', '12px', '95%', '-1em', '.5rem', '0px'],
  math: ['calc(100% - 5px)', 'min(80%, 40px)', 'clamp(0px, 20%, 100px)'],
};
/** @typedef {keyof typeof termsByKind} TermKind */
const kinds = /** @type {TermKind[]} */ (Object.keys(termsByKind));
const keywordKinds = new Set(['horizontal', 'vertical', 'center']);
const separators = [' ', '  ', '\t', '/**/', ' /**/ '];
/* Components that may not appear inside a <position>; placing one between
 * position terms makes the layer invalid. */
const splitters = [' no-repeat ', ' repeat-x ', ' url(a.png) ', ' fixed '];
const backgroundPrefixes = [
  '',
  'url(image.png) ',
  'url(image.png) no-repeat ',
  'rgb(0 0 0 / 0) ',
];
const sizes = ['', '', ' / cover', '/50% 50%', '  / auto'];
/* Valid three- and four-value positions, which the plugin leaves alone. */
const longPositions = [
  ['left', '10px', 'top'],
  ['center', 'top', '10px'],
  ['right', '10px', 'center'],
  ['bottom', '5%', 'left'],
  ['right', '10px', 'bottom', '20px'],
  ['top', '0', 'left', '0'],
];

/**
 * @typedef {{
 *   text: string,
 *   before: string,
 *   terms: string[],
 *   size: string,
 *   split: boolean,
 *   variable: boolean,
 * }} Layer
 * @typedef {{
 *   css: string,
 *   property: string,
 *   value: string,
 *   layers: Layer[],
 *   branch: string,
 *   semanticKey: string,
 *   features: string[],
 * }} Case
 */

/**
 * Spell a keyword as written, in upper case, or with its first letter
 * escaped; all three are the same CSS identifier.
 *
 * @param {ReturnType<typeof random>} rng @param {string} keyword
 * @return {[string, string]}
 */
function spell(rng, keyword) {
  const spelling = rng.pick(['lower', 'lower', 'upper', 'escaped']);
  if (spelling === 'upper') return [keyword.toUpperCase(), spelling];
  if (spelling === 'escaped')
    return [
      `\\${keyword.codePointAt(0)?.toString(16)} ${keyword.slice(1)}`,
      spelling,
    ];
  return [keyword, spelling];
}

/**
 * @param {ReturnType<typeof random>} rng @param {string[]} features
 * @return {{terms: string[], shape: string}}
 */
function positionTerms(rng, features) {
  const roll = rng.int(20);
  if (roll < 2) {
    const terms = rng.pick(longPositions);
    return { terms: [...terms], shape: `long-${terms.length}` };
  }
  const length = roll < 6 ? 1 : 2;
  const termKinds = Array.from({ length }, () => rng.pick(kinds));
  const terms = termKinds.map((kind) => {
    const term = rng.pick(termsByKind[kind]);
    if (!keywordKinds.has(kind)) return term;
    const [spelled, spelling] = spell(rng, term);
    features.push(`spelling:${spelling}`);
    return spelled;
  });
  return { terms, shape: termKinds.join('-') };
}

/**
 * @param {ReturnType<typeof random>} rng @param {string} property
 * @param {boolean} later @param {string[]} features
 * @return {{layer: Layer, shape: string}}
 */
function layerFor(rng, property, later, features) {
  const { terms, shape } = positionTerms(rng, features);
  const background = property === 'background';
  const variable = rng.chance(0.08);
  if (variable) terms.splice(rng.int(terms.length + 1), 0, 'var(--p)');
  const split = terms.length > 1 && rng.chance(0.12);
  const separator = rng.pick(separators);
  const splitter = split ? rng.pick(splitters) : '';
  const before =
    (later ? rng.pick(['', ' ']) : '') +
    (background ? rng.pick(backgroundPrefixes) : '');
  const size = background && !split ? rng.pick(sizes) : '';
  const position =
    terms[0] + (splitter || separator) + terms.slice(1).join(separator);
  features.push(
    `shape:${shape}`,
    `separator:${separator.includes('/*') ? 'comment' : 'whitespace'}`
  );
  if (split) features.push('context:split');
  if (variable) features.push('variable');
  if (before.trim()) features.push('context:background-components');
  if (size) features.push('boundary:slash');
  return {
    layer: {
      text: before + (terms.length > 1 ? position : terms[0]) + size,
      before,
      terms,
      size,
      split,
      variable,
    },
    shape: `${shape}${split ? '+split' : ''}${variable ? '+var' : ''}`,
  };
}

/** @param {ReturnType<typeof random>} rng @return {Case} */
function caseFor(rng) {
  const property = rng.pick(properties);
  const count = layered.has(property) && rng.chance(0.3) ? 2 : 1;
  /** @type {string[]} */ const features = [`property:${property}`];
  const built = Array.from({ length: count }, (_, index) =>
    layerFor(rng, property, index > 0, features)
  );
  if (count > 1) features.push('layers:multiple');
  const layers = built.map(({ layer }) => layer);
  const value = layers.map((layer) => layer.text).join(',');
  return {
    css: `a{${property}:${value}}`,
    property,
    value,
    layers,
    branch: built[0].shape,
    semanticKey: [property, ...built.map(({ shape }) => shape)].join('|'),
    features,
  };
}

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

export { collisionCases, generate };
