import { random } from '../../../../util/fuzzRng.js';

/**
 * @typedef {{
 *   css: string,
 *   branch: string,
 *   semanticKey: string,
 *   features: string[]
 * }} FuzzCase
 */

const lengthUnits = [
  'px',
  'in',
  'pc',
  'pt',
  'em',
  'rem',
  'ch',
  'vh',
  'vw',
  'dvh',
  'cqw',
];
const timeUnits = ['s', 'ms'];
const angleUnits = ['deg', 'grad', 'turn', 'rad'];
const freqUnits = ['hz', 'khz'];

const numbers = [
  '0',
  '0.0',
  '1',
  '1.0',
  '1.005',
  '10.005',
  '16',
  '96',
  '192',
  '500',
  '1000',
  '0.25',
  '0.0625',
  '-0.5',
  '1.2345',
  '1e2',
  '1e-2',
  '1e5',
  '-1e1',
];

const edgeCases = [
  {
    name: 'at-property-length',
    branch: 'at-property',
    css: "@property --len{syntax:'<length>';inherits:false;initial-value:0px;}",
  },
  {
    name: 'at-property-length-percentage',
    branch: 'at-property',
    css: "@property --lp{syntax:'<length-percentage>';inherits:false;initial-value:0px;}",
  },
  {
    name: 'at-property-percentage',
    branch: 'at-property',
    css: "@property --pct{syntax:'<percentage>';inherits:false;initial-value:0%;}",
  },
  {
    name: 'calc-size-dimension',
    branch: 'math-functions',
    css: 'h1{width:calc-size(auto, 0px + 192px)}',
  },
  {
    name: 'anchor-size-zero',
    branch: 'math-functions',
    css: 'h1{width:anchor-size(width, 0px);height:anchor-size(height, 0%)}',
  },
  {
    name: 'contrast-color-zero',
    branch: 'math-functions',
    css: 'h1{color:contrast-color(0%)}',
  },
  {
    name: 'view-timeline-inset-zero',
    branch: 'math-functions',
    css: 'h1{view-timeline-inset:view(0px 0px)}',
  },
  {
    name: 'zero-radians',
    branch: 'angle',
    css: 'h1{transform:rotate(0rad)}',
  },
  {
    name: 'precision-half-values',
    branch: 'precision',
    css: 'h1{width:1.005px;height:10.005px}',
  },
  {
    name: 'precision-scientific',
    branch: 'precision',
    css: 'h1{width:1e-2px;height:1e2px}',
  },
  {
    name: 'flex-basis-nonzero',
    branch: 'flex',
    css: 'h1{flex-basis:192px}',
  },
  {
    name: 'flex-grow-shrink-format',
    branch: 'flex',
    css: 'h1{flex-grow:1.0;flex-shrink:2.0}',
  },
  {
    name: 'flex-shorthand-zero-preservation',
    branch: 'flex',
    css: 'h1{flex:1.0 1.0 100.00%;h2{flex:1 1 0px};h3{flex:1 1 0%}}',
  },
  {
    name: 'flex-basis-zero-length',
    branch: 'flex',
    css: 'h1{flex-basis:0px;h2{flex-basis:0%}}',
  },
  {
    name: 'line-height-zero-length',
    branch: 'line-height',
    css: 'h1{line-height:0rem;h2{line-height:0px}}',
  },
  {
    name: 'escaped-unit',
    branch: 'escapes',
    css: 'a{width:192\\70 x;height:0\\9\\0}',
  },
  {
    name: 'calc-nested-math',
    branch: 'math-functions',
    css: 'a{width:calc(192px + 2em - (0px * 4))}',
  },
  {
    name: 'anchor-zero',
    branch: 'math-functions',
    css: 'h1{top:anchor(--target 0%);left:anchor(top, 0%)}',
  },
  {
    name: 'fonts-5-overrides',
    branch: 'font-face',
    css: '@font-face{subscript-position-override:0%;superscript-position-override:0%;subscript-size-override:0%;superscript-size-override:0%}',
  },
  {
    name: 'color-functions-zero',
    branch: 'math-functions',
    css: 'h1{color:hsl(0deg 0% 0%);background:color-mix(in srgb, red 0%, blue)}',
  },
  {
    name: 'keyframes-nested-atrule',
    branch: 'keyframes',
    css: '@keyframes spin { from { @supports (display: flex) { stroke-dasharray: 0%; } } }',
  },
  {
    name: 'font-shorthand-zero-line-height',
    branch: 'line-height',
    css: 'h1{font:12px/0px sans-serif;h2{font:12px/0% sans-serif}}',
  },
  {
    name: 'vendor-line-height-zero',
    branch: 'line-height',
    css: 'h1{-webkit-line-height:0px;-webkit-line-height:0%}',
  },
  {
    name: 'at-property-angle-percentage',
    branch: 'at-property',
    css: "@property --ap{syntax:'<angle-percentage>';inherits:false;initial-value:0%;}",
  },
  {
    name: 'columns-shorthand-zero',
    branch: 'length',
    css: 'h1{columns:0px 2;h2{columns:0px}}',
  },
  {
    name: 'nested-keyframes-percentage',
    branch: 'keyframes',
    css: '@keyframes spin{from{&{stroke-dasharray:0%;}}}',
  },
  {
    name: 'precision-negative',
    branch: 'precision',
    css: 'h1{width:-1.005px;height:-10.005px}',
  },
];

