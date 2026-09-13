import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Normalise @supports queries', () => {
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
    'should preserve the empty custom-property fallback space only',
    processCSS(
      '@supports ((--empty:  ) or (--value: green )) {}',
      '@supports ((--empty: ) or (--value:green)) {}'
    )
  );

  test(
    'should preserve whitespace around binary plus in non-math functions',
    processCSS(
      '@supports (width:calc-size(auto + 1px, size)){h1{color:red}}',
      '@supports (width:calc-size(auto + 1px,size)){h1{color:red}}'
    )
  );

  test(
    'should preserve whitespace around binary plus in unknown functions',
    passthroughCSS('@supports (width:future(auto + 1px)){h1{color:red}}')
  );

  test(
    'should remove selector combinator whitespace in supports queries',
    processCSS('@supports selector(a + b){}', '@supports selector(a+b){}')
  );
});

describe('Other at-rules handling', () => {
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
