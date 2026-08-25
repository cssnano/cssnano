/** @import { random } from '../../../../util/fuzzRng.js' */

const colors = [
  'red',
  'blue',
  'transparent',
  '#fff',
  '#123456',
  'rgb(1, 2, 3)',
  'hsl(120 50% 50%)',
  'color-mix(in srgb, red 20%, blue)',
];
const positions = ['0%', '25%', '40%', '50%', '75%', '100%', '0px', '5px'];
const gradientNames = [
  'linear-gradient',
  'repeating-linear-gradient',
  'radial-gradient',
  'repeating-radial-gradient',
  'conic-gradient',
  'repeating-conic-gradient',
  '-webkit-linear-gradient',
  '-webkit-radial-gradient',
];

/** @param {ReturnType<typeof random>} rng */
function stop(rng) {
  const color = rng.pick(colors);
  if (rng.chance(0.2)) return color;
  const first = rng.pick(positions);
  return rng.chance(0.25)
    ? `${color} ${first} ${rng.pick(positions)}`
    : `${color} ${first}`;
}

/** @param {ReturnType<typeof random>} rng */
function gradient(rng) {
  const name = rng.pick(gradientNames);
  const stops = Array.from({ length: 2 + rng.int(4) }, () => stop(rng));
  if (name.includes('linear')) {
    const direction = rng.pick([
      'to top',
      'to right',
      'to bottom',
      'to left',
      '45deg',
      'to top right',
    ]);
    stops.unshift(direction);
  } else if (name.includes('radial') && !name.includes('webkit')) {
    stops.unshift(rng.pick(['at 50% 0%', 'circle at center', 'ellipse']));
  } else if (name.includes('conic')) {
    stops.unshift(rng.pick(['from 20deg at center', 'at 50% 50%']));
  } else if (name.includes('webkit-radial')) {
    stops.splice(0, 0, 'center', '0', 'center', '100%');
  }
  return `${name}(${stops.join(rng.pick([',', ', ', ',  ']))})`;
}

/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const value = gradient(rng);
  return `a{${rng.pick(['background', 'background-image', 'border-image-source'])}:${value}}`;
}

const edgeCases = [
  'a{background:linear-gradient(to top,red 0%,blue 100%)}',
  'a{background:linear-gradient(to right, red 50%, blue 40%, green 45%)}',
  'a{background:linear-gradient(red 50%,40%,blue 45%)}',
  'a{background:radial-gradient(at 50% 0%,red 40%,blue 40%)}',
  'a{background:conic-gradient(from 20deg at center,red 50deg,blue 40deg)}',
  'a{background:-webkit-radial-gradient(center,0,center,100%,from(red),to(blue))}',
  'a{background:linear-gradient(/**/red 0%, blue 100%)}',
  'a{background:linear-gradient(red 0%,url(foo.png) 100%)}',
  'a{background:linear-gradient(red 0%,var(--stop) 100%)}',
  'a{background:linear-gradient(red 0%,url("image,one.png") 100%)}',
  'a{background:linear-gradient(red 0%,url(image.png) 100%)}',
  'a{background:linear-gradient(rgb(0 0 0 / .2) 0%,hsl(20 50% 50%) 100%)}',
  'a{background:linear-gradient(red 0%,color-mix(in srgb,red,blue) 100%)}',
];

// The legacy flat parser associates the comment with the position node and
// drops that position; CSSTools preserves the comment and its adjacent raw
// position. Keep this malformed/comment-sensitive case explicitly tracked.
const intentionalDifferences = new Set([
  'a{background:linear-gradient(red 0% /* comment */, blue 100%)}',
]);

export { edgeCases, intentionalDifferences, randRule };
