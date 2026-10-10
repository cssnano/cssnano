import { suite, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('string unquoting', () => {
  test(
    'should unquote an attribute value that is a plain identifier',
    processCSS('[title="foo"]{color:blue}', '[title=foo]{color:blue}')
  );

  test(
    'should unquote an attribute value with a leading hyphen and underscore',
    processCSS('[title="-_a9"]{color:blue}', '[title=-_a9]{color:blue}')
  );

  test(
    'should unquote a :lang() value that is a plain identifier',
    processCSS(':lang("en"){color:blue}', ':lang(en){color:blue}')
  );

  // Only CSS 2.1 rejects a leading "--", so browsers that implement just the
  // CSS 2.1 identifier grammar would drop the rule if it were unquoted.
  test(
    'should keep an attribute value starting with two hyphens quoted',
    passthroughCSS('[title="--foo"]{color:blue}')
  );

  // A leading digit, or a hyphen then a digit, is not an identifier in any
  // CSS version, so unquoting would make the selector invalid everywhere.
  test(
    'should keep an attribute value starting with a digit quoted',
    passthroughCSS('[title="1a"]{color:blue}')
  );

  test(
    'should keep an attribute value starting with a hyphen and a digit quoted',
    passthroughCSS('[title="-1a"]{color:blue}')
  );

  // CSS 2.1 and CSS Syntax 3 define the non-ASCII identifier range
  // differently, so unquote() accepts ASCII identifiers only.
  test(
    'should keep a non-ASCII attribute value quoted',
    passthroughCSS('[title="é"]{color:blue}')
  );

  // unquote() does not accept escapes, so the value stays quoted even though
  // the unquoted form would decode to the same value.
  test(
    'should keep an attribute value with a hex escape quoted',
    passthroughCSS('[title="\\66oo"]{color:blue}')
  );

  // An escaped backslash is an escape, which unquote() does not accept, so
  // the value stays quoted.
  test(
    'should keep an attribute value with an escaped backslash quoted',
    passthroughCSS('[title="a\\\\b"]{color:blue}')
  );
});
