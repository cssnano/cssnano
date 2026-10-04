import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import { random } from '../../../util/fuzzRng.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// Rules with the same selector set the same properties on the same elements
// at the same specificity, so only a declaration that sets a conflicting
// property between them can make the source order matter.

test(
  'should move a later rule up into an earlier rule with the same selector (#1598)',
  processCSS(
    '.a{color:red}.b{width:1px}.a{height:1px}',
    '.a{color:red;height:1px}.b{width:1px}'
  )
);

test(
  'should move an earlier rule down when the later rule conflicts with the rule in between',
  processCSS(
    '.a{height:1px}.b{width:1px}.a{width:2px}',
    '.b{width:1px}.a{height:1px;width:2px}'
  )
);

test(
  // `body,input` sets only `margin`, which neither `body` rule sets.
  'should merge two body rules across a body,input rule that sets other properties (#805)',
  processCSS(
    'body{line-height:1.5;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}body,input{margin:0}body{color:#474747;background-color:#f0f0f0;text-align:left;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:-apple-system,blinkmacsystemfont,"Segoe UI","PingFang SC","Hiragino Sans GB","Ubuntu","Cantarell","Noto Sans","Helvetica Neue",arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";font-weight:400}',
    'body{line-height:1.5;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent;color:#474747;background-color:#f0f0f0;text-align:left;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:-apple-system,blinkmacsystemfont,"Segoe UI","PingFang SC","Hiragino Sans GB","Ubuntu","Cantarell","Noto Sans","Helvetica Neue",arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";font-weight:400}body,input{margin:0}'
  )
);

test(
  'should merge same-selector rules across an @media block that sets other properties',
  processCSS(
    '.a{color:red}@media print{.b{width:1px}}.a{height:1px}',
    '.a{color:red;height:1px}@media print{.b{width:1px}}'
  )
);

test(
  // `*margin-top` is stored apart from the property name, so the rule in
  // between sets `margin-top` and conflicts with the later `.a` rule.
  'should keep same-selector rules apart across a rule that sets the same property behind a hack prefix',
  passthroughCSS('.a{margin-top:1px}.b{*margin-top:2px}.a{margin-top:3px}')
);

test(
  'should merge three rules with the same selector in a chain',
  processCSS(
    '.a{color:red}.b{width:1px}.a{height:1px}.c{top:0}.a{left:0}',
    '.a{color:red;height:1px;left:0}.b{width:1px}.c{top:0}'
  )
);

test(
  'should merge across a rule that sets a different physical side of a logical property',
  processCSS(
    '.a{margin-left:1px}.b{margin-top:2px}.a{margin-right:3px}',
    '.a{margin-left:1px;margin-right:3px}.b{margin-top:2px}'
  )
);

test(
  'should keep both rules when each one conflicts with the rule in between',
  passthroughCSS('.a{color:red}.b{color:blue;height:1px}.a{height:2px}')
);

test(
  'should keep both rules when a shorthand in between resets longhands of both (margin against margin-top and margin-left)',
  passthroughCSS('.a{margin-top:1px}.b{margin:0}.a{margin-left:2px}')
);

test(
  'should keep both rules when a logical property in between can be the physical property of both',
  passthroughCSS(
    '.a{margin-left:1px}.b{margin-inline-start:2px}.a{margin-top:3px}'
  )
);

test(
  'should keep both rules when a rule in between declares all',
  passthroughCSS('.a{color:red}.b{all:unset}.a{width:1px}')
);

test(
  'should keep both rules when a conflicting rule in between is inside an @media block',
  passthroughCSS(
    '.a{color:red}@media print{.b{color:blue;width:2px}}.a{width:1px}'
  )
);

test(
  'should keep both rules when an unknown at-rule is in between',
  passthroughCSS('.a{color:red}@unknown x{.b{width:1px}}.a{height:1px}')
);

test(
  'should keep both rules when an @layer statement in between could reorder layers',
  passthroughCSS('.a{color:red}@layer base,theme;.b{width:1px}.a{height:1px}')
);

