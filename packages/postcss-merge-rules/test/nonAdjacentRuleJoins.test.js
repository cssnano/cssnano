import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// Joining same-selector rules first must not hide a merge by shared
// declarations that makes the output shorter.
const shorterOutputFixtures = [
  [
    '.a{color:blue}.b{color:blue}.c{margin-top:1px}.b{margin:0}',
    '.a,.b{color:blue}.c{margin-top:1px}.b{margin:0}',
  ],
  [
    'a{color:blue}.a{color:blue}@supports (display:grid){.a::before{width:2px}}.a{width:1px}',
    'a,.a{color:blue}@supports (display:grid){.a::before{width:2px}}.a{width:1px}',
  ],
  ['.a,.b{top:0}a{top:0}.b{left:0}a{left:0}', '.a,.b,a{top:0}.b,a{left:0}'],
  [
    '.a:hover{color:blue}.b{margin:0}.a:hover{margin:0}a{margin:0}',
    '.a:hover{color:blue}.b,.a:hover,a{margin:0}',
  ],
  ['a{}.a{}a{top:0}.a:hover{top:0}', 'a,.a{}a,.a:hover{top:0}'],
];

for (const [input, expected] of shorterOutputFixtures) {
  test(
    `should not output more than the merge by shared declarations for ${input}`,
    processCSS(input, expected)
  );
}

test(
  // The second rule repeats the first, so keeping both would only lengthen the output.
  'should keep one of two adjacent rules with the same selector and the same declarations that repeat a property',
  processCSS(
    '.a{color:red;color:blue}.a{color:red;color:blue}',
    '.a{color:red;color:blue}'
  )
);

// A later rule joins an earlier one that sets the same declarations when
// nothing in between sets a conflicting property, so the declarations are
// written once.

test(
  'should add the selector of a later rule to an earlier rule with the same declarations',
  processCSS(
    '.a{color:red}.x{height:1px}.b{color:red}',
    '.a,.b{color:red}.x{height:1px}'
  )
);

test(
  'should join selector lists with the same declarations across an unrelated rule',
  processCSS(
    '.a,.b{color:red}.x{height:1px}.c,.d{color:red}',
    '.a,.b,.c,.d{color:red}.x{height:1px}'
  )
);

test(
  'should write declarations shared by rules separated by other declarations once (#1371)',
  processCSS(
    '._a{height:2vw;background-position:50%;background-repeat:no-repeat;background-size:contain}._b{height:3vw;background-position:50%;background-repeat:no-repeat;background-size:contain}._c{height:4vw;background-position:50%;background-repeat:no-repeat;background-size:contain}._d{height:5vw;background-position:50%;background-repeat:no-repeat;background-size:contain}._e{height:6vw;background-position:50%;background-repeat:no-repeat;background-size:contain}._f{height:7vw;background-position:50%;background-repeat:no-repeat;background-size:contain}',
    '._a{height:2vw}._a,._b,._c,._d,._e,._f{background-position:50%;background-repeat:no-repeat;background-size:contain}._b{height:3vw}._c{height:4vw}._d{height:5vw}._e{height:6vw}._f{height:7vw}'
  )
);

test(
  'should join rules with the same declarations inside @media',
  processCSS(
    '@media print{.a{color:red}.x{height:1px}.b{color:red}}',
    '@media print{.a,.b{color:red}.x{height:1px}}'
  )
);

test(
  'should keep rules apart when a rule in between sets the same property to another value',
  passthroughCSS('.a{color:red}.x{color:blue}.b{color:red}')
);

test(
  'should keep rules apart when a rule inside @media in between sets the same property',
  passthroughCSS('.a{color:red}@media print{.x{color:blue}}.b{color:red}')
);

test(
  'should keep rules apart across an @layer statement, which sets the layer order',
  passthroughCSS('.a{color:red}.x{height:1px}@layer x,y;.b{color:red}')
);

test(
  'should keep rules apart when vendor-prefixed pseudo-elements cannot share a selector list',
  passthroughCSS(
    '.a::-webkit-foo{color:red}.x{height:1px}.b::-moz-foo{color:red}'
  )
);

test(
  'should keep keyframe selectors apart because they cascade by position',
  passthroughCSS('@keyframes k{from{color:red}50%{height:1px}to{color:red}}')
);

// A later rule that repeats all declarations of an earlier rule, and sets
// more, also joins it: only the repeated declarations leave the later rule.

test(
  'should add the selector of a later rule that repeats the declarations of an earlier rule and sets more',
  processCSS(
    '.a{color:red;top:0}.b{color:red;left:0}.c{color:red;right:0}',
    '.a{top:0}.a,.b,.c{color:red}.b{left:0}.c{right:0}'
  )
);

test(
  'should keep the remaining declarations of the later rule in their order',
  processCSS(
    '.a{color:red}.x{height:1px}.c{top:0;color:red;left:0}',
    '.a,.c{color:red}.x{height:1px}.c{top:0;left:0}'
  )
);

test(
  'should keep the later rule whole when a shorthand before the repeated longhand resets it',
  passthroughCSS(
    '.a{background-color:red}.x{height:1px}.c{background:blue;background-color:red}'
  )
);

test(
  'should keep the later rule whole when it sets all before the repeated declaration',
  passthroughCSS('.a{color:red}.x{height:1px}.c{all:unset;color:red}')
);

test(
  'should keep the later rule whole when a rule in between sets the repeated property to another value',
  passthroughCSS('.a{color:red}.x{color:blue}.c{color:red;top:0}')
);

test(
  'should keep the later rule whole when its selector costs more than the repeated declarations save',
  passthroughCSS(
    '.a{color:red}.x{height:1px}.some-long-selector{color:red;top:0}'
  )
);

test(
  'should remove a later rule with a long selector when the earlier rule takes all its declarations',
  processCSS(
    '.a{color:red}.x{height:1px}.some-long-selector{color:red}',
    '.a,.some-long-selector{color:red}.x{height:1px}'
  )
);
