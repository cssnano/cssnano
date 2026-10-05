import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
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
