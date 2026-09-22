import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('single-pass list trivia normalization', () => {
  test('important comments before comma with and without whitespace', () => {
    assert.equal(
      normalizeList('.a /*! c1 */ , .b', false, false),
      '.a /*! c1 */,.b'
    );
    assert.equal(
      normalizeList('.a/*! c1 */,.b', false, false),
      '.a/*! c1 */,.b'
    );
    assert.equal(
      normalizeList('.a  /*! c1 */  ,  .b', false, false),
      '.a /*! c1 */,.b'
    );
  });

  test('important comments after comma with and without whitespace', () => {
    assert.equal(
      normalizeList('.a , /*! c2 */ .b', false, false),
      '.a,/*! c2 */.b'
    );
    assert.equal(
      normalizeList('.a,/*! c2 */.b', false, false),
      '.a,/*! c2 */.b'
    );
    assert.equal(
      normalizeList('.a ,   /*! c2 */   .b', false, false),
      '.a,/*! c2 */.b'
    );
  });

  test('important comments both before and after commas', () => {
    assert.equal(
      normalizeList('.a /*! c1 */ , /*! c2 */ .b', false, false),
      '.a /*! c1 */,/*! c2 */.b'
    );
    assert.equal(
      normalizeList('.a/*! c1 */,/*! c2 */.b', false, false),
      '.a/*! c1 */,/*! c2 */.b'
    );
    assert.equal(
      normalizeList('.a /*! c1 */, /*! c2 */ .b, /*! c3 */ .c', false, false),
      '.a /*! c1 */,/*! c2 */.b,/*! c3 */.c'
    );
  });

  test('first and final list boundaries', () => {
    assert.equal(
      normalizeList('/*! first */ .a, .b', false, false),
      '/*! first */.a,.b'
    );
    assert.equal(
      normalizeList('/*! first */.a, .b', false, false),
      '/*! first */.a,.b'
    );
    assert.equal(
      normalizeList('.a, .b /*! final */', false, false),
      '.a,.b /*! final */'
    );
    assert.equal(
      normalizeList('.a, .b/*! final */', false, false),
      '.a,.b/*! final */'
    );
    assert.equal(
      normalizeList('/*! first */ .a, .b /*! final */', false, false),
      '/*! first */.a,.b /*! final */'
    );
  });

  test('multiple important comments at gaps and boundaries', () => {
    assert.equal(
      normalizeList('.a /*! c1 */ /*! c2 */ , .b', false, false),
      '.a /*! c1 */ /*! c2 */,.b'
    );
    assert.equal(
      normalizeList('.a /*! c1 *//*! c2 */ , .b', false, false),
      '.a /*! c1 *//*! c2 */,.b'
    );
    assert.equal(
      normalizeList('.a , /*! c1 */ /*! c2 */ .b', false, false),
      '.a,/*! c1 *//*! c2 */.b'
    );
    assert.equal(
      normalizeList('/*! lead1 */ /*! lead2 */ .a, .b', false, false),
      '/*! lead1 *//*! lead2 */.a,.b'
    );
    assert.equal(
      normalizeList('.a, .b /*! trail1 */ /*! trail2 */', false, false),
      '.a,.b /*! trail1 */ /*! trail2 */'
    );
    assert.equal(
      normalizeList('.a, .b /*! trail1 *//*! trail2 */', false, false),
      '.a,.b /*! trail1 *//*! trail2 */'
    );
  });

  test('repeated commas in forgiving lists reset post-comma comments', () => {
    assert.equal(
      normalizeList(':is(.a, /*! reset */ , /*! keep */ .b)', false, false),
      ':is(.a,/*! keep */.b)'
    );
  });

  test('skipped forgiving-list entries preserve child-position trivia semantics', () => {
    assert.equal(
      normalizeList(':is(.a /*! trail */, [a=], /*! lead */ .b)', false, false),
      ':is(.a /*! trail */,/*! lead */.b)'
    );
  });

  test('leading invalid member in forgiving lists drops its trailing comment trivia', () => {
    assert.equal(
      normalizeList(':is([invalid=] /*! c */, .b)', false, false),
      ':is(.b)'
    );
  });

  test('leading invalid member in forgiving lists drops both leading and trailing comment trivia', () => {
    assert.equal(
      normalizeList(':is(/*! c1 */ [invalid=] /*! c2 */, .b)', false, false),
      ':is(.b)'
    );
  });

  test('leading invalid member in forgiving lists preserves post-comma leading trivia on subsequent entry', () => {
    assert.equal(
      normalizeList(':is([invalid=] /*! c1 */, /*! c2 */ .b)', false, false),
      ':is(/*! c2 */.b)'
    );
  });

  test('leading invalid member in :where() drops its trailing comment trivia', () => {
    assert.equal(
      normalizeList(':where([invalid=] /*! c */, .b)', false, false),
      ':where(.b)'
    );
  });

  test('empty selector list containing only comments across commas is preserved as raw source', () => {
    assert.equal(
      normalizeList('/* c1 */ , /* c2 */', false, false),
      '/* c1 */ , /* c2 */'
    );
  });

  test('empty selector list containing only important comments across commas is preserved as raw source', () => {
    assert.equal(
      normalizeList('/*! c1 */ , /*! c2 */', false, false),
      '/*! c1 */ , /*! c2 */'
    );
  });

  test('nth-child and related of selector lists preserve list trivia', () => {
    assert.equal(
      normalizeList(':nth-child(2n of .a /*! c */, .b)', false, false),
      ':nth-child(2n of .a /*! c */,.b)'
    );
    assert.equal(
      normalizeList(':nth-child(2n of .a, /*! c */ .b)', false, false),
      ':nth-child(2n of .a,/*! c */.b)'
    );
    assert.equal(
      normalizeList(
        ':nth-child(2n of .a /*! c1 */, /*! c2 */ .b)',
        false,
        false
      ),
      ':nth-child(2n of .a /*! c1 */,/*! c2 */.b)'
    );
    assert.equal(
      normalizeList(
        ':nth-last-child(odd of /*! first */ .a, .b /*! final */)',
        false,
        false
      ),
      ':nth-last-child(odd of /*! first */.a,.b /*! final */)'
    );
    assert.equal(
      normalizeList(':nth-child(3n + 1 of .a /*! keep */, .b)', false, false),
      ':nth-child(3n+1 of .a /*! keep */,.b)'
    );
  });

  test(
    'postcss plugin integration preserves comments across selector lists with sort disabled',
    processCSS(
      'h1 /*! c1 */ , /*! c2 */ h2{color:blue}',
      'h1 /*! c1 */,/*! c2 */h2{color:blue}',
      { sort: false }
    )
  );

  test(
    'postcss plugin integration preserves comments across selector lists with default sorting',
    processCSS(
      'h1 /*! c1 */ , /*! c2 */ h2{color:blue}',
      '/*! c2 */h2,h1 /*! c1 */{color:blue}'
    )
  );

  test(
    'postcss plugin integration preserves comments in nth-child of list',
    processCSS(
      ':nth-child(2n of .a /*! c1 */, /*! c2 */ .b){color:blue}',
      ':nth-child(2n of .a /*! c1 */,/*! c2 */.b){color:blue}'
    )
  );

  test(
    'postcss plugin integration drops leading invalid forgiving entry and its trailing comment trivia',
    processCSS(
      ':is([invalid=] /*! c */, .b){color:blue}',
      ':is(.b){color:blue}'
    )
  );

  test(
    'postcss plugin integration drops leading invalid forgiving entry while keeping subsequent leading trivia',
    processCSS(
      ':is([invalid=] /*! c1 */, /*! c2 */ .b){color:blue}',
      ':is(/*! c2 */.b){color:blue}'
    )
  );
});