test(
  'should keep rules in different parents apart',
  passthroughCSS('.a{color:red}.b{width:1px}@media print{.a{height:1px}}')
);

test(
  'should keep a rule that contains a nested rule apart from its same-selector rule',
  passthroughCSS('.a{color:red;& .c{width:1px}}.b{height:1px}.a{top:0}')
);

test(
  'should keep @keyframes selectors apart, because a repeated keyframe selector is cascaded in order',
  passthroughCSS('@keyframes k{from{color:red}50%{width:1px}from{height:1px}}')
);

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

const mergingFixtures = [
  '.a{color:red}.b{width:1px}.a{height:1px}',
  '.a{height:1px}.b{width:1px}.a{width:2px}',
  '.a{color:red}.b{width:1px}.a{height:1px}.c{top:0}.a{left:0}',
  '.a{color:red}@media print{.b{width:1px}}.a{height:1px}',
  '.a{color:red}.x{height:1px}.b{color:red}',
  '.a,.b{color:red}.x{height:1px}.c,.d{color:red}',
  '@media print{.a{color:red}.x{height:1px}.b{color:red}}',
  '.a{color:red;top:0}.b{color:red;left:0}.c{color:red;right:0}',
  '.a{color:red}.x{height:1px}.c{top:0;color:red;left:0}',
  '.a{color:red}.x{height:1px}.some-long-selector{color:red}',
  // A partial merge splits `.b` around `a` and leaves two `.b` rules apart.
  '.b{background-color:red;color:blue}a{margin:0;color:blue}.b{color:blue}',
  '.a{margin:0;color:red}.c{color:red}.a{color:blue}',
  '.c{color:red}.a,.b{color:blue}.c{width:1px;color:blue}',
  '.a{margin-top:1px;color:red}.c{width:1px;color:red}.a{color:red}',
  '.a::before{color:blue;left:0;margin-top:1px}.a .b{color:blue;margin-top:1px}.a::before{margin-top:1px}',
  // The scan leaves two `.c` rules apart inside the same @layer.
  '@layer x{.c{}.a::before{background-color:red}}@layer x{.c{}}',
  // The scan joins `.c` rules inside a block that was already merged.
  '@supports (display:grid){.b{color:blue}}@supports (display:grid){.c{color:red}.c{margin:0}.b{width:1px;margin:0}}',
];

for (const fixture of mergingFixtures) {
  test(`should converge in one pass for ${fixture}`, async () => {
    const once = await postcss(plugin()).process(fixture, { from: undefined });
    const twice = await postcss(plugin()).process(once.css, {
      from: undefined,
    });
    assert.equal(twice.css, once.css);
  });
}

// Few selectors and properties make rules collide often, so the scan
// leaves same-selector rules apart for the later joins to find.
function generateStylesheet(seed) {
  const { int, pick, chance } = random(seed);
  const selectors = ['.a', '.b', '.c', '.a,.b'];
  const declarations = [
    'color:red',
    'color:blue',
    'width:1px',
    'height:1px',
    'margin:0',
    'margin-top:1px',
  ];
  const rule = () =>
    `${pick(selectors)}{${Array.from({ length: 1 + int(3) }, () => pick(declarations)).join(';')}}`;
  const group = () =>
    `${pick(['@media print', '@supports (display:grid)'])}{${Array.from({ length: 1 + int(3) }, rule).join('')}}`;
  return Array.from({ length: 2 + int(10) }, () =>
    chance(0.2) ? group() : rule()
  ).join('');
}

// Each join and each scan merge shortens the stylesheet, so repeating the
// joins after the scan must stop; a rewrite that grew it could cycle.
test(
  'should terminate with no longer output, settled after one run, for generated stylesheets',
  { timeout: 60_000 },
  async () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const input = generateStylesheet(seed);
      const once = await postcss(plugin()).process(input, { from: undefined });
      const twice = await postcss(plugin()).process(once.css, {
        from: undefined,
      });
      assert.ok(once.css.length <= input.length, `longer output for ${input}`);
      assert.equal(twice.css, once.css, `not settled for ${input}`);
    }
  }
);
