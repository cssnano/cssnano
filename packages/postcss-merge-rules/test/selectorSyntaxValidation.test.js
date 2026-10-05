import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge a relative selector that starts with a combinator inside :has()',
  processCSS('a:has(> b){color:red}x{color:red}', 'a:has(> b),x{color:red}', {
    overrideBrowserslist: 'Chrome 120',
  })
);

test(
  'should not merge a selector with a universal selector after a type selector',
  passthroughCSS('a*{color:red}x{color:red}')
);

test(
  'should not merge a selector with an invalid An+B argument',
  passthroughCSS(':nth-child(foo){color:red}x{color:red}')
);

test(
  'should not merge a selector with an empty :not() argument',
  passthroughCSS(':not(){color:red}x{color:red}')
);

test(
  'should not merge a selector with an invalid :dir() argument',
  passthroughCSS(':dir(x y){color:red}x{color:red}')
);

test(
  'should not merge a selector with a column combinator',
  passthroughCSS('a||b{color:red}x{color:red}')
);

test(
  'should not merge a selector with a /deep/ combinator',
  passthroughCSS('a /deep/ b{color:red}x{color:red}')
);

test(
  'should not merge a selector with an identifier-less hash',
  passthroughCSS('#1a{color:red}x{color:red}')
);

test(
  'should not merge a selector with a pseudo-element before a combinator',
  passthroughCSS('a::before b{color:red}x{color:red}')
);

test(
  'should merge a selector whose forgiving :is() argument drops a pseudo-element',
  processCSS(
    ':is(a::before,b) c{color:red}x{color:red}',
    ':is(a::before,b) c,x{color:red}',
    {
      overrideBrowserslist: 'Chrome 120',
    }
  )
);

test(
  'should not merge an attribute selector with whitespace inside its matcher',
  passthroughCSS('a{color:red}[x~ =y]{color:red}')
);

test(
  'should merge an attribute selector with whitespace after its matcher',
  processCSS('a{color:red}[x~= y]{color:red}', 'a,[x~= y]{color:red}', {
    overrideBrowserslist: 'Chrome 100',
  })
);

test(
  'should not merge an attribute selector with a non-modifier identifier after its value',
  passthroughCSS('a{color:red}[x=y z]{color:red}')
);

test(
  'should not merge an attribute selector with two names',
  passthroughCSS('a{color:red}[a b]{color:red}')
);

test(
  'should not merge an attribute selector with a repeated modifier',
  passthroughCSS('a{color:red}[x="y" i i]{color:red}')
);

for (const attribute of [
  '[*|x]',
  '[|x=y]',
  '[ns|x=y]',
  '[x|=y]',
  '[x="y" i]',
]) {
  test(
    `should merge the valid attribute selector ${attribute}`,
    processCSS(
      `a{color:red}${attribute}{color:red}`,
      `a,${attribute}{color:red}`,
      {
        overrideBrowserslist: 'Chrome 100',
      }
    )
  );
}

test(
  'should not merge an attribute selector with a second matcher after the modifier',
  passthroughCSS('a{color:red}[x="y" i =z]{color:red}')
);

test(
  'should not merge an attribute selector with an unknown operator character',
  passthroughCSS('a{color:red}[x&=y]{color:red}')
);

test(
  'should not merge a selector whose comment separates two compound selectors',
  passthroughCSS('div/**/span{color:red}.x{color:red}')
);

test(
  'should not merge a selector whose comment separates an id from a type',
  passthroughCSS('#a/**/b{color:red}.x{color:red}')
);

test(
  'should merge selectors with a comment next to a combinator',
  processCSS('a/* c */ > b{color:red}.x{color:red}', 'a > b,.x{color:red}')
);

test(
  'should drop a repeated rule whose selector is :is() with a comma, because the comma is nested and the lists are equal',
  processCSS(':is(a,b){color:red}:is(a,b){color:red}', ':is(a,b){color:red}', {
    overrideBrowserslist: 'Chrome 120',
  })
);

test(
  'should list both selectors when one list is :is(a,b) and the other is a,b, because a nested comma does not make the lists equal',
  processCSS(':is(a,b){color:red}a,b{color:red}', ':is(a,b),a,b{color:red}', {
    overrideBrowserslist: 'Chrome 120',
  })
);
