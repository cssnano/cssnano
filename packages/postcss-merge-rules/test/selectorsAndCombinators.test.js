import nodepath from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { join } = nodepath;
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should handle selector hacks',
  processCSS(
    '.classA{*zoom:1}.classB{box-sizing:border-box;position:relative;min-height:100%}.classC{box-sizing:border-box;position:relative}.classD{box-sizing:border-box;position:relative}',
    '.classA{*zoom:1}.classB{min-height:100%}.classB,.classC,.classD{box-sizing:border-box;position:relative}'
  )
);

test(
  'should merge ::placeholder selectors when supported',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    { overrideBrowserslist: 'Chrome 58' }
  )
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    from: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using webpack file path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    file: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using custom path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    path: join(testDir, 'browserslist'),
    env: 'legacy',
  })
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using webpack file path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using custom path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    }
  )
);

test(
  'should not merge general sibling combinators',
  passthroughCSS('div{color:#fff}a ~ b{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge child combinators',
  passthroughCSS('div{color:#fff}a > b{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1)',
  passthroughCSS('div{color:#fff}[href]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (2)',
  passthroughCSS('div{color:#fff}[href="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (3)',
  passthroughCSS('div{color:#fff}[href~="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 2.1) (4)',
  passthroughCSS('div{color:#fff}[href|="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 6',
  })
);

test(
  'should not merge attribute selectors (css 3)',
  passthroughCSS('div{color:#fff}[href^="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge attribute selectors (css 3) (2)',
  passthroughCSS('div{color:#fff}[href$="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge attribute selectors (css 3) (3)',
  passthroughCSS('div{color:#fff}[href*="foo"]{color:#fff}', {
    overrideBrowserslist: 'IE 7',
  })
);

test(
  'should not merge case insensitive attribute selectors',
  passthroughCSS('div{color:#fff}[href="foo" i]{color:#fff}', {
    overrideBrowserslist: 'Edge 15',
  })
);

test(
  'should not merge unsupported case-sensitive attribute selectors',
  passthroughCSS('div{color:#fff}[href="foo" s]{color:#fff}', {
    overrideBrowserslist: 'Chrome 100',
  })
);

test(
  'should recognize uppercase case-sensitive attribute selectors',
  passthroughCSS('div{color:#fff}[href="foo" S]{color:#fff}', {
    overrideBrowserslist: 'Edge 15',
  })
);

test(
  'should not merge :host(tagname) with tagname',
  processCSS(
    ':host(tag){display:block}tag{display:block}',
    ':host(tag){display:block}tag{display:block}'
  )
);

test(
  'should not merge unknown and known selector',
  passthroughCSS('p {color: blue}:nonsense {color: blue}')
);

test(
  'should merge rules with :where when supported',
  processCSS(
    'div:where(.a){color:red}div:where(.b){color:red}',
    'div:where(.a),div:where(.b){color:red}',
    { overrideBrowserslist: ['chrome 120', 'safari 17', 'firefox 120'] }
  )
);

test(
  'should not merge rules with :where when unsupported',
  passthroughCSS('div:where(.a){color:red}div:where(.b){color:red}', {
    overrideBrowserslist: ['ie 11'],
  })
);

test(
  'should not merge a pseudo-class selector with whitespace after the colon',
  passthroughCSS('a{color:red}b: hover{color:red}')
);

test(
  'should not merge a selector with three colons before a pseudo-element',
  passthroughCSS('a{color:red}b:::before{color:red}')
);

test(
  'should not merge a selector that starts with a combinator',
  passthroughCSS('+n{color:red}x{color:red}')
);

test(
  'should not merge a selector that ends with a combinator',
  passthroughCSS('a>{color:red}x{color:red}')
);

test(
  'should not merge a selector with two adjacent combinators',
  passthroughCSS('a>>b{color:red}x{color:red}')
);

test(
  'should not merge a :lang() selector whose languages are not comma-separated',
  passthroughCSS(':lang(en fr){color:red}x{color:red}')
);

test(
  'should merge a :lang() selector with comma-separated languages',
  processCSS(
    ':lang(en,fr){color:red}x{color:red}',
    ':lang(en,fr),x{color:red}',
    { overrideBrowserslist: 'Chrome 100' }
  )
);

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