/** @param {ReturnType<typeof random>} rng @param {number} index @return {FuzzCase} */
function randAtProperty(rng, index) {
  const syntax = rng.pick([
    '<length>',
    '<length-percentage>',
    '<percentage>',
    '<angle-percentage>',
    '<number>',
    '<angle>',
  ]);
  let initialVal;
  if (syntax === '<length>' || syntax === '<length-percentage>') {
    initialVal = rng.pick(['0px', '10px', '192px', '0em']);
  } else if (syntax === '<percentage>' || syntax === '<angle-percentage>') {
    initialVal = rng.pick(['0%', '50%', '100%']);
  } else if (syntax === '<angle>') {
    initialVal = rng.pick(['0deg', '0rad', '90deg']);
  } else {
    initialVal = rng.pick(['0', '1', '1.0']);
  }
  return {
    css: `@property --prop${index}{syntax:'${syntax}';inherits:false;initial-value:${initialVal};}`,
    branch: 'at-property',
    semanticKey: `${syntax}:${initialVal}`,
    features: ['at-property', syntax],
  };
}

/** @param {ReturnType<typeof random>} rng @param {number} index @return {FuzzCase} */
function randFlex(rng, index) {
  const prop = rng.pick([
    'flex',
    'flex-basis',
    'flex-grow',
    'flex-shrink',
    '-webkit-flex-basis',
    '-ms-flex-preferred-size',
  ]);
  let val;
  const features = [];
  if (prop === 'flex') {
    const grow = rng.pick(['1', '1.0', '0']);
    const shrink = rng.pick(['1', '1.0', '0']);
    const basis = rng.pick(['0px', '0%', '100.00%', '192px', 'auto']);
    val = `${grow} ${shrink} ${basis}`;
    features.push('shorthand');
  } else if (prop === 'flex-grow' || prop === 'flex-shrink') {
    val = rng.pick(['0', '1.0', '2.0', '0.5']);
    features.push('number');
  } else {
    val = rng.pick(['0px', '0%', '192px', '100.00%', '10px']);
    features.push('dimension');
  }
  return {
    css: `.flex${index}{${prop}:${val}}`,
    branch: 'flex',
    semanticKey: `${prop}:${val}`,
    features,
  };
}

