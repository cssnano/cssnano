/** @import {random} from '../../../../util/fuzzRng.js' */

/**
 * Keyframes and counter-style names and bodies the fuzzer draws from, and
 * the declarations that reference a definition by name.
 */

export const KEYFRAME_NAMES = [
  'spin',
  'fade',
  'pulse',
  'bounce',
  'slide',
  'forwards',
  'ease',
  'linear',
  'none',
  'replace',
  'add',
  'accumulate',
  '--timeline',
  '--scroll',
  'spin extra',
  'fade 123',
  '\\61',
  '\\62',
  '"slide"',
  '"fade"',
];

export const COUNTER_STYLE_NAMES = [
  'my-counter',
  'custom-bullet',
  'roman-alt',
  'decimal',
  'disc',
  'extends',
  'cyclic',
  'my-counter extra',
  '"my-counter"',
  '\\61',
];

export const KEYFRAME_BODIES = [
  '0%{opacity:0}to{opacity:1}',
  'from{top:0}to{top:10px}',
  '0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}',
  '',
];

export const COUNTER_STYLE_BODIES = [
  'system:cyclic;symbols:"A"',
  'system:extends decimal;suffix:"> "',
  'system:numeric;symbols:"0" "1"',
  '',
];

/**
 * @param {ReturnType<typeof random>} rng
 * @param {string} name
 * @param {string[]} features
 * @param {string[]} [allowedTypes]
 * @return {string}
 */
export function createCounterDecl(rng, name, features, allowedTypes) {
  const declType = rng.pick(
    allowedTypes ?? [
      'list-style',
      'list-style-type',
      'content',
      'target-counter',
      'nested-func',
      'custom-prop',
      'protected',
    ]
  );
  features.push(`decl:${declType}`);
  if (declType === 'list-style') {
    return `ol{list-style:${name}}`;
  }
  if (declType === 'list-style-type') {
    return `ol{list-style-type:${name}}`;
  }
  if (declType === 'content') {
    return `div{content:counter(x,${name})}`;
  }
  if (declType === 'target-counter') {
    return `div{content:target-counter(attr(href url),page,${name})}`;
  }
  if (declType === 'nested-func') {
    return `div{content:target-text(attr(href),counter(page,${name}))}`;
  }
  if (declType === 'custom-prop') {
    return `:root{--design-system:${name}}`;
  }
  return `ol{list-style-position:inside;list-style-image:none}`;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {string} name
 * @param {string[]} features
 * @param {string[]} [allowedTypes]
 * @return {string}
 */
export function createKeyframeDecl(rng, name, features, allowedTypes) {
  const declType = rng.pick(
    allowedTypes ?? [
      'shorthand',
      'longhand',
      'protected',
      'custom-prop',
      'function',
    ]
  );
  features.push(`decl:${declType}`);
  if (declType === 'shorthand') {
    const composition = rng.pick(['', ' replace', ' add', ' accumulate']);
    const timeline = rng.pick(['', ' --timeline']);
    return `div{animation:${name} 1s forwards${composition}${timeline}}`;
  }
  if (declType === 'longhand') {
    return `div{animation-name:${name}}`;
  }
  if (declType === 'protected') {
    return `div{animation-fill-mode:${name}}`;
  }
  if (declType === 'custom-prop') {
    return `:root{--animation:${name};--my-animation:${name}}`;
  }
  return `div{animation:${name} 1s steps(4,jump-start)}`;
}

/**
 * Two definitions of the same name with different bodies: merging between
 * them would change which definition a reference binds to.
 *
 * @param {string[]} bodies
 * @param {string} body
 * @return {string}
 */
export function conflictingBody(bodies, body) {
  return bodies.find((candidate) => candidate !== body) ?? body;
}
