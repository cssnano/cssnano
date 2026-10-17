import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import fromInitial from '../../src/plugins/postcss-reduce-initial/data/fromInitial.json' with { type: 'json' };
import toInitial from '../../src/plugins/postcss-reduce-initial/data/toInitial.json' with { type: 'json' };
import ignoreProps from '../../src/plugins/postcss-reduce-initial/lib/ignoreProps.js';
import plugin from '../../src/plugins/postcss-reduce-initial/index.js';

const testDir = dirname(fileURLToPath(import.meta.url));

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// The repo's own browserslist config targets IE 11, which lacks the initial
// keyword, so the conversions below pin the default targets explicitly.
const defaultTargets = withTargets('baseline widely available with downstream');

function convertInitial(property, value) {
  return processCSS(
    `${property}:initial`,
    `${property}:${value}`,
    defaultTargets
  );
}

function convertToInitial(property, value) {
  const output = ignoreProps.includes(property) ? value : 'initial';

  return () =>
    Promise.all([
      processCSS(
        `${property}:${value}`,
        `${property}:${output}`,
        withTargets('Chrome 58')
      )(),

      passthroughCSS(`${property}:${value}`, withTargets('IE 6'))(),

      processCSS(`${property}:${value}`, `${property}:${output}`, {
        ...withTargets(undefined, { env: 'modern' }),
        from: join(testDir, 'browserslist/example.css'),
      })(),

      processCSS(`${property}:${value}`, `${property}:${output}`, {
        ...withTargets(undefined, { env: 'modern' }),
        file: join(testDir, 'browserslist/example.css'),
      })(),

      processCSS(`${property}:${value}`, `${property}:${output}`, {
        ...withTargets(undefined, { env: 'modern' }),
        from: join(join(testDir, 'browserslist'), 'input.css'),
      })(),

      passthroughCSS(`${property}:${value}`, {
        ...withTargets(undefined, { env: 'legacy' }),
        from: join(testDir, 'browserslist/example.css'),
      })(),

      passthroughCSS(`${property}:${value}`, {
        ...withTargets(undefined, { env: 'legacy' }),
        file: join(testDir, 'browserslist/example.css'),
      })(),

      passthroughCSS(`${property}:${value}`, {
        ...withTargets(undefined, { env: 'legacy' }),
        from: join(join(testDir, 'browserslist'), 'input.css'),
      })(),
    ]);
}

for (const [property, value] of Object.entries(fromInitial)) {
  test(
    `${property}: initial => ${property}: ${value}`,
    convertInitial(property, value)
  );
}

for (const [property, value] of Object.entries(toInitial)) {
  test(
    `${property}: ${value} => ${property}: initial`,
    convertToInitial(property, value)
  );
}

test(
  'cursor: initial => cursor: auto (uppercase property and value)',
  processCSS('CURSOR: INITIAL', 'CURSOR: auto', defaultTargets)
);

test(
  'z-index: initial => z-index: auto (uppercase property and value)',
  processCSS('Z-INDEX: INITIAL', 'Z-INDEX: auto', defaultTargets)
);

describe('Border-Block-Color:', () => {
  test(
    'border-block-color: currentColor => border-block-color: initial',
    processCSS(
      'border-block-color: currentColor',
      'border-block-color: initial',
      withTargets('Chrome 58')
    )
  );

  test(
    'BORDER-BLOCK-COLOR: CURRENTCOLOR => border-block-color: initial (uppercase property and value)',
    processCSS(
      'BORDER-BLOCK-COLOR: CURRENTCOLOR',
      'BORDER-BLOCK-COLOR: initial',
      withTargets('Chrome 58')
    )
  );
});

describe('Pass', () => {
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
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'min-width auto tests',
  processCSS('h1{min-width:initial}', 'h1{min-width:auto}', defaultTargets)
);

test(
  'min-height auto tests',
  processCSS('h1{min-height:initial}', 'h1{min-height:auto}', defaultTargets)
);

/* The correct initial value is `repeat`,
   but MDN has the wrong data so  */
test(
  'preserve no-repeat mask-repeat',
  passthroughCSS('div{mask-repeat:no-repeat}', withTargets('Chrome 58'))
);

test(
  'transform initial mask-repeat to repeat',
  processCSS(
    'div{mask-repeat:initial}',
    'div{mask-repeat:repeat}',
    defaultTargets
  )
);

/* Skip transform-box for browser compatibility  */
test('preserve transform-box', passthroughCSS('div{transform-box:view-box}'));

/* Most browsers do not support 'none' at present */
test(
  'should preserve initial -webkit-line-clamp',
  passthroughCSS('a{-webkit-line-clamp: initial;}')
);

describe('Ignore', () => {
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
});
