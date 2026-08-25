/** @import { random } from '../../../../util/fuzzRng.js' */
const cubic = [
  '.25,.1,.25,1',
  '0,0,1,1',
  '.42,0,1,1',
  '0,0,.58,1',
  '.42,0,.58,1',
];
/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index) {
  const prop = rng.pick([
    'animation-timing-function',
    'transition-timing-function',
    'animation',
    '-webkit-animation-timing-function',
  ]);
  const branches = [
    () => ['cubic-bezier', `cubic-bezier(${rng.pick(cubic)})`],
    () => [
      'steps-position',
      `steps(${1 + rng.int(5)},${rng.pick(['start', 'end', 'jump-start', 'jump-end'])})`,
    ],
    () => ['steps-default', `steps(${1 + rng.int(5)})`],
    () => ['nested-function', `linear(0,${rng.pick(cubic)})`],
    () => ['malformed-whitespace', 'cubic-bezier(0 , 0, 1, 1)'],
  ];
  const [branch, value] = branches[index % branches.length]();
  return { branch, css: `a.fuzz${index}{${prop}:${value};--fuzz:${index}}` };
}
const edgeCases = cubic.map(
  (value) => `a{animation-timing-function:cubic-bezier(${value})}`
);
export { edgeCases, randRule };
