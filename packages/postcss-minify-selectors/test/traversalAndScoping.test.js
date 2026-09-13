import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { isDefaultNamespace } from '../src/lib/isDefaultNamespace.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('cross-tool regressions', () => {
  // lightningcss#1239: pseudo-element arguments must not be dropped inside :has()
  test(
    'should preserve pseudo-element arguments inside :has()',
    passthroughCSS('.a:has(::part(foo)){color:red}')
  );

  // lightningcss#1239: pseudo-element arguments must not be dropped inside :is()
  test(
    'should preserve pseudo-element arguments inside :is()',
    passthroughCSS('.a:is(::slotted(.b)){color:red}')
  );

  // lightningcss#975: pseudo-elements must not be wrapped in :is()
  test(
    'should not wrap pseudo-elements in :is()',
    processCSS(
      '.a::before,.b::before{color:red}',
      '.a:before,.b:before{color:red}'
    )
  );

  // esbuild#4497: leading & nesting selector must not be removed
  test(
    'should preserve the leading & nesting selector',
    passthroughCSS('.parent{& .child{color:red}}')
  );

  // lightningcss#1318: nested selector lists must not be dropped
  test(
    'should preserve nested selector lists',
    passthroughCSS('.a{.b,.c{color:red}}')
  );

  // lightningcss#1002: :has() with complex relative selectors must be preserved
  test(
    'should preserve :has() with chained relative selectors',
    processCSS('.a:has(> .b + .c){color:red}', '.a:has(>.b+.c){color:red}')
  );
});

suite('AST traversal and namespace scoping', () => {
  test('does not abort traversal when encountering leading and interspersed non-rule nodes', async () => {
    const input =
      '/* leading */ @charset "utf-8"; @import "a.css"; h1,  h2 { color: red; } /* mid */ .a,  .b { color: blue; }';
    const result = await postcss([plugin()]).process(input, {
      from: undefined,
    });
    assert.equal(
      result.css,
      '/* leading */ @charset "utf-8"; @import "a.css"; h1,h2 { color: red; } /* mid */ .a,.b { color: blue; }'
    );
  });

  test('applies default namespace uniformly to rules both preceding and succeeding @namespace in AST', async () => {
    const input =
      '*.before, .dup, .dup { color: blue; } @namespace url(http://www.w3.org/2000/svg); *.after, .dup2, .dup2 { color: red; }';
    const result = await postcss([
      plugin({ convertToIs: false, sort: false }),
    ]).process(input, {
      from: undefined,
    });
    assert.equal(
      result.css,
      '*.before,.dup { color: blue; } @namespace url(http://www.w3.org/2000/svg); *.after,.dup2 { color: red; }'
    );
  });

  test('continues processing subsequent rules after skipping fixed-point or incomplete selectors', async () => {
    const input =
      'invalid: { color: red; } .fixed { color: blue; } h1,  h2 { color: green; } another: { color: yellow; }';
    const result = await postcss([plugin()]).process(input, {
      from: undefined,
    });
    assert.equal(
      result.css,
      'invalid: { color: red; } .fixed { color: blue; } h1,h2 { color: green; } another: { color: yellow; }'
    );
  });

  for (const { name, declarations, expectedSelector } of [
    {
      name: 'does not treat a prefixed declaration as a default namespace',
      declarations: '@namespace svg url(http://www.w3.org/2000/svg);',
      expectedSelector: '.card,.b',
    },
    {
      name: 'recognizes case-insensitive namespace and URL names with comments',
      declarations:
        '@NAMESPACE /* comment */ URL("http://www.w3.org/2000/svg");',
      expectedSelector: '*.card,.b',
    },
    {
      name: 'recognizes a quoted default namespace',
      declarations: '@namespace "http://www.w3.org/2000/svg";',
      expectedSelector: '*.card,.b',
    },
    {
      name: 'recognizes a default declaration after a prefixed declaration',
      declarations:
        '@namespace svg url(http://www.w3.org/2000/svg); @namespace url(http://www.w3.org/1999/xhtml);',
      expectedSelector: '*.card,.b',
    },
    {
      name: 'recognizes a default declaration before a prefixed declaration',
      declarations:
        '@namespace url(http://www.w3.org/1999/xhtml); @namespace svg url(http://www.w3.org/2000/svg);',
      expectedSelector: '*.card,.b',
    },
  ]) {
    test(name, async () => {
      const result = await postcss([
        plugin({ convertToIs: false, sort: false }),
      ]).process(`${declarations} *.card, .b, .b { color: red; }`, {
        from: undefined,
      });
      assert.equal(
        result.css,
        `${declarations} ${expectedSelector} { color: red; }`
      );
    });
  }

  test('processes stylesheet containing no rules without errors', async () => {
    const input = '/* comments only */ @charset "utf-8";';
    const result = await postcss([plugin()]).process(input, {
      from: undefined,
    });
    assert.equal(result.css, '/* comments only */ @charset "utf-8";');
  });

  test('collects and normalizes rules nested inside container at-rules', async () => {
    const input =
      '@media (min-width: 600px) { h1,  h2 { color: red; } .a,  .b { color: blue; } }';
    const result = await postcss([plugin()]).process(input, {
      from: undefined,
    });
    assert.equal(
      result.css,
      '@media (min-width: 600px) { h1,h2 { color: red; } .a,.b { color: blue; } }'
    );
  });

  test('collects and normalizes nested rules in CSS native nesting', async () => {
    const input =
      '.parent,  .parent-2 { color: red; .child,  .child-2 { color: blue; } & > .nested,  & + .nested { color: green; } }';
    const result = await postcss([plugin({ sort: false })]).process(input, {
      from: undefined,
    });
    assert.equal(
      result.css,
      '.parent,.parent-2 { color: red; .child,.child-2 { color: blue; } &>.nested,&+.nested { color: green; } }'
    );
  });
});

suite('isDefaultNamespace token classification', () => {
  for (const [name, params, expected] of [
    ['unquoted URL', 'url(http://example.com)', true],
    ['quoted URL', 'url("http://example.com")', true],
    ['case-insensitive URL', 'URL("http://example.com")', true],
    ['escaped function keyword', '\\75 rl(http://example.com)', true],
    ['double-quoted string', '"http://example.com"', true],
    ['single-quoted string', "'http://example.com'", true],
    [
      'comments around a URL',
      '/* c1 */ /* c2 */ url(http://example.com) /* c3 */',
      true,
    ],
    ['comment before a string', '/* comment */ "http://example.com"', true],
    ['identifier prefix', 'svg url(http://example.com)', false],
    ['identifier prefix before a string', 'svg "http://example.com"', false],
    [
      'comment before an identifier prefix',
      '/* comment */ svg url(http://example.com)',
      false,
    ],
    ['prefix named url', 'url "http://example.com"', false],
    ['empty parameters', '', false],
    ['whitespace-only parameters', '   ', false],
    ['missing parameters', undefined, false],
    ['unclosed comment', '/* unclosed comment', false],
  ]) {
    test(`classifies ${name}`, () => {
      assert.equal(isDefaultNamespace(params), expected);
    });
  }
});
