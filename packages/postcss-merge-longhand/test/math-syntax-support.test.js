import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { requiredSupport } from '../src/lib/isFallback.js';

/**
 * A browser that parses calc() but not newer syntax inside it, such as the
 * constant `infinity` or division by a length, drops the declaration whole,
 * so a shorthand built around it loses every side the longhands kept.
 *
 * @param {string} css
 * @param {string} browsers
 * @return {Promise<string>}
 */
async function run(css, browsers) {
  const result = await postcss([
    plugin({ overrideBrowserslist: browsers }),
  ]).process(css, { from: undefined });
  return result.css;
}

const requires = (/** @type {string} */ value) =>
  requiredSupport(postcss.decl({ prop: 'width', value }));

/** @param {string} top */
const marginSides = (top) =>
  `margin-top:${top};margin-right:1px;margin-bottom:1px;margin-left:1px`;

describe('math constants inside calc()', () => {
  for (const constant of ['infinity', '-infinity', 'pi', 'e', 'NaN']) {
    test(`keep longhands unmerged for IE 11, which lacks ${constant}`, async () => {
      const css = `a{${marginSides(`calc(${constant} * 1px)`)}}`;
      assert.equal(await run(css, 'ie 11'), css);
    });
  }

  test('merge into the shorthand when every target parses the constant', async () => {
    assert.equal(
      await run(`a{${marginSides('calc(pi * 1px)')}}`, 'chrome 120'),
      'a{margin:calc(pi * 1px) 1px 1px}'
    );
  });

  test('are required support whatever their letter case', () => {
    assert.deepEqual(
      requires('calc(1px * PI)'),
      new Set(['calc', 'keyword:pi'])
    );
  });

  test('count -infinity as infinity', () => {
    assert.deepEqual(
      requires('calc(-infinity * 1px)'),
      new Set(['calc', 'keyword:infinity'])
    );
  });

  test('count inside a parenthesized block of calc()', () => {
    assert.deepEqual(
      requires('calc((e + 1) * 1px)'),
      new Set(['calc', 'keyword:e'])
    );
  });

  test('are no constants outside a math function, where e is a plain identifier', () => {
    assert.deepEqual(requires('counter(e)'), new Set(['function:counter']));
  });
});

describe('typed division inside calc()', () => {
  test('keeps longhands unmerged even for modern targets, as Firefox lacks it', async () => {
    const css = `a{${marginSides('calc(100px / 1px * 1px)')}}`;
    assert.equal(await run(css, 'chrome 120, firefox 120, safari 17'), css);
  });

  test('is required support when the divisor is a dimension', () => {
    assert.deepEqual(
      requires('calc(100px / 1px * 1px)'),
      new Set(['calc', 'typed-division'])
    );
  });

  test('is required support when the divisor is a block whose type is unknown', () => {
    assert.deepEqual(
      requires('calc(100% / (1 + 2))'),
      new Set(['calc', 'typed-division'])
    );
  });

  test('is not required when the divisor is a number', () => {
    assert.deepEqual(requires('calc(100% / 3)'), new Set(['calc']));
  });

  test('is not required for the slash of an rgb() alpha, which divides nothing', () => {
    assert.deepEqual(requires('rgb(0 0 0 / 50%)'), new Set());
  });
});

describe('calc() support', () => {
  test('keeps longhands unmerged for Opera Mini, which lacks calc() and would drop the whole shorthand', async () => {
    const css = `a{${marginSides('calc(1px + 2px)')}}`;
    assert.equal(await run(css, 'op_mini all'), css);
  });

  test('keeps longhands unmerged for the default targets, which include Opera Mini', async () => {
    const css = `a{${marginSides('calc(1px + 2px)')}}`;
    assert.equal(await run(css, 'defaults'), css);
  });

  test('merges into the shorthand when every target parses calc()', async () => {
    assert.equal(
      await run(
        `a{${marginSides('calc(1px + 2px)')}}`,
        'chrome 120, firefox 120, safari 17'
      ),
      'a{margin:calc(1px + 2px) 1px 1px}'
    );
  });

  test('drops a fallback for calc() and merges the rest when every target parses calc()', async () => {
    assert.equal(
      await run(
        'a{margin-left:10px;margin-left:calc(10px + 1em);margin-bottom:20px;color:red;margin-right:30px;margin-top:40px}',
        'chrome 120, firefox 120, safari 17'
      ),
      'a{color:red;margin:40px 30px 20px calc(10px + 1em)}'
    );
  });

  test('keeps width:10px before a calc() width for Opera Mini, which falls back on it', async () => {
    const css = 'a{width:10px;width:calc(100% - 10px)}';
    assert.equal(await run(css, 'op_mini all'), css);
  });
});
