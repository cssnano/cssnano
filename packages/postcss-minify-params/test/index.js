import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodepath from 'node:path';
import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { join } = nodepath;
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Normalise', () => {
  test(
    'should normalise @media queries',
    processCSS(
      '@media SCREEN ,\tprint {h1{color:red}}@media print,screen{h2{color:blue}}',
      '@media SCREEN,print {h1{color:red}}@media print,screen{h2{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (uppercase)',
    processCSS(
      '@MEDIA SCREEN ,\tPRINT {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}',
      '@MEDIA PRINT,SCREEN {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (2)',
    processCSS(
      '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
      '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (3)',
    processCSS(
      '@media (min-height: 680px),(min-height: 680px){h1{color:red}}',
      '@media (min-height:680px){h1{color:red}}'
    )
  );
});

test.skip(
  'should normalise @media queries (3) (lowercase and uppercase)',
  processCSS(
    '@media (min-height: 680px),(MIN-HEIGHT: 680PX){h1{color:red}}',
    '@media (min-height:680px){h1{color:red}}'
  )
);

describe('Normalise', () => {
  test(
    'should normalise "all" in @media queries',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should normalise "all" in @media queries (uppercase)',
    processCSS('@MEDIA ALL{h1{color:blue}}', '@MEDIA{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should not normalise "all" in @media queries',
    processCSS('@media all{h1{color:blue}}', '@media all{h1{color:blue}}', {
      overrideBrowserslist: 'IE 11',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env',
    passthroughCSS('@media all{h1{color:blue}}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env using webpack file path',
    passthroughCSS('@media all{h1{color:blue}}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env using custom path',
    passthroughCSS('@media all{h1{color:blue}}', {
      path: join(testDir, 'browserslist'),
      env: 'legacy',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env using webpack file path',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env using custom path',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all and" in @media queries',
    processCSS(
      '@media all and (min-width:500px){h1{color:blue}}',
      '@media (min-width:500px){h1{color:blue}}'
    )
  );

  test(
    'should make a media query list unconditional when it contains standalone all',
    processCSS('@media all, screen{h1{color:blue}}', '@media{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should make a comment-separated unconditional media query list empty',
    processCSS(
      '@media all/**/,screen{h1{color:blue}}',
      '@media{h1{color:blue}}',
      { overrideBrowserslist: 'Chrome 58' }
    )
  );

  test(
    'should preserve standalone all in a media list for legacy IE',
    processCSS(
      '@media all, screen{h1{color:blue}}',
      '@media all,screen{h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should preserve comment-separated all in a media list for legacy IE',
    processCSS(
      '@media all/**/,screen{h1{color:blue}}',
      '@media all/**/,screen{h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should normalise "all and" in @media queries (uppercase)',
    processCSS(
      '@media ALL AND (min-width:500px){h1{color:blue}}',
      '@media (min-width:500px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments while removing comment-separated all and',
    processCSS(
      '@media all/**/and (width:1px){h1{color:blue}}',
      '@media /**/(width:1px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments around removed all and',
    processCSS(
      '@media /*before*/ all /*between*/ and /*after*/ (width:1px){h1{color:blue}}',
      '@media /*before*/ /*between*//*after*/ (width:1px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments around legacy IE all and removal',
    processCSS(
      '@media /*before*/ all /*between*/ and /*after*/ (width:1px){h1{color:blue}}',
      '@media /*before*/ /*between*//*after*/ (width:1px){h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should not normalise "not all and" in @media queries',
    processCSS(
      '@media not all and (min-width: 768px){h1{color:blue}}',
      '@media not all and (min-width:768px){h1{color:blue}}'
    )
  );
});

test(
  'should not remove "all" from other at-rules',
  passthroughCSS('@foo all;')
);

test(
  'should not mangle @keyframe from & 100% in other values',
  passthroughCSS('@keyframes test{x-from-tag{color:red}5100%{color:blue}}')
);

test(
  'should not parse at rules without params',
  passthroughCSS('@font-face{font-family:test;src:local(test)}')
);

describe('Reduce', () => {
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

describe('Multiply', () => {
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
});

describe('Normalise', () => {
  test(
    'should normalise @supports queries',
    processCSS('@supports (display: grid) {}', '@supports (display:grid) {}')
  );

  test(
    'should normalise @supports with not',
    processCSS(
      '@supports not (display: grid) {}',
      '@supports not (display:grid) {}'
    )
  );

  test(
    'should normalise @supports with multiple conditions',
    processCSS(
      '@supports ((text-align-last: justify) or (-moz-text-align-last: justify)) {}',
      '@supports ((text-align-last:justify) or (-moz-text-align-last:justify)) {}'
    )
  );

  test(
    'should normalise @supports with var',
    processCSS('@supports (--foo: green) {}', '@supports (--foo:green) {}')
  );

  test(
    'should normalise @supports with :is',
    processCSS(
      '@supports not selector(:is(a, b)) {}',
      '@supports not selector(:is(a,b)) {}'
    )
  );
});

test(
  'should normalize space in custom property values',
  processCSS(
    '@supports (--foo:  ){html{background:green}}',
    '@supports (--foo: ){html{background:green}}'
  )
);

test(
  'should minimize custom properties with multiple conditions',
  processCSS(
    '@supports ((--foo:  ) or (--bar: green )){html{background:green}}',
    '@supports ((--foo: ) or (--bar:green)){html{background:green}}'
  )
);

test(
  'should not throw on empty parentheses',
  passthroughCSS('@media (){h1{color:blue}}')
);

test(
  'should remove function-boundary whitespace without removing required media spacing',
  processCSS(
    '@media only screen\n and ( min-width: 400px , min-height: 500px ) {}',
    '@media only screen and (min-width:400px,min-height:500px) {}'
  )
);

test(
  'should minify a whitespace-heavy media prelude',
  (() => {
    const input = Array.from({ length: 1000 }, () => '(min-width: 1px)').join(
      ' '
    );
    const expected = input.replaceAll(': ', ':');
    return processCSS(`@media ${input}{}`, `@media ${expected}{}`);
  })()
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

test(
  'should preserve the empty custom-property fallback space only',
  processCSS(
    '@supports ((--empty:  ) or (--value: green )) {}',
    '@supports ((--empty: ) or (--value:green)) {}'
  )
);

describe('Mangle', () => {
  test(
    'should not mangle @value',
    passthroughCSS(`@value vertical, center from './Flex.mod.css';`)
  );

  test(
    'should not mangle @value (uppercase)',
    passthroughCSS(`@VALUE vertical, center from './Flex.mod.css';`)
  );

  test(
    'should not mangle @page',
    passthroughCSS('@page :first { margin: 0; }')
  );

  test(
    'should not mangle @page (uppercase)',
    passthroughCSS('@PAGE :first { margin: 0; }')
  );

  test('should not mangle @charset', passthroughCSS('@charset "utf-8";'));

  test(
    'should not mangle @charset (uppercase)',
    passthroughCSS('@CHARSET "utf-8";')
  );

  test(
    'should not mangle @import',
    passthroughCSS('@import url("fineprint.css") print;')
  );

  test(
    'should not mangle @import (uppercase)',
    passthroughCSS('@IMPORT url("fineprint.css") print;')
  );

  test(
    'should not mangle @namespace',
    passthroughCSS('@namespace svg url(http://www.w3.org/2000/svg);')
  );

  test(
    'should not mangle @namespace (uppercase)',
    passthroughCSS('@NAMESPACE svg url(http://www.w3.org/2000/svg);')
  );

  test('should not mangle @font-face', passthroughCSS('@font-face {}'));

  test(
    'should not mangle @font-face (uppercase)',
    passthroughCSS('@FONT-FACE {}')
  );

  test('should not mangle @viewport', passthroughCSS('@viewport {}'));

  test(
    'should not mangle @viewport (uppercase)',
    passthroughCSS('@VIEWPORT {}')
  );

  test(
    'should not mangle @counter-style',
    passthroughCSS('@counter-style thumbs {}')
  );

  test(
    'should not mangle @counter-style (uppercase)',
    passthroughCSS('@COUNTER-STYLE thumbs {}')
  );

  test(
    'should not mangle @font-feature-values',
    passthroughCSS('@font-feature-values Font One {}')
  );

  test(
    'should not mangle @font-feature-values (uppercase)',
    passthroughCSS('@FONT-FEATURE-VALUES Font One {}')
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
