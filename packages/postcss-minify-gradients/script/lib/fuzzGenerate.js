import { random } from '../../../../util/fuzzRng.js';
import {
  gradientFunctions,
  specificationPools,
  trailingSpecifications,
  nestings,
  colorPool,
  positionPool,
  argumentSeparators,
  colourSeparators,
  positionSeparators,
  layerPrefixes,
} from './fuzzVocabulary.js';

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
        // The legacy prefixed syntax has no `to <side>` form.
        gradient.kind === 'linear' && !gradient.name.startsWith('-webkit-')
          ? specification.angle
          : '',
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
