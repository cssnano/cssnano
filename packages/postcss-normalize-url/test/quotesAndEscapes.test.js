import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processor, processCSS, passthroughCSS } = processCSSFactory(plugin);

function processCSSAndConverge(fixture, expected, options) {
  return async () => {
    const result = await processor(fixture, options);
    assert.strictEqual(result.css, expected);
    const converged = await processor(result.css, options);
    assert.strictEqual(converged.css, expected);
    return result;
  };
}

describe('Strip', () => {
  test(
    'should strip double quotes',
    processCSS('h1{background:url("cat.jpg")}', 'h1{background:url(cat.jpg)}')
  );

  test(
    'should strip single quotes',
    processCSS("h1{background:url('cat.jpg')}", 'h1{background:url(cat.jpg)}')
  );

  test(
    'should pass through escaped whitespace and malformed URL tokens',
    passthroughCSS('h1{background:url(foo\\ bar.png);mask:url(foo(})}')
  );

  test(
    'should normalize empty and quoted URLs',
    processCSS(
      'h1{background:url(   ),url(" ./images/../cat.png ")}',
      'h1{background:url(),url(cat.png)}'
    )
  );

  test(
    'should strip double quotes uppercase URL',
    processCSS('h1{background:URL("cat.jpg")}', 'h1{background:URL(cat.jpg)}')
  );
});

describe('Escape', () => {
  test(
    'should pass through escaped whitespace in unquoted urls',
    passthroughCSS('h1{background:url(foo\\ bar.png)}')
  );

  test(
    'should pass through escaped parentheses in unquoted urls',
    passthroughCSS('h1{background:url(foo\\(bar.png)}')
  );

  test(
    'should preserve literal backslashes in unquoted urls',
    processCSS(
      'h1{background:url(foo\\\\bar.png)}',
      'h1{background:url(foo\\\\bar.png)}'
    )
  );

  test(
    'should unquote and preserve literal backslashes in quoted urls',
    processCSS(
      'h1{background:url("foo\\\\bar.png")}',
      'h1{background:url(foo\\\\bar.png)}'
    )
  );

  test(
    'should decode escaped characters in quoted urls instead of re-escaping their raw spelling',
    processCSS(
      'h1{background:url("foo\\zar.png")}',
      'h1{background:url(foozar.png)}'
    )
  );

  test(
    'should decode escaped parentheses in quoted urls when unquoting',
    processCSS(
      'h1{background:url("foo\\(bar.png")}',
      'h1{background:url(foo\\(bar.png)}'
    )
  );

  test(
    'should escape special characters',
    processCSS(
      'h1{background:url("http://website.com/assets)_test.png")}',
      'h1{background:url(http://website.com/assets\\)_test.png)}'
    )
  );

  test(
    'should not escape more than one special character',
    passthroughCSS('h1{background:url("http://website.com/assets_(test).png")}')
  );

  test(
    'should preserve multiple backslashes when unquoting quoted urls',
    processCSSAndConverge(
      'h1{background:url("foo\\\\bar\\\\baz.png")}',
      'h1{background:url(foo\\\\bar\\\\baz.png)}'
    )
  );

  test(
    'should escape double quotes when unquoting quoted urls',
    processCSSAndConverge(
      'h1{background:url("foo\\"bar\\"baz.png")}',
      'h1{background:url(foo\\"bar\\"baz.png)}'
    )
  );

  test(
    'should preserve backslashes when retaining quotes due to spaces and parentheses',
    processCSSAndConverge(
      'h1{background:url("foo\\\\bar (1).png")}',
      'h1{background:url("foo\\\\bar (1).png")}'
    )
  );

  test(
    'should preserve backslashes when retaining quotes due to spaces',
    processCSSAndConverge(
      'h1{background:url("a\\\\ b\\\\ c.png")}',
      'h1{background:url("a\\\\ b\\\\ c.png")}'
    )
  );

  test(
    'should unquote and preserve backslashes in single-quoted urls',
    processCSSAndConverge(
      "h1{background:url('foo\\\\bar.png')}",
      'h1{background:url(foo\\\\bar.png)}'
    )
  );

  test(
    'should escape newlines as hex escape sequences with space terminator',
    processCSSAndConverge(
      'h1{background:url("foo\\a bar.png")}',
      'h1{background:url(foo\\a bar.png)}'
    )
  );

  test(
    'should escape carriage returns in unquoted urls',
    processCSS(
      'h1{background:url(foo\\d bar.png)}',
      'h1{background:url(foo\\d bar.png)}'
    )
  );

  test(
    'should retain quoted carriage returns with their hex escape',
    processCSSAndConverge(
      'h1{background:url("foo\\d bar (1).png")}',
      'h1{background:url("foo\\d bar (1).png")}'
    )
  );

  test(
    'should escape form feeds in unquoted urls',
    processCSS(
      'h1{background:url(foo\\c bar.png)}',
      'h1{background:url(foo\\c bar.png)}'
    )
  );

  test(
    'should retain quoted form feeds with their hex escape',
    processCSSAndConverge(
      'h1{background:url("foo\\c bar (1).png")}',
      'h1{background:url("foo\\c bar (1).png")}'
    )
  );

  test(
    'should retain escaped quotes in single-quoted urls',
    processCSSAndConverge(
      "h1{background:url('foo\\ bar\\' (1).png')}",
      "h1{background:url('foo bar\\' (1).png')}"
    )
  );

  test(
    'should terminate newline escapes before following hex digits',
    processCSSAndConverge(
      'h1{background:url("foo\\a abc.png")}',
      'h1{background:url(foo\\a abc.png)}'
    )
  );
});

