import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('Extraneous whitespace suppression around punctuation with comments', () => {
  test(
    'should not add whitespace before the closing parenthesis of url() when a comment is removed',
    processCSS('a{background:url("foo" /*c*/)}', 'a{background:url("foo")}')
  );

  test(
    'should not add whitespace before the closing parenthesis of var() when a comment is removed',
    processCSS('a{width:var(--x /*c*/)}', 'a{width:var(--x)}')
  );

  test(
    'should not add whitespace before the closing parenthesis of calc() when a comment is removed',
    processCSS('a{width:calc(10px + 20px /*c*/)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should not add whitespace after the opening parenthesis of calc() when a comment is removed',
    processCSS('a{width:calc(/*c*/10px + 20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should not add whitespace before a comma when a comment touching it is removed',
    processCSS(
      'a{font-family:Helvetica/*c*/, Arial}',
      'a{font-family:Helvetica, Arial}'
    )
  );

  test(
    'should not add whitespace before a comma when a comment preceding it is removed',
    processCSS(
      'a{font-family:Helvetica /*c*/, Arial}',
      'a{font-family:Helvetica, Arial}'
    )
  );
});
