import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Aspect ratio reduction', () => {
  test(
    'should reduce min-aspect-ratio',
    processCSS(
      '@media (min-aspect-ratio: 32/18){h1{color:blue}}',
      '@media (min-aspect-ratio:16/9){h1{color:blue}}'
    )
  );

  test(
    'should reduce min-aspect-ratio (uppercase)',
    processCSS(
      '@media (MIN-ASPECT-RATIO: 32/18){h1{color:blue}}',
      '@media (MIN-ASPECT-RATIO:16/9){h1{color:blue}}'
    )
  );

  test(
    'should reduce max-aspect-ratio',
    processCSS(
      '@media (max-aspect-ratio: 48000000/32000000){h1{color:blue}}',
      '@media (max-aspect-ratio:3/2){h1{color:blue}}'
    )
  );

  test(
    'should reduce standard and legacy aspect-ratio range features',
    processCSS(
      '@media (aspect-ratio:32/18),(device-aspect-ratio:32/18),(min-aspect-ratio:32/18),(max-aspect-ratio:32/18),(min-device-aspect-ratio:32/18),(max-device-aspect-ratio:32/18){}',
      '@media (aspect-ratio:16/9),(device-aspect-ratio:16/9),(max-aspect-ratio:16/9),(max-device-aspect-ratio:16/9),(min-aspect-ratio:16/9),(min-device-aspect-ratio:16/9){}'
    )
  );

  test(
    'should reduce escaped and comment-separated aspect-ratio features',
    processCSS(
      '@media (min-\\61spect-ratio /*name*/ : /*colon*/ 32 /*left*/ / /*slash*/ 18 /*right*/){}',
      '@media (min-\\61spect-ratio /*name*/:/*colon*/ 16 /*left*///*slash*/ 9 /*right*/){}'
    )
  );

  test(
    'should not reduce ratios in strings, URLs, or general-enclosed functions',
    processCSS(
      '@media (aspect-ratio:32/18) and (x:"32/18") and (x:unknown(32/18)){}@media (x:url(foo(32/18))){}',
      '@media (aspect-ratio:16/9) and (x:"32/18") and (x:unknown(32/18)){}@media (x:url(foo(32/18))){}'
    )
  );

  test(
    'should preserve mismatched aspect-ratio delimiters',
    passthroughCSS('@media (aspect-ratio:32/18]{}')
  );

  test(
    'should preserve the degenerate zero-over-zero ratio',
    passthroughCSS('@media (aspect-ratio:0/0){}')
  );

  test(
    'should preserve the zero-over-one ratio',
    processCSS('@media (aspect-ratio:0/1){}', '@media (aspect-ratio:0/1){}')
  );

  test(
    'should sort and deduplicate media segments after every segment is edited',
    processCSS(
      '@media (max-aspect-ratio:48000000/32000000) , (min-aspect-ratio:32/18) , (max-aspect-ratio:32/18){}',
      '@media (max-aspect-ratio:16/9),(max-aspect-ratio:3/2),(min-aspect-ratio:16/9){}'
    )
  );
});

describe('Aspect ratio multiplication and decimal conversion', () => {
  test(
    'should multiply aspect ratio',
    processCSS(
      '@media (max-aspect-ratio: 1.5/1){h1{color:blue}}',
      '@media (max-aspect-ratio:3/2){h1{color:blue}}'
    )
  );

  test(
    'should multiply aspect ratio (2)',
    processCSS(
      '@media (max-aspect-ratio: .5 / 1){h1{color:blue}}',
      '@media (max-aspect-ratio:1/2){h1{color:blue}}'
    )
  );

  test(
    'should reduce decimal ratios exactly without growing output',
    processCSS('@media (aspect-ratio:0.3/0.1){}', '@media (aspect-ratio:3/1){}')
  );

  test(
    'should reduce exponent ratios exactly',
    processCSS(
      '@media (aspect-ratio:3e-1/1e-1){}',
      '@media (aspect-ratio:3/1){}'
    )
  );

  test(
    'should preserve decimal ratios when reduction would not be shorter',
    processCSS(
      '@media (aspect-ratio:1.01/1){}',
      '@media (aspect-ratio:1.01/1){}'
    )
  );

  test(
    'should reduce direct media aspect-ratio features',
    processCSS(
      '@media (min-aspect-ratio:32/18),(max-aspect-ratio:32/18){}',
      '@media (max-aspect-ratio:16/9),(min-aspect-ratio:16/9){}'
    )
  );

  test(
    'should not reduce aspect-ratio syntax outside direct media features',
    passthroughCSS(
      '@supports (future-aspect-ratio:32/18){}@supports (--future-aspect-ratio:32/18){}@media (future-aspect-ratio:32/18){}@media (fn(min-aspect-ratio:32/18)){}'
    )
  );

  test(
    'should reduce aspect-ratio syntax in direct supports features',
    processCSS(
      '@supports (aspect-ratio:32/18){}',
      '@supports (aspect-ratio:16/9){}'
    )
  );

  test(
    'should reduce aspect-ratio syntax in nested supports groupings',
    processCSS(
      '@supports ((aspect-ratio:32/18)){}@supports ((display:grid) and (aspect-ratio:32/18)){}',
      '@supports ((aspect-ratio:16/9)){}@supports ((display:grid) and (aspect-ratio:16/9)){}'
    )
  );

  test(
    'should not reduce aspect-ratio syntax in nested general-enclosed functions',
    passthroughCSS('@supports (unknown((aspect-ratio:32/18))){}')
  );

  test(
    'should preserve unbalanced media and supports preludes',
    passthroughCSS(
      '@media (min-aspect-ratio:32/18 {}@supports (display:grid {}'
    )
  );

  test(
    'should not minify whitespace or ratios in unbalanced preludes',
    passthroughCSS(
      '@media (min-aspect-ratio: 32 / 18 {} @supports (display: grid {}'
    )
  );

  test(
    'should replace aspect-ratio numbers at their tokenizer source offsets',
    processCSS(
      '@media screen and (min-aspect-ratio:\n 48000000 / 32000000) {}',
      '@media screen and (min-aspect-ratio:3/2) {}'
    )
  );

  test(
    'should minify comment-heavy whitespace and ratios without changing comments',
    processCSS(
      '@media /*a*/ (min-aspect-ratio: /*b*/ 48000000 /*c*/ / /*d*/ 32000000) /*e*/ {}',
      '@media /*a*/ (min-aspect-ratio:/*b*/ 3 /*c*///*d*/ 2) /*e*/ {}'
    )
  );
});
