import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Normalise @supports queries', () => {
  test(
    'should normalise @supports queries',
    processCSS('@supports (display: grid) {}', '@supports(display:grid) {}')
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
      '@supports((text-align-last:justify) or (-moz-text-align-last:justify)) {}'
    )
  );

  test(
    'should normalise @supports with var',
    processCSS('@supports (--foo: green) {}', '@supports(--foo:green) {}')
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
      '@supports(--foo: ){html{background:green}}'
    )
  );

  test(
    'should minimize custom properties with multiple conditions',
    processCSS(
      '@supports ((--foo:  ) or (--bar: green )){html{background:green}}',
      '@supports((--foo: ) or (--bar:green)){html{background:green}}'
    )
  );

  test(
    'should preserve the empty custom-property fallback space only',
    processCSS(
      '@supports ((--empty:  ) or (--value: green )) {}',
      '@supports((--empty: ) or (--value:green)) {}'
    )
  );

  test(
    'should preserve whitespace around binary plus in non-math functions',
    processCSS(
      '@supports (width:calc-size(auto + 1px, size)){h1{color:red}}',
      '@supports(width:calc-size(auto + 1px,size)){h1{color:red}}'
    )
  );

  test(
    'should preserve whitespace around binary plus in unknown functions',
    processCSS(
      '@supports (width:future(auto + 1px)){h1{color:red}}',
      '@supports(width:future(auto + 1px)){h1{color:red}}'
    )
  );

  test(
    'should remove selector combinator whitespace in supports queries',
    processCSS('@supports selector(a + b){}', '@supports selector(a+b){}')
  );

  test(
    'should preserve banner comment in afterName when stripping whitespace',
    processCSS(
      '@supports /*! banner */ (display: grid) {}',
      '@supports/*! banner */(display:grid) {}'
    )
  );

  test(
    'should preserve multiple comments in afterName when stripping whitespace',
    processCSS(
      '@supports /* a */ /* b */ (display: grid) {}',
      '@supports/* a *//* b */(display:grid) {}'
    )
  );

  test(
    'should preserve whitespace after @supports when name ends in a dangling backslash',
    processCSS(
      '@supports\\ (display: grid) {}',
      '@supports\\ (display:grid) {}'
    )
  );

  test(
    'should preserve whitespace after @supports when prelude does not begin with parenthesis',
    processCSS(
      '@supports not (display: grid) {}',
      '@supports not (display:grid) {}'
    )
  );

  test('should handle @supports at-rule with missing raws.afterName', async () => {
    const root = postcss.parse('@supports (display: grid){}');
    delete root.first.raws.afterName;
    await postcss([plugin()]).process(root, { from: undefined });
    assert.strictEqual(root.first.raws.afterName, '');
  });

  test(
    'should strip whitespace after mixed-case @Supports when prelude begins with parenthesis',
    processCSS('@Supports (display: flex) {}', '@Supports(display:flex) {}')
  );

  test(
    'should strip whitespace after uppercase @SUPPORTS when prelude begins with parenthesis',
    processCSS('@SUPPORTS (display: flex) {}', '@SUPPORTS(display:flex) {}')
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

  test(
    'should not strip whitespace before parenthesis on unknown @idEnt at-rules',
    passthroughCSS('@idEnt (foo) {}')
  );

  test(
    'should not strip whitespace before parenthesis on @container at-rules',
    passthroughCSS('@container (width > 500px) {}')
  );

  test(
    'should not strip whitespace before parenthesis on custom at-rules',
    passthroughCSS('@custom-rule (param: 1) {}')
  );

  test(
    'should not strip whitespace before parenthesis on uppercase unknown at-rules',
    passthroughCSS('@FOO (bar) {}')
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
