import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should preserve a declaration from the second rule that revives an overridden value when merging identical selectors',
  processCSS(
    '.foo{color:red;color:blue}.foo{color:red}',
    '.foo{color:red;color:blue;color:red}'
  )
);

test(
  'should drop a declaration from the second rule only when it matches the winning declaration of the same property',
  processCSS(
    '.foo{color:blue;color:red}.foo{color:red}',
    '.foo{color:blue;color:red}'
  )
);

test(
  'should preserve a longhand from the second rule that overrides a later shorthand in the first rule',
  processCSS(
    '.foo{margin-top:0;margin:10px}.foo{margin-top:0}',
    '.foo{margin-top:0;margin:10px;margin-top:0}'
  )
);

test(
  'should merge identical declarations whose standard property names differ in case',
  processCSS('.foo{color:red}.bar{COLOR:red}', '.foo,.bar{COLOR:red}')
);

// Rules with an identical selector are joined into one rule, not into a
// selector list that repeats the selector.
test(
  'should drop a case-differing duplicate declaration when merging identical selectors',
  processCSS('.foo{color:red}.foo{COLOR:red}', '.foo{color:red}')
);

test(
  'should merge identical declarations whose vendor-prefixed property names differ in case',
  processCSS(
    '.a{-WEBKIT-TRANSFORM:scale(1)}.b{-webkit-transform:scale(1)}',
    '.a,.b{-webkit-transform:scale(1)}'
  )
);

test(
  'should not merge custom properties whose names differ in case',
  passthroughCSS('.a{--FOO:1}.b{--foo:1}')
);

test(
  'should preserve a shorthand from the second rule that overrides a longhand in the first rule',
  processCSS(
    '.foo{margin:10px;margin-top:0}.foo{margin:10px}',
    '.foo{margin:10px;margin-top:0;margin:10px}'
  )
);

// The important declaration is kept once: the rules have the same selector,
// so the second declaration repeats the first.
test(
  'should merge rules containing identical important declarations into one rule',
  processCSS(
    '.foo{color:red!important}.foo{color:red!important}',
    '.foo{color:red!important}'
  )
);

test(
  'should keep a normal declaration that duplicates the value of a merged important declaration',
  processCSS(
    '.foo{color:red!important}.foo{color:red}',
    '.foo{color:red!important;color:red}'
  )
);

test(
  'should drop a duplicate important declaration from the second rule while keeping its other declarations',
  processCSS(
    '.foo{color:red!important}.foo{color:red!important;font-weight:bold}',
    '.foo{color:red!important;font-weight:bold}'
  )
);

test(
  'should preserve an important declaration from the second rule that revives an overridden value',
  processCSS(
    '.foo{color:red!important;color:blue}.foo{color:red!important}',
    '.foo{color:red!important;color:blue;color:red!important}'
  )
);

test(
  'should append an important declaration from the second rule when its value differs',
  processCSS(
    '.foo{color:red!important}.foo{color:blue!important}',
    '.foo{color:red!important;color:blue!important}'
  )
);

test(
  'should preserve a custom property from the second rule that revives an overridden value',
  processCSS('.foo{--x:1;--x:2}.foo{--x:1}', '.foo{--x:1;--x:2;--x:1}')
);

test(
  'should drop a shared declaration from the second rule only while its value still wins',
  processCSS(
    '.foo{color:red;margin:10px}.foo{color:red;margin-top:0}',
    '.foo{color:red;margin:10px;margin-top:0}'
  )
);

test('should handle empty rulesets', processCSS('h1{h2{}h3{}}', 'h1{h2,h3{}}'));
