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
