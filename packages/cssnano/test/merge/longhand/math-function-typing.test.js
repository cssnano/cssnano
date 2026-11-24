import { test, describe } from 'node:test';
import postcss from 'postcss';
import preset from '#presets/default';
import { isColor } from '../../../src/merge/longhand/validateWsc.js';
import cssnanoUtils from '#utils';
import assert from 'node:assert/strict';

const processor = postcss(preset());

/* A browser ignores a declaration whose math function has the wrong type, so
 * the merge must not fold it into a shorthand, where it would drop the valid
 * parts or make an ignored declaration take effect. */
const minify = async (css) =>
  (await processor.process(css, { from: undefined })).css;

const sides = (top) =>
  `a{border-top:${top} solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}`;

describe('border width typed as a math function', () => {
  test('should not merge a border whose width is a percentage calculation', async () => {
    assert.doesNotMatch(await minify(sides('calc(10%)')), /border-width:calc/v);
  });

  test('should not fold an invalid width longhand into its shorthand', async () => {
    assert.doesNotMatch(
      await minify('a{border-top:1px solid red;border-top-width:calc(1deg)}'),
      /border-top:calc/v
    );
  });

  test('should keep the valid fallback width before an invalid math width', async () => {
    assert.match(
      await minify(
        'a{border-top-width:1px;border-top-width:calc(10%);border-top-style:solid;border-top-color:red}'
      ),
      /1px/v
    );
  });

  test('should not treat sign() as a width, as it returns a number', async () => {
    assert.doesNotMatch(
      await minify(
        'a{border-top-width:sign(1px);border-top-style:solid;border-top-color:red}'
      ),
      /border-top:/v
    );
  });

  test('should still merge a length-typed math width', async () => {
    assert.equal(
      await minify(sides('calc(1px + 1px)')),
      'a{border-color:red;border-style:solid;border-width:calc(2px) 1px 1px}'
    );
  });
});

test('should not merge a column-width that is not a length', async () => {
  assert.doesNotMatch(
    await minify('a{column-width:calc(1deg);column-count:2}'),
    /columns:/v
  );
});

test('should not merge a corner radius that is not a length-percentage', async () => {
  assert.doesNotMatch(
    await minify(
      'a{border-top-left-radius:calc(1deg);border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}'
    ),
    /border-radius:calc/v
  );
});

const check = (text) => {
  const list = cssnanoUtils.tokens(text);
  return isColor(text, list, 0, list.length);
};

describe('isColor', () => {
  test('should accept a leading color function', () => {
    assert.equal(check('rgb(0 0 0)'), true);
  });

  test('should reject a color function nested in an unknown function', () => {
    assert.equal(check('foo(rgb(0 0 0))'), false);
  });

  test('should reject a color function nested in a math function', () => {
    assert.equal(check('calc(rgb(0 0 0))'), false);
  });

  test('should reject a vendor-prefixed color function, which no browser parses', () => {
    assert.equal(check('-webkit-rgb(0 0 0)'), false);
  });
});
