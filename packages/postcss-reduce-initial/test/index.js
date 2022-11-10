'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const fromInitial = require('../src/data/fromInitial.json');
const toInitial = require('../src/data/toInitial.json');
const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

function convertInitial(property, value) {
  return processCSS(`${property}:initial`, `${property}:${value}`);
}

function convertToInitial(t, property, value) {
  return () =>
    Promise.all([
      processCSS(t, `${property}:${value}`, `${property}:initial`, {
        env: 'chrome58',
      }),
      passthroughCSS(t, `${property}:${value}`, { env: 'ie6' }),
    ]);
}

Object.keys(fromInitial).forEach((property) => {
  test(
    `${property}: initial => ${property}: ${fromInitial[property]}`,
    convertInitial(property, fromInitial[property])
  );
});

Object.keys(toInitial).forEach((property) => {
  test(
    `${property}: ${toInitial[property]} => ${property}: initial`,
    convertToInitial(property, toInitial[property])
  );
});

test(
  'cursor: initial => cursor: auto (uppercase property and value)',
  processCSS('CURSOR: INITIAL', 'CURSOR: auto')
);

test(
  'z-index: initial => z-index: auto (uppercase property and value)',
  processCSS('Z-INDEX: INITIAL', 'Z-INDEX: auto')
);

test(
  'border-block-color: currentColor => border-block-color: initial',
  processCSS(
    'border-block-color: currentColor',
    'border-block-color: initial',
    { env: 'chrome58' }
  )
);

test(
  'BORDER-BLOCK-COLOR: CURRENTCOLOR => border-block-color: initial (uppercase property and value)',
  processCSS(
    'BORDER-BLOCK-COLOR: CURRENTCOLOR',
    'BORDER-BLOCK-COLOR: initial',
    { env: 'chrome58' }
  )
);

test(
  'should pass through when an initial value is longer',
  passthroughCSS(
    'writing-mode:initial' // initial value is horizontal-tb
  )
);

test(
  'should pass through when an initial value is longer (uppercase property and value)',
  passthroughCSS(
    'WRITING-MODE:INITIAL' // initial value is horizontal-tb
  )
);

test('should pass through non-initial values', passthroughCSS('all:inherit'));

test(
  'should pass through non-initial values (uppercase property and value)',
  passthroughCSS('ALL:INHERIT')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'min-width auto tests',
  processCSS('h1{min-width:initial}', 'h1{min-width:auto}')
);

test(
  'min-height auto tests',
  processCSS('h1{min-height:initial}', 'h1{min-height:auto}')
);

/* The correct initial value is `repeat`,
   but MDN has the wrong data so  */
test(
  'preserve no-repeat mask-repeat',
  passthroughCSS('div{mask-repeat:no-repeat}', { env: 'chrome58' })
);

test(
  'transform initial mask-repeat to repeat',
  processCSS('div{mask-repeat:initial}', 'div{mask-repeat:repeat}')
);

/* Skip transform-box for browser compatibility  */
test('preserve transform-box', passthroughCSS('div{transform-box:view-box}'));

test(
  'should ignore the data present in the ignore options',
  passthroughCSS('h1{min-height:initial}', { ignore: ['min-height'] })
);

test(
  'should ignore the data present in the ignore options #2',
  processCSS(
    'h1{  writing-mode: sideways-rl;}',
    'h1{  writing-mode: sideways-rl;}',
    { ignore: ['writing-mode'] }
  )
);

test(
  'should ignore the data present in the ignore options #3',
  processCSS(
    'h1{  writing-mode: vertical-lr;}',
    'h1{  writing-mode: vertical-lr;}',
    { ignore: [] }
  )
);
test(
  'should ignore the data present in the ignore options , toInitial #3',
  passthroughCSS('WRITING-MODE:horizontal-tb', { ignore: ['writing-mode'] })
);
test.run();
