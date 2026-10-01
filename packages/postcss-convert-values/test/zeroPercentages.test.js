import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { join } = nodepath;
const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Flex properties and unitless zeroes', () => {
  test('should not mangle flex basis', passthroughCSS('h1{flex-basis:0%}'));

  test('should not mangle flex basis (2)', passthroughCSS('h1{FLEX-BASIC:0%}'));

  test(
    'should retain IE flex-order declaration and not convert unitless zero',
    passthroughCSS('a{-ms-flex-order:5;-ms-flex-order:0px}')
  );

  test(
    'should not mangle -webkit-flex-basis',
    passthroughCSS('h1{-webkit-flex-basis:0%}')
  );

  test(
    'should not mangle -moz-flex-basis',
    passthroughCSS('h1{-moz-flex-basis:0%}')
  );

  test('should not mangle -moz-flex', passthroughCSS('h1{-moz-flex:1 1 0%}'));

  test(
    'should not mangle -ms-flex-preferred-size',
    passthroughCSS('h1{-ms-flex-preferred-size:0%}')
  );

  test(
    'should not mangle values without units',
    passthroughCSS('h1{z-index:5}')
  );

  test(
    'should convert dimensions in flex-basis when non-zero',
    processCSS('h1{flex-basis:192px}', 'h1{flex-basis:2in}')
  );

  test(
    'should format numbers in flex-grow and flex-shrink',
    processCSS(
      'h1{flex-grow:1.0;flex-shrink:2.0}',
      'h1{flex-grow:1;flex-shrink:2}'
    )
  );

  test(
    'should optimize flex shorthand numbers and percentages while preserving zero units',
    processCSS(
      'h1{flex:1.0 1.0 100.00%;h2{flex:1 1 0px};h3{flex:1 1 0%}}',
      'h1{flex:1 1 100%;h2{flex:1 1 0px};h3{flex:1 1 0%}}'
    )
  );

  test(
    'should preserve 0px in flex-basis',
    passthroughCSS('h1{flex-basis:0px}')
  );
});

describe('Height, min-width, and Browserslist zero-percentage', () => {
  test(
    'should strip trailing zeroes from percentage heights',
    processCSS('h1{height:12.500%}', 'h1{height:12.5%}')
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}')
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env using webpack file path',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [legacy] env using custom path',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      path: join(testDir, 'browserslist'),
      env: 'legacy',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props for IE 10 target',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      overrideBrowserslist: 'ie 10',
    })
  );

  test(
    'should not strip the percentage from 0 in max-height, height, and min-width props for IE 9 target',
    passthroughCSS('h1{height:0%;max-height:0%;min-width:0%}', {
      overrideBrowserslist: 'ie 9',
    })
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        from: join(testDir, 'browserslist/example.css'),
        env: 'modern',
      }
    )
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env using webpack file path',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        file: join(testDir, 'browserslist/example.css'),
        env: 'modern',
      }
    )
  );

  test(
    'should strip the percentage from 0 in max-height, height, and min-width props based on Browserslist config [modern] env using custom path',
    processCSS(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0;max-height:0;min-width:0}',
      {
        path: join(testDir, 'browserslist'),
        env: 'modern',
      }
    )
  );

  test('should cache browserslist determination across multiple process calls', async () => {
    const instance = plugin({ overrideBrowserslist: 'ie 11' });
    const { processCSS: run } = processCSSFactory([instance]);
    await run(
      'h1{height:0%;max-height:0%;min-width:0%}',
      'h1{height:0%;max-height:0%;min-width:0%}'
    )();
    await run(
      'h2{height:0%;max-height:0%;min-width:0%}',
      'h2{height:0%;max-height:0%;min-width:0%}'
    )();
  });

  test(
    'should strip the unit from 0 in max-height & height props',
    processCSS('h1{height:0em;max-height:0em}', 'h1{height:0;max-height:0}')
  );

  test(
    'should strip the unit from 0 in max-height & height props (2)',
    processCSS('h1{height:0em;MAX-HEIGHT:0em}', 'h1{height:0;MAX-HEIGHT:0}')
  );

  test(
    'should strip unit from zero length even when comments contain percentage',
    processCSS(
      'h1{height:0px /* 100% */};h2{max-height:0px /* 50% */}',
      'h1{height:0 /* 100% */};h2{max-height:0 /* 50% */}'
    )
  );
});
