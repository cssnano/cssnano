import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
