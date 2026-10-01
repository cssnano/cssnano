import { random } from '../../../../util/fuzzRng.js';
import {
  KEYFRAME_NAMES,
  COUNTER_STYLE_NAMES,
  KEYFRAME_BODIES,
  COUNTER_STYLE_BODIES,
  createCounterDecl,
  createKeyframeDecl,
  conflictingBody,
} from './fuzzDefinitions.js';

/**
 * @typedef {{
 *   css: string,
 *   branch: string,
 *   features: string[],
 *   decl?: string,
 * }} FuzzCase
 */

/**
 * Shared random choices for one generated case.
 *
 * @typedef {{
 *   isCounter: boolean,
 *   branch: string,
 *   names: string[],
 *   bodies: string[],
 *   name1: string,
 *   name2: string,
 *   body1: string,
 *   body2: string,
 *   structure: string,
 *   pinned: boolean,
 * }} CasePlan
 */

/**
 * @param {ReturnType<typeof random>} rng
 * @return {CasePlan}
 */
function planCase(rng) {
  const isCounter = rng.chance(0.3);
  const branch = isCounter ? 'counter-style' : 'keyframes';
  const names = isCounter ? COUNTER_STYLE_NAMES : KEYFRAME_NAMES;
  const bodies = isCounter ? COUNTER_STYLE_BODIES : KEYFRAME_BODIES;

  const name1 = rng.pick(names);
  const name2 = rng.pick(names);
  const body1 = rng.pick(bodies);
  const body2 = rng.chance(0.6) ? body1 : rng.pick(bodies);

  const structure = rng.pick([
    'flat',
    'flat',
    'triple',
    'nested-shadow',
    'layer-order',
  ]);

  const pinned =
    structure === 'nested-shadow' && body1 === body2 && name1 !== name2;

  return {
    isCounter,
    branch,
    names,
    bodies,
    name1,
    name2,
    body1,
    body2,
    structure,
    pinned,
  };
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {CasePlan} plan
 * @param {string[]} features
 * @return {string[]}
 */
function createAtRuleParts(rng, plan, features) {
  const { isCounter, name1, name2, body1, body2, pinned } = plan;
  const parts = [];

  if (body1 === body2) features.push('same-body');
  if (name1 === name2) features.push('same-name');
  if (name1.startsWith('\\') || name2.startsWith('\\')) features.push('escape');
  if (name1.startsWith('"') || name2.startsWith('"')) features.push('string');

  if (isCounter) {
    parts.push(`@counter-style ${name1}{${body1}}`);
    parts.push(`@counter-style ${name2}{${body2}}`);
    return parts;
  }

  const prefix1 = pinned ? '' : rng.pick(['', '-webkit-']);
  const prefix2 = rng.chance(0.7) ? prefix1 : rng.pick(['', '-webkit-']);
  if (prefix1 !== prefix2) features.push('mixed-prefix');
  parts.push(`@${prefix1}keyframes ${name1}{${body1}}`);
  parts.push(`@${prefix2}keyframes ${name2}{${body2}}`);
  return parts;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {CasePlan} plan
 * @param {string[]} features
 * @return {string}
 */
function createDecl(rng, plan, features) {
  const { isCounter, name1, pinned } = plan;
  return isCounter
    ? createCounterDecl(
        rng,
        name1,
        features,
        pinned
          ? [
              'list-style',
              'list-style-type',
              'content',
              'target-counter',
              'nested-func',
            ]
          : undefined
      )
    : createKeyframeDecl(
        rng,
        name1,
        features,
        pinned ? ['shorthand', 'longhand', 'function'] : undefined
      );
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {CasePlan} plan
 * @param {string[]} features
 * @param {string[]} parts
 * @return {{ declCss: string, decl?: string }}
 */
function addNestedShadow(rng, plan, features, parts) {
  // The inner scope defines the merge candidate with a conflicting body,
  // so a reference to the first name inside it must stay untouched: it
  // either defines the source name itself or a name the reference could
  // otherwise be rewritten to.
  features.push('scoped-shadow');
  const wrapper = rng.pick(['media-wide', 'supports', 'container']);
  features.push(`wrapper:${wrapper}`);
  const shadowBody = conflictingBody(plan.bodies, plan.body2);
  /** @type {Record<string, string>} */
  const openers = {
    'media-wide': '@media (min-width:600px){',
    supports: '@supports (display:flex){',
    container: '@container (min-width:300px){',
  };
  const kind = plan.isCounter ? 'counter-style' : 'keyframes';
  const declCss = createDecl(rng, plan, features);
  parts.push(
    `${openers[wrapper]}@${kind} ${plan.name2}{${shadowBody}}${declCss}}`
  );
  // Ground truth for the pinned structure: the scoped definition blocks
  // every rewrite of this reference, so the declaration is byte-stable.
  return plan.pinned ? { declCss, decl: declCss } : { declCss };
}

/**
 * @param {CasePlan} plan
 * @param {ReturnType<typeof random>} rng
 * @param {string[]} features
 * @param {string[]} parts
 * @return {void}
 */
function addLayerOrder(plan, rng, features, parts) {
  features.push('layer-order');
  const kind = plan.isCounter ? 'counter-style' : 'keyframes';
  const innerBody = rng.chance(0.7)
    ? plan.body1
    : conflictingBody(plan.bodies, plan.body1);
  if (innerBody !== plan.body1) features.push('layer-conflict');
  parts.unshift('@layer low, high;');
  parts.push(`@layer high{@${kind} ${plan.name1}{${plan.body1}}}`);
  parts.push(`@layer low{@${kind} ${plan.name1}{${innerBody}}}`);
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {string} css
 * @param {string} declCss
 * @param {string[]} features
 * @return {string}
 */
function wrapFlat(rng, css, declCss, features) {
  const wrapperType = rng.pick([
    'none',
    'media',
    'supports',
    'container',
    'layer',
    'layer-decl',
    'layer-nested',
    'layer-stmt-nested',
    'layer-escaped',
  ]);
  if (wrapperType !== 'none') {
    features.push(`wrapper:${wrapperType}`);
  }
  if (wrapperType === 'media') {
    return `@media (max-width:500px){${css}${declCss}}`;
  }
  if (wrapperType === 'supports') {
    return `@supports (display:flex){${css}${declCss}}`;
  }
  if (wrapperType === 'container') {
    return `@container (min-width:300px){${css}${declCss}}`;
  }
  if (wrapperType === 'layer') {
    return `${css}@layer base{${declCss}}`;
  }
  if (wrapperType === 'layer-decl') {
    return `@layer base{${css}${declCss}}`;
  }
  if (wrapperType === 'layer-nested') {
    return `@layer outer{${css}@layer inner{${declCss}}}`;
  }
  if (wrapperType === 'layer-stmt-nested') {
    return `@layer outer{${css}@layer inner;${declCss}}`;
  }
  if (wrapperType === 'layer-escaped') {
    return `@layer a\\.b{${css}${declCss}}`;
  }
  return css + declCss;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {FuzzCase}
 */
function generateCase(rng) {
  const plan = planCase(rng);
  const { isCounter, structure } = plan;
  /** @type {string[]} */
  const features = [`structure:${structure}`];
  if (plan.pinned) features.push('pinned-shadow');

  const parts = createAtRuleParts(rng, plan, features);

  if (structure === 'triple') {
    features.push('third-atrule');
    const name3 = rng.pick(plan.names);
    const body3 = rng.pick(plan.bodies);
    parts.push(
      `@${isCounter ? 'counter-style' : 'keyframes'} ${name3}{${body3}}`
    );
  }

  let css;
  /** @type {string | undefined} */
  let decl;

  if (structure === 'nested-shadow') {
    const result = addNestedShadow(rng, plan, features, parts);
    css = parts.join('');
    decl = result.decl;
  } else {
    if (structure === 'layer-order') {
      addLayerOrder(plan, rng, features, parts);
    }
    const declCss = createDecl(rng, plan, features);
    if (structure === 'flat' || structure === 'triple') {
      css = wrapFlat(rng, parts.join(''), declCss, features);
    } else {
      css = parts.join('') + declCss;
    }
  }

  return { css, branch: plan.branch, features, decl };
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {Iterable<FuzzCase>}
 */
export function* generate(seed, count) {
  const rng = random(seed);

  for (let i = 0; i < count; i++) {
    yield generateCase(rng);
  }
}
