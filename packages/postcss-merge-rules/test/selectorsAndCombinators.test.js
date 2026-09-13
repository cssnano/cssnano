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
