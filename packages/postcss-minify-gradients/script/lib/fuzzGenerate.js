import { random } from '../../../../util/fuzzRng.js';

const gradientFunctions = [
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
const specificationPools = {
  linear: linearSpecifications,
  radial: radialSpecifications,
  conic: conicSpecifications,
};

/** Arguments generated after the stops; the fixup still scans them for positions. */
const trailingSpecifications = [
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
const nestings = [
  { kind: 'none', before: '', after: '' },
  { kind: 'color-mix', before: 'color-mix(in srgb, ', after: ', blue)' },
  { kind: 'light-dark', before: 'light-dark(', after: ', lime)' },
  { kind: 'gradient', before: 'linear-gradient(', after: ' 25%, red)' },
];

const colorPool = [
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
const positionPool = [
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
const argumentSeparators = [', ', ',  ', ',\t'];
const colourSeparators = [' ', '  ', '\t'];
const positionSeparators = [' ', '  ', '\t'];
const layerPrefixes = ['', 'url(a.png), '];

/** @typedef {{text: string, kind: string}} Colour */
/** @typedef {{text: string, number: number | undefined, unit: string, kind: string}} Position */
/**
 * One comma-separated gradient argument as the generator laid it out.
 *
 * @typedef {object} Argument
 * @property {'line' | 'color'} kind
 * @property {string} text Exact source text of the argument.
 * @property {string} color Leading colour text, empty for line arguments.
 * @property {string} colorKind Colour pool kind, `variable` once injected.
 * @property {string} colourSeparator Text between the colour and its first position.
 * @property {Position[]} positions
 * @property {string[]} positionSeparators Separators before positions after the first.
 * @property {string} angle Replacement for a leading `to <side>` argument.
 * @property {Position[]} tokens Trailing argument tokens.
 * @property {string[]} tokenSeparators
 */
/**
 * @typedef {object} Case
 * @property {string} css
 * @property {string} value The declaration value the model describes.
 * @property {string} fnName
 * @property {Argument[]} args
 * @property {string[]} argSeparators
 * @property {string} prefix
 * @property {{kind: string, before: string, after: string}} nesting
 * @property {boolean} aborts
 * @property {string} branch
 * @property {string} semanticKey
 * @property {string[]} features
 */

/** @param {string[]} texts @param {string[]} separators @return {string} */
function joinWith(texts, separators) {
  let result = '';
  for (const [index, text] of texts.entries()) {
    if (index) result += separators[index - 1];
    result += text;
  }
  return result;
}

/** @param {ReturnType<typeof random>} rng @param {string | undefined} abortKind @return {Position} */
function position(rng, abortKind) {
  if (abortKind === 'nested-var')
    return {
      text: 'calc(var(--x))',
      number: undefined,
      unit: '',
      kind: 'calc',
    };
  if (abortKind === 'var' || abortKind === 'env')
    return {
      text: abortKind === 'var' ? 'var(--p)' : 'env(safe-area-inset-top)',
      number: undefined,
      unit: '',
      kind: 'variable',
    };
  return rng.pick(positionPool);
}

/** @param {number} roll @return {number} */
function positionCount(roll) {
  if (roll < 3) return 0;
  return roll < 9 ? 1 : 2;
}

/** @param {Argument[]} stops @return {string} */
function shapeOf(stops) {
  const count = stops[0].positions.length;
  if (count === 0) return 'positionless';
  return count === 1 ? 'single' : 'double';
}

/** @param {ReturnType<typeof random>} rng @param {string | undefined} abortKind @return {Argument} */
function colourStop(rng, abortKind) {
  const colour = rng.pick(colorPool);
  const count = positionCount(rng.int(10));
  /** @type {Position[]} */
  const positions = [];
  /** @type {string[]} */
  const separators = [];
  for (let index = 0; index < count; index++) {
    if (index) separators.push(rng.pick(positionSeparators));
    positions.push(position(rng, abortKind));
  }
  return {
    kind: 'color',
    text: '',
    color: colour.text,
    colorKind: colour.kind,
    colourSeparator: count ? rng.pick(colourSeparators) : '',
    positions,
    positionSeparators: separators,
    angle: '',
    tokens: [],
    tokenSeparators: [],
  };
}

/** @param {ReturnType<typeof random>} rng @param {Argument[]} stops @param {string} abortKind */
function injectAbort(rng, stops, abortKind) {
  const text =
    abortKind === 'env' ? 'env(safe-area-inset-top)' : `var(--c${rng.int(8)})`;
  const positioned = stops.filter((stop) => stop.positions.length);
  if (positioned.length && rng.chance(0.5)) {
    const stop = rng.pick(positioned);
    stop.positions[rng.int(stop.positions.length)] = {
      text,
      number: undefined,
      unit: '',
      kind: 'variable',
    };
    return;
  }
  const stop = stops[rng.int(stops.length)];
  stop.color = text;
  stop.colorKind = 'variable';
  stop.colourSeparator = '';
  stop.positions = [];
  stop.positionSeparators = [];
}

/** @param {string} text @param {string} angle @param {Position[]} tokens @param {string[]} tokenSeparators @return {Argument} */
function lineArgument(text, angle, tokens, tokenSeparators) {
  return {
    kind: 'line',
    text,
    color: '',
    colorKind: '',
    colourSeparator: '',
    positions: [],
    positionSeparators: [],
    angle,
    tokens,
    tokenSeparators,
  };
}

/** @param {Argument} stop @return {Argument} */
function stopArgument(stop) {
  const positionTexts = stop.positions.map((stopPosition) => stopPosition.text);
  return {
    ...stop,
    text:
      stop.color +
      stop.colourSeparator +
      joinWith(positionTexts, stop.positionSeparators),
  };
}

/** @param {Argument[]} stops @param {string} prefix @param {string} fnName @return {string[]} */
function featuresFor(stops, prefix, fnName) {
  const features = [
    `fn:${fnName}`,
    `stops:${stops.length}`,
    `shape:${shapeOf(stops)}`,
    `context:${prefix ? 'layered' : 'bare'}`,
  ];
  for (const stop of stops) {
    features.push(`color:${stop.colorKind}`);
    for (const stopPosition of stop.positions)
      features.push(`pos:${stopPosition.kind}`);
  }
  return features;
}

/** @param {ReturnType<typeof random>} rng @return {Case} */
function caseFor(rng) {
  const gradient = rng.pick(gradientFunctions);
  const abortKind = rng.chance(0.1)
    ? rng.pick(['var', 'env', 'nested-var'])
    : undefined;
  const pool = specificationPools[gradient.kind];
  const specification = rng.chance(0.75) ? rng.pick(pool) : pool[0];
  const trailing =
    !abortKind && rng.chance(0.08)
      ? rng.pick(trailingSpecifications)
      : undefined;
  const stopCount = 1 + rng.int(3);

  /** @type {Argument[]} */
  const stops = [];
  for (let index = 0; index < stopCount; index++)
    stops.push(colourStop(rng, abortKind));
  if (abortKind) injectAbort(rng, stops, abortKind);

  /** @type {Argument[]} */
  const args = [];
  if (specification.text)
    args.push(
      lineArgument(
        specification.text,
        gradient.kind === 'linear' ? specification.angle : '',
        [],
        []
      )
    );
  args.push(...stops.map(stopArgument));
  if (trailing)
    args.push(
      lineArgument(
        joinWith(
          trailing.tokens.map((token) => token.text),
          trailing.tokenSeparators
        ),
        '',
        trailing.tokens,
        trailing.tokenSeparators
      )
    );

  /** @type {string[]} */
  const argSeparators = [];
  for (let index = 1; index < args.length; index++)
    argSeparators.push(rng.pick(argumentSeparators));

  const prefix = rng.pick(layerPrefixes);
  const nesting = rng.chance(0.2) ? rng.pick(nestings) : nestings[0];
  const value =
    prefix +
    nesting.before +
    gradient.name +
    '(' +
    joinWith(
      args.map((arg) => arg.text),
      argSeparators
    ) +
    ')' +
    nesting.after;
  const features = featuresFor(stops, prefix, gradient.name);
  if (specification.text) features.push(`first:${specification.kind}`);
  if (trailing) features.push(`trailing:${trailing.kind}`);
  if (abortKind) features.push(`abort:${abortKind}`);
  if (nesting.kind !== 'none') features.push(`nested:${nesting.kind}`);

  return {
    css: `a{background-image:${value}}`,
    value,
    fnName: gradient.name,
    args,
    argSeparators,
    prefix,
    nesting,
    aborts: Boolean(abortKind),
    branch: abortKind ? `abort:${abortKind}` : `gradient:${gradient.kind}`,
    semanticKey: [
      gradient.kind,
      specification.kind,
      stopCount,
      shapeOf(stops),
      abortKind ?? 'clean',
      nesting.kind,
    ].join('|'),
    features,
  };
}

const branches = [
  'abort:env',
  'abort:nested-var',
  'abort:var',
  'gradient:conic',
  'gradient:linear',
  'gradient:radial',
];

/** @param {number} seed @param {number} count @return {Generator<Case>} */
function* generate(seed, count) {
  const rng = random(seed);
  for (let index = 0; index < count; index++) yield caseFor(rng);
}

export { branches, colorPool, generate };