describe('Minimise', () => {
  test(
    'should minimise whitespace inside the url function',
    processCSS(
      'h1{background:url(               test.png           )}',
      'h1{background:url(test.png)}'
    )
  );

  test(
    'should minimise whitespace inside the url function (2)',
    processCSS('h1{background:url(               )}', 'h1{background:url()}')
  );

  test(
    'should minimise whitespace inside the url string',
    processCSS(
      'h1{background:url("               test.png      ")}',
      'h1{background:url(test.png)}'
    )
  );

  test(
    'should minimise whitespace inside the url string (2)',
    processCSS('h1{background:url("               ")}', 'h1{background:url()}')
  );

  test(
    'should minimise whitespace with special characters',
    processCSS(
      'h1{background:url("           test (2015).png     ")}',
      'h1{background:url("test (2015).png")}'
    )
  );
});

test(
  'should join multiline url functions',
  processCSS(
    'h1{background:url("some really long string \\\nspanning multiple lines")}',
    'h1{background:url("some really long string spanning multiple lines")}'
  )
);

test(
  'should join every escaped newline in a multiline url',
  processCSS(
    'h1{background:url("a \\\nb \\\nc")}',
    'h1{background:url("a b c")}'
  )
);

test(
  'should join escaped CRLF continuations in a multiline url',
  processCSS(
    'h1{background:url("a \\\r\nb \\\r\nc")}',
    'h1{background:url("a b c")}'
  )
);

test(
  'should join escaped CR continuations in a multiline url',
  processCSS('h1{background:url("a \\\rb")}', 'h1{background:url(a\\ b)}')
);

test(
  'should unquote a multiline url after joining lines',
  processCSS(
    'h1{background:url("http://example.com/foo\\\r\nbar.png")}',
    'h1{background:url(http://example.com/foobar.png)}'
  )
);

test(
  'should retain quotes for URLs containing non-printable control characters',
  processCSS(
    'h1{background:url("foo\x01bar.png")}',
    'h1{background:url("foo\x01bar.png")}'
  )
);

test(
  'should force quotes for unquoted URLs containing escaped control characters',
  processCSS(
    'h1{background:url(foo\\1b ar.png)}',
    'h1{background:url("foo\x1bar.png")}'
  )
);

test(
  'should force quotes for unquoted URLs containing control character byte',
  processCSS(
    'h1{background:url(foo\\1 bar.png)}',
    'h1{background:url("foo\x01bar.png")}'
  )
);

test(
  'should correctly parse six-digit hex escapes without trailing space',
  processCSS(
    'h1{background:url("foo\\00000aabc.png")}',
    'h1{background:url(foo\\a abc.png)}'
  )
);

test(
  'should unquote url strings ending with even number of backslashes in isClosedString',
  processCSS('h1{background:url("foo\\\\")}', 'h1{background:url(foo\\\\)}')
);

test('should reject strings ending with escaped quotes at EOF in isClosedString', async () => {
  const atRule = (await import('postcss')).default.atRule({
    name: 'namespace',
    params: String.raw`"foo\"`,
  });
  const root = (await import('postcss')).default.root({ nodes: [atRule] });
  await (
    await import('postcss')
  )
    .default([plugin()])
    .process(root, { from: undefined });
  assert.strictEqual(atRule.params, String.raw`"foo\"`);
});

test(
  'should preserve comments inside quoted url()',
  passthroughCSS('h1{background:url("foo.png" /* comment */)}')
);

test('should pass through unclosed url function before EOF', async () => {
  const root = (await import('postcss')).default.root();
  const decl = (await import('postcss')).default.decl({
    prop: 'background',
    value: 'url("unclosed',
  });
  root.append(decl);
  await (
    await import('postcss')
  )
    .default([plugin()])
    .process(root, { from: undefined });
  assert.strictEqual(decl.value, 'url("unclosed');
});
