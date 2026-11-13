import { describe, test } from 'node:test';

import { rejects, strictEqual } from 'node:assert/strict';

import postcss from 'postcss';

import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';

import discardComments from '../../src/plugins/postcss-discard-comments/index.js';

const plugin = oneStagePlugin(discardComments);

const { processCSS } = processCSSFactory(plugin);

describe('Removal callback and removed options', () => {
  test(
    'should keep every important comment when a config still passes the removed removeAllButFirst option',
    processCSS(
      '/*!a*/a{color:/*!x*/red}/*!b*/.b/*!y*/{}',
      '/*!a*/a{color:/*!x*/red}/*!b*/.b/*!y*/{}',
      /** @type {import('../../src/plugins/postcss-discard-comments/index.js').Options} */ (
        /** @type {unknown} */ ({ removeAllButFirst: true })
      )
    )
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
});
