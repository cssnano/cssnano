/** @import { random } from '../../../../util/fuzzRng.js' */
const features = [
  '(min-width: 400px)',
  '(max-aspect-ratio: 32/18)',
  '(display: grid)',
  '(--custom: )',
  'not all and (color)',
  'all and (min-height: 1px)',
  'screen',
  'print',
  'foo(/**/bar)',
  '(width:var(--x, ))',
];

/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const selected = rng.pick(features);
  const extra = rng.chance(0.45) ? `, ${rng.pick(features)}` : '';
  const name = rng.pick(['media', 'MEDIA', 'supports', 'foo', 'keyframes']);
  return `@${name} ${rng.chance(0.25) ? ' ' : ''}${selected}${extra}{a{color:red}}`;
}

const edgeCases = [
  '@media all{a{color:red}}',
  '@media all and (min-width:500px){a{color:red}}',
  '@media (min-aspect-ratio: 48000000/32000000){a{color:red}}',
  '@supports ((display: grid) or (display:flex)){a{color:red}}',
  '@supports (--foo: ){}',
  '@foo all;',
  '@media foo(/**/bar), (width:var(--x, )){}',
];

export { edgeCases, randRule };
