import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS, processor } = processCSSFactory(plugin);

async function processDeclaration(value) {
  const root = postcss
    .root()
    .append(
      postcss
        .rule({ selector: 'a' })
        .append(postcss.decl({ prop: 'unicode-range', value }))
    );
  await processor(root, {
    overrideBrowserslist: ['defaults', 'not ie <=11'],
  });
  return root.first.first;
}

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

describe('Pass', () => {
  test(
    'should pass through a unicode range that cannot be reduced',
    passthroughCSS(
      fixture('u+0-7f'), // Basic Latin
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should pass through a unicode range that cannot be reduced (2)',
    passthroughCSS(fixture('u+2125-2128'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through a unicode range that cannot be reduced (3)',
    passthroughCSS(fixture('u+2012-2f12'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through a unicode range that cannot be reduced (4)',
    passthroughCSS(fixture('u+2002-2ff2'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through css variables',
    passthroughCSS(fixture('var(--caseInsensitive)'))
  );

  test(
    'should pass through env variables',
    passthroughCSS(fixture('env(foo-bar)'))
  );

  test(
    'should preserve strings and functions',
    passthroughCSS(fixture('"u+2b00-2bff" /* comment */ var(--range)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test('should preserve a mismatched delimiter', async () => {
    const decl = await processDeclaration('u+2b00-2bff (] u+2b00-2bff');
    assert.equal(decl.value, 'u+2b00-2bff (] u+2b00-2bff');
  });

  test('should preserve an unclosed delimiter', async () => {
    const decl = await processDeclaration('u+2b00-2bff (u+2b00-2bff');
    assert.equal(decl.value, 'u+2b00-2bff (u+2b00-2bff');
  });

  test('should preserve an unterminated comment', async () => {
    const decl = await processDeclaration('u+2b00-2bff /*');
    assert.equal(decl.value, 'u+2b00-2bff /*');
  });

  test(
    'should preserve a bare URL token',
    passthroughCSS(fixture('url(u+2b00-2bff)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should normalize multiple ranges while preserving separators',
    processCSS(
      fixture('u+2b00-2bff/**/, U+1e00-1eff'),
      fixture('u+2b??/**/, u+1e??'),
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should preserve leading commas',
    passthroughCSS(fixture(',u+2b00-2bff'))
  );

  test(
    'should preserve trailing commas',
    passthroughCSS(fixture('u+2b00-2bff,'))
  );

  test(
    'should preserve doubled commas',
    passthroughCSS(fixture('u+2b00-2bff,,u+1e00-1eff'))
  );

  test(
    'should preserve adjacent unicode ranges without commas',
    passthroughCSS(fixture('u+2b00-2bff u+1e00-1eff'))
  );

  test(
    'should preserve values that are not unicode-range descriptor lists',
    passthroughCSS(
      fixture(
        'var(--range,u+2b00-2bff) func(u+2b00-2bff) [u+2b00-2bff] (u+2b00-2bff) u+2b00-2bff'
      ),
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should preserve escaped function names',
    passthroughCSS(fixture('v\\61 r(u+2b00-2bff)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test('should pass through initial', passthroughCSS(fixture('initial')));

  test(
    'should pass through unknown property',
    passthroughCSS('new-property: u+2b00-2bff')
  );
});