/** @param {ReturnType<typeof random>} rng @param {number} index @return {FuzzCase} */
function randMath(rng, index) {
  const fn = rng.pick([
    'calc',
    'min',
    'max',
    'clamp',
    'calc-size',
    'anchor',
    'anchor-size',
    'contrast-color',
    'view',
  ]);
  let val;
  if (fn === 'calc-size') {
    val = `calc-size(auto, ${rng.pick(numbers)}${rng.pick(lengthUnits)})`;
  } else if (fn === 'anchor') {
    val = `anchor(--target ${rng.pick(['0%', '50%', 'top'])})`;
  } else if (fn === 'anchor-size') {
    val = `anchor-size(width, ${rng.pick(['0px', '0%', '10px'])})`;
  } else if (fn === 'contrast-color') {
    val = `contrast-color(${rng.pick(['0%', '50%', 'red'])})`;
  } else if (fn === 'view') {
    val = `view(${rng.pick(['0px', '0%', '10px'])} ${rng.pick(['0px', '0%', '10px'])})`;
  } else if (fn === 'clamp') {
    val = `clamp(${rng.pick(numbers)}${rng.pick(lengthUnits)}, 50%, 100px)`;
  } else {
    val = `${fn}(${rng.pick(numbers)}${rng.pick(lengthUnits)} + ${rng.pick(numbers)}${rng.pick(lengthUnits)})`;
  }
  return {
    css: `.math${index}{width:${val}}`,
    branch: 'math-functions',
    semanticKey: val,
    features: ['math-function', fn],
  };
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {number} index
 * @return {FuzzCase}
 */
function randRule(rng, index) {
  const branchType = rng.pick([
    'length',
    'flex',
    'angle',
    'time',
    'frequency',
    'opacity',
    'at-property',
    'math-functions',
  ]);

  if (branchType === 'at-property') return randAtProperty(rng, index);
  if (branchType === 'flex') return randFlex(rng, index);
  if (branchType === 'math-functions') return randMath(rng, index);

  if (branchType === 'angle') {
    const prop = rng.pick(['transform', 'rotate']);
    const num = rng.pick(numbers);
    const unit = rng.pick(angleUnits);
    const val = prop === 'rotate' ? `${num}${unit}` : `rotate(${num}${unit})`;
    return {
      css: `.angle${index}{${prop}:${val}}`,
      branch: 'angle',
      semanticKey: `${prop}:${val}`,
      features: ['angle', unit],
    };
  }

  if (branchType === 'time') {
    const prop = rng.pick(['transition-duration', 'animation-delay']);
    const num = rng.pick(numbers);
    const unit = rng.pick(timeUnits);
    return {
      css: `.time${index}{${prop}:${num}${unit}}`,
      branch: 'time',
      semanticKey: `${prop}:${num}${unit}`,
      features: ['time', unit],
    };
  }

  if (branchType === 'frequency') {
    const num = rng.pick(['0', '1000', '2000']);
    const unit = rng.pick(freqUnits);
    return {
      css: `.freq${index}{voice-pitch:${num}${unit}}`,
      branch: 'frequency',
      semanticKey: `voice-pitch:${num}${unit}`,
      features: ['frequency', unit],
    };
  }

  if (branchType === 'opacity') {
    const prop = rng.pick(['opacity', 'fill-opacity', 'stroke-opacity']);
    const val = rng.pick([
      '0',
      '0%',
      '50%',
      '100%',
      '1.0',
      '1.5',
      '-0.5',
      '0.0625',
    ]);
    return {
      css: `.opacity${index}{${prop}:${val}}`,
      branch: 'opacity',
      semanticKey: `${prop}:${val}`,
      features: ['opacity'],
    };
  }

  const prop = rng.pick([
    'width',
    'height',
    'margin',
    'padding',
    'top',
    'line-height',
    'columns',
  ]);
  const num = rng.pick(numbers);
  const unit = rng.pick([...lengthUnits, '%']);
  return {
    css: `.len${index}{${prop}:${num}${unit}}`,
    branch: 'length',
    semanticKey: `${prop}:${num}${unit}`,
    features: ['length', unit],
  };
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {Generator<FuzzCase, void, undefined>}
 */
function* generate(seed, count) {
  const rng = random(seed);
  for (let index = 0; index < count; index++) {
    yield randRule(rng, index);
  }
}

export { edgeCases, generate };
