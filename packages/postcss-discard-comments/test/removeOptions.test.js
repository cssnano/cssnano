import { describe, test } from 'node:test';

import { rejects, strictEqual } from 'node:assert/strict';

import postcss from 'postcss';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('Removal state and caching', () => {
  test(
    'should remove only the second identical preserved comment in custom properties',
    processCSS(':root{--a:/*!x*/;--b:/*!x*/}', ':root{--a:/*!x*/;--b: }', {
      removeAllButFirst: true,
    })
  );

  test(
    'should remove only the second identical preserved comment in declarations of different rules',
    processCSS(
      'a{color:/*!x*/red}b{color:/*!x*/red}',
      'a{color:/*!x*/red}b{color:red}',
      { removeAllButFirst: true }
    )
  );

  test(
    'should remove only the second identical preserved comment within one selector',
    processCSS('.a/*!x*/ .b/*!x*/ .c{}', '.a/*!x*/ .b .c{}', {
      removeAllButFirst: true,
    })
  );

  test(
    'should treat raws.between as preceding the selector for first-comment state',
    processCSS('.a/*!x*/,.b/*!x*/{}', '.a,.b/*!x*/{}', {
      removeAllButFirst: true,
    })
  );

  test('should invoke the remove callback once per comment, not once per distinct comment source', async () => {
    const seen = [];
    const processor = postcss([
      plugin({ remove: (comment) => seen.push(comment) || true }),
    ]);

    strictEqual(
      (
        await processor.process(':root{--a:/*!c*/;--b:/*!c*/}', {
          from: undefined,
        })
      ).css,
      ':root{--a: ;--b: }'
    );
    strictEqual(JSON.stringify(seen), JSON.stringify(['!c', '!c']));
  });

  test('should reset removal state between runs of a shared PostCSS processor', async () => {
    const processor = postcss([plugin({ removeAllButFirst: true })]);

    strictEqual(
      (await processor.process('/*!a*/a{}', { from: undefined })).css,
      '/*!a*/a{}'
    );
    strictEqual(
      (await processor.process('/*!b*/b{}', { from: undefined })).css,
      '/*!b*/b{}'
    );
  });

  test('should reject a non-function remove option with a TypeError', async () => {
    await rejects(
      () =>
        postcss([plugin({ remove: '/*!c*/' })]).process('a{color:red}', {
          from: undefined,
        }),
      TypeError
    );
  });
});

describe('Option flags', () => {
  test(
    'should remove comments marked as @ but keep other',
    processCSS(
      '/* keep *//*@ remove */h1{color:#000;/*@ remove */font-weight:700}',
      '/* keep */h1{color:#000;font-weight:700}',
      { remove: (comment) => comment[0] === '@' }
    )
  );

  test(
    'should remove all important comments, with a flag',
    processCSS(
      '/*!license*/h1{font-weight:700}/*!license 2*/h2{color:#000}',
      'h1{font-weight:700}h2{color:#000}',
      { removeAll: true }
    )
  );

  test(
    'should remove all important comments but the first, with a flag',
    processCSS(
      '/*!license*/h1{font-weight:700}/*!license 2*/h2{color:#000}',
      '/*!license*/h1{font-weight:700}h2{color:#000}',
      { removeAllButFirst: true }
    )
  );
});
