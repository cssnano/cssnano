/** @import { random } from '../../../../util/fuzzRng.js' */

/** @param {ReturnType<typeof random>} rng */
function randUnit(rng) {
  return rng.pick([
    'px',
    'em',
    'rem',
    'ms',
    's',
    'turn',
    'deg',
    '%',
    'vw',
    'vh',
    'ch',
    'pt',
    'pc',
    'in',
    'cm',
    'mm',
    'q',
    'ex',
    'vmin',
    'vmax',
  ]);
}

/** @param {ReturnType<typeof random>} rng */
function randNum(rng) {
  let sign = '';
  if (rng.chance(0.12)) {
    sign = '-';
  } else if (rng.chance(0.05)) {
    sign = '+';
  }
  const intPart = String(rng.int(300));

  if (rng.chance(0.25)) {
    const decPart = String(rng.int(10000)).replace(/0+$/, '') || '0';
    if (rng.chance(0.15)) {
      return sign + '.' + decPart;
    }
    if (rng.chance(0.05)) {
      return sign + intPart + '.';
    }
    return sign + intPart + '.' + decPart;
  }

  return sign + intPart;
}

/** @param {ReturnType<typeof random>} rng */
function randValue(rng) {
  const r = rng.int(20);

  if (r === 0) return randNum(rng);

  if (r < 4) {
    const fn = rng.pick([
      'calc',
      'min',
      'max',
      'clamp',
      'hsl',
      'hsla',
      'hwb',
      'color-mix',
      'linear',
    ]);
    const arity = 2 + rng.int(3);
    const args = Array.from(
      { length: arity },
      () => randNum(rng) + (rng.chance(0.7) ? randUnit(rng) : '')
    );
    const sep = rng.pick([' + ', ', ', ' - ']);
    return `${fn}(${args.join(sep)})`;
  }

  if (r === 4) {
    return `(${randNum(rng) + randUnit(rng)})`;
  }

  return randNum(rng) + randUnit(rng);
}

const PROPS = [
  'width',
  'height',
  'margin',
  'padding',
  'opacity',
  'transition-duration',
  'animation-delay',
  'transform',
  'top',
  'left',
  'font-size',
  'line-height',
  'max-height',
  'min-width',
  'shape-image-threshold',
  'background',
  'border',
  'flex-basis',
  'right',
  'bottom',
  'letter-spacing',
  'stroke-dashoffset',
  'stroke-width',
  'stroke-dasharray',
  'border-image-width',
  '--custom-prop',
  'descent-override',
  'ascent-override',
  'font-stretch',
  'size-adjust',
  'line-gap-override',
];

/** @param {ReturnType<typeof random>} rng */
function randDecl(rng) {
  const prop = rng.pick(PROPS);
  const arity = 1 + rng.int(5);
  const sep = rng.chance(0.25) ? ', ' : ' ';
  const parts = Array.from({ length: arity }, () => randValue(rng));
  return `${prop}:${parts.join(sep)}`;
}

/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const arity = 1 + rng.int(5);
  const decls = Array.from({ length: arity }, () => randDecl(rng));
  return `h1{${decls.join(';')}}`;
}

/** @param {ReturnType<typeof random>} rng */
function randKeyframeRule(rng) {
  const prop = rng.pick([
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
    'border-image-width',
  ]);
  return `@keyframes a{0%{${prop}:${randValue(rng)}}to{${prop}:${randValue(rng)}}}`;
}

/** @param {ReturnType<typeof random>} rng */
function randPropertyRule(rng) {
  const v = randValue(rng);
  return `@property --p{syntax:'<percentage>';inherits:false;initial-value:${v};}`;
}

const edgeCases = [
  'h1{opacity:0%}',
  'h1{opacity:1.}',
  'h1{opacity:100%}',
  'h1{opacity:150}',
  'h1{opacity:-0.5}',
  'h1{top:0\\9\\0}',
  'h1{width:10.px}',
  'h1{width:+14px}',
  'h1{width:.0px}',
  'h1{width:0.00px}',
  'h1{width:109.00000000000px}',
  'h1{transition-duration:500ms}',
  'h1{animation:opacity 0ms 1000ms}',
  'h1{transform:rotate(0.25turn)}',
  'h1{transform:rotate(0.25TURN)}',
  'h1{background:url(a.png)}',
  'h1{background:URL(a.png)}',
  'h1{width:calc(192px + 2em - (0px * 4))}',
  'h1{margin: 0em 0% 0px 0pc}',
  'h1{color:hsl(0, 0%, 244%)}',
  'h1{margin:max(0px)}',
  'h1{margin:max(1px + 2em,0px)}',
  'h1{margin:clamp(0px)}',
  'h1{transition-timing-function: linear(0 0%, 1 100%)}',
  'h1{background: 50% .0%/100.0% 100.0%}',
  'h1{background: 50% .0% ,100.0% 100.0%}',
  'h1,h2{letter-spacing:-0.1rem}',
  'h1{font-size:20PX}',
  'h1{right:6.66667px}',
  'h1{line-height:0rem}',
  'h1{flex-basis:0%}',
  'h1{height:0%;max-height:0%;min-width:0%}',
  'h1{width:0lightyear}',
  'h1{opacity:-0}',
  'h1{stroke-dashoffset:0%}',
  'h1{--my-var:500ms}',
  'h1{opacity:0.0625}',
  'h1{opacity:100%}',
  'h1{shape-image-threshold:1.5}',
  'h1{shape-image-threshold:-5}',
  'h1{shape-image-threshold:150}',
  'h1{ -webkit-animation: e836684w2 }',
  'h1{animation: e836684w2}',
  'h1{background:color-mix(#000, #FFF 0%)}',
  'h1{box-shadow:inset 0 0 0 250pc hsla(0,0%,100%,.7215686275)}',
  '@keyframes test {0% {border-image-width: 0 0 100% 0%;}}',
  '@keyframes a{0%{stroke-dasharray:200%}to{stroke-dasharray:0%}}',
  '@font-face {descent-override:0%;ascent-override:0%;line-gap-override:0%;size-adjust:0%;font-stretch:0%}',
  `@property --p{syntax:'<percentage>';inherits:false;initial-value:0%;}`,
  `@property --p{syntax:'<length-percentage>';inherits:false;initial-value:0%;}`,
];

export { edgeCases, randKeyframeRule, randPropertyRule, randRule };
export default { edgeCases, randKeyframeRule, randPropertyRule, randRule };
