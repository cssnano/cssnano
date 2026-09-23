import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should prefer double quotes by default',
  passthroughCSS(`p:after{content:""}`)
);

describe('Transform', () => {
  test(
    'should transform single quotes to double quotes by default',
    processCSS(`p:after{content:''}`, `p:after{content:""}`)
  );

  test(
    'should transform double quotes to single quotes via an option',
    processCSS(`p:after{content:""}`, `p:after{content:''}`, {
      preferredQuote: 'single',
    })
  );
});

describe('Keep', () => {
  test(
    'should keep single quotes inside a double quoted string intact',
    passthroughCSS(`p:after{content:"'string' is intact"}`)
  );

  test(
    'should keep double quotes inside a single quoted string intact',
    passthroughCSS(`p:after{content:'"string" is intact'}`)
  );
});

describe('Transform', () => {
  test(
    'should transform escaped single quotation marks if possible',
    processCSS(
      `p:after{content:'\\'string\\' is intact'}`,
      `p:after{content:"'string' is intact"}`
    )
  );

  test(
    'should transform escaped double quotation marks if possible',
    processCSS(
      `p:after{content:"\\"string\\" is intact"}`,
      `p:after{content:'"string" is intact'}`
    )
  );

  test(
    'should not transform quotation marks when mixed',
    passthroughCSS(`p:after{content:"\\"string\\" is 'intact'"}`)
  );

  test(
    'should not transform quotation marks when mixed (2)',
    passthroughCSS(`p:after{content:'"string" is \\'intact\\''}`)
  );

  test(
    'should transform escaped single quotation marks when mixed',
    processCSS(
      `p:after{content:'\\'string\\' is \\"intact\\"'}`,
      `p:after{content:'\\'string\\' is "intact"'}`
    )
  );

  test(
    'should transform escaped double quotation marks when mixed',
    processCSS(
      `p:after{content:"\\'string\\' is \\"intact\\""}`,
      `p:after{content:"'string' is \\"intact\\""}`
    )
  );
});

test(
  'should work with the attr function',
  processCSS(
    `p:after{content:'(' attr(href) ')'}`,
    `p:after{content:"(" attr(href) ")"}`
  )
);

test(
  'should preserve escaped whitespace and quote spelling when needed',
  passthroughCSS(`p:after{content:"a \\"quoted\\" 'value'"}`)
);

test(
  'should work in attribute selectors',
  processCSS(
    `[rel='external link']{color:#00f}`,
    `[rel="external link"]{color:#00f}`
  )
);

describe('Change', () => {
  test(
    'should change strings (1)',
    processCSS(
      `[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:#00f}`,
      `[a='escaped quotes " h1, h1, h1 " h1, h1, h1']{color:#00f}`
    )
  );

  test(
    'should change strings (2)',
    processCSS(
      `[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:#00f}`,
      `[a="escaped quotes ' h1, h1, h1 ' h1, h1, h1"]{color:#00f}`
    )
  );
});

test(
  'should join multiple line strings',
  processCSS(
    `p:after{content:" > this is some really\\
                     long text which is broken\\
                     over several lines."}`,
    `p:after{content:" > this is some really                     long text which is broken                     over several lines."}`
  )
);

test('should normalize a value with many string spans', async () => {
  const input = Array.from({ length: 1000 }, (_, index) => `'${index}'`).join(
    ' '
  );
  const expected = Array.from(
    { length: 1000 },
    (_, index) => `"${index}"`
  ).join(' ');
  const result = await processCSS(
    `a{content:${input}}`,
    `a{content:${expected}}`
  )();
  assert.equal(result.css, `a{content:${expected}}`);
});

describe('Line continuations', () => {
  test(
    'should collapse Windows CRLF line continuations',
    processCSS(`p{content:"hello\\\r\nworld"}`, `p{content:"helloworld"}`)
  );

  test(
    'should collapse legacy Mac CR line continuations',
    processCSS(`p{content:"hello\\\rworld"}`, `p{content:"helloworld"}`)
  );

  test(
    'should collapse form feed line continuations',
    processCSS(`p{content:"hello\\\fworld"}`, `p{content:"helloworld"}`)
  );

  test(
    'should collapse consecutive line continuations',
    processCSS(`p{content:"a\\\r\n\\\r\nb"}`, `p{content:"ab"}`)
  );

  test(
    'should collapse line continuation before an escaped quote',
    processCSS(`p{content:"hello\\\n\\"world"}`, `p{content:'hello"world'}`)
  );

  test(
    'should collapse line continuation before an escaped backslash',
    processCSS(
      `p{content:"hello\\\r\n\\\\world"}`,
      `p{content:"hello\\\\world"}`
    )
  );

  test(
    'should collapse line continuation at the end of a string',
    processCSS(`p{content:"hello\\\r\n"}`, `p{content:"hello"}`)
  );
});

describe('Multi-quote minification', () => {
  test(
    'should choose double quotes when string contains more single quotes',
    processCSS(
      `p{content:'\\'a\\' \\'b\\' \\'c\\' "z"'}`,
      `p{content:"'a' 'b' 'c' \\"z\\""}`
    )
  );

  test(
    'should choose single quotes when string contains more double quotes',
    processCSS(
      `p{content:"'a' 'b' 'c' \\"1\\" \\"2\\" \\"3\\" \\"4\\""}`,
      `p{content:'\\'a\\' \\'b\\' \\'c\\' "1" "2" "3" "4"'}`
    )
  );
});
