import assert from 'node:assert';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should trim leading and trailing spaces from each grid-template-areas row',
  processCSS(
    "foo {\n  grid-template-areas: ' foo bar '\n                       ' baz qux ';\n}",
    "foo{grid-template-areas:'foo bar' 'baz qux'}"
  )
);

test(
  'should trim a single grid-template-areas row',
  processCSS("a{grid-template-areas:' a b '}", "a{grid-template-areas:'a b'}")
);

test(
  'should trim spaces and tabs from a double-quoted grid-template-areas row',
  processCSS(
    'a{grid-template-areas:"\ta b\t "}',
    'a{grid-template-areas:"a b"}'
  )
);

test(
  'should trim grid-template-areas rows when the property name is not lowercase',
  processCSS("a{GRID-TEMPLATE-AREAS:' a b '}", "a{GRID-TEMPLATE-AREAS:'a b'}")
);

test(
  'should collapse a run of spaces between names in a grid-template-areas row',
  processCSS("a{grid-template-areas:'a    b'}", "a{grid-template-areas:'a b'}")
);

test(
  'should collapse a tab between names in a grid-template-areas row',
  processCSS("a{grid-template-areas:'a\tb'}", "a{grid-template-areas:'a b'}")
);

test(
  'should trim each row independently when only one row has padding',
  processCSS(
    "a{grid-template-areas:' a b ' 'c  d'}",
    "a{grid-template-areas:'a b' 'c d'}"
  )
);

test(
  'should keep a grid-template-areas row with a backslash byte-identical because a space after an escape ends the escape, so collapsing it would merge two names',
  passthroughCSS("a{grid-template-areas:'\\61  b'}")
);

test(
  'should keep a row with an escaped trailing space byte-identical because removing the space would leave a backslash escaping the closing quote',
  passthroughCSS("a{grid-template-areas:'a\\ '}")
);

test(
  'should keep a row with an escaped backslash byte-identical even when a real space follows it, because row escapes are left to other plugins',
  passthroughCSS("a{grid-template-areas:'a\\\\ '}")
);

test(
  'should keep a whitespace-only row unchanged because trimming would leave it empty',
  passthroughCSS("a{grid-template-areas:' '}")
);

test('should keep an unclosed grid-template-areas string unchanged because trimming would turn it into a valid string', () => {
  // The parser rejects unclosed strings, so the value is set from code.
  const root = postcss.parse('a{}');
  root.first.append(
    postcss.decl({ prop: 'grid-template-areas', value: "' a b" })
  );
  postcss([plugin()]).process(root, { from: undefined }).sync();
  assert.strictEqual(root.first.first.value, "' a b");
});

test(
  'should trim each string row of the grid-template shorthand because any string in it is an area row',
  processCSS(
    "a{grid-template:' a b ' 1fr / auto}",
    "a{grid-template:'a b' 1fr/auto}"
  )
);

test(
  'should trim each string row of the grid shorthand because any string in it is an area row',
  processCSS("a{grid:' a b ' 1fr / auto}", "a{grid:'a b' 1fr/auto}")
);

test(
  'should keep a grid shorthand row with a backslash byte-identical because a space after an escape ends the escape',
  processCSS("a{grid:'\\61  b' 1fr / auto}", "a{grid:'\\61  b' 1fr/auto}")
);

test(
  'should keep spaces inside strings of properties other than grid-template-areas',
  passthroughCSS("a{content:' a '}")
);

test(
  'should keep a content string padded when an earlier grid-template-areas declaration has the same value',
  processCSS(
    "a{grid-template-areas:' a ';content:' a '}",
    "a{grid-template-areas:'a';content:' a '}"
  )
);

test(
  'should trim a grid-template-areas row when an earlier content declaration has the same value',
  processCSS(
    "a{content:' a ';grid-template-areas:' a '}",
    "a{content:' a ';grid-template-areas:'a'}"
  )
);

test(
  'should keep no-break spaces in a grid-template-areas row because they are name code points, not CSS whitespace',
  processCSS(
    "a{grid-template-areas:' \u00a0a\u00a0  b '}",
    "a{grid-template-areas:'\u00a0a\u00a0 b'}"
  )
);

test(
  'should keep a string inside a grid-template function byte-identical because only top-level strings are area rows',
  processCSS(
    "a{grid-template:var(--x, ' a  b ') 1fr / auto}",
    "a{grid-template:var(--x,' a  b ') 1fr/auto}"
  )
);

test(
  'should trim rows on both sides of a comment between grid-template-areas rows',
  processCSS(
    "a{grid-template-areas:' a  b ' /* c */ ' d  e '}",
    "a{grid-template-areas:'a b' /* c */ 'd e'}"
  )
);
