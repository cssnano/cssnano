import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import comments from 'postcss-discard-comments';
import vars from 'postcss-simple-vars';
import {
  processCSSFactory,
  usePostCSSPlugin,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not throw on charset declarations',
  processCSS(
    '@charset "utf-8";@charset "utf-8";@charset "utf-8";h1{}h2{}',
    '@charset "utf-8";@charset "utf-8";@charset "utf-8";h1,h2{}'
  )
);

test(
  'should not throw on comment nodes',
  passthroughCSS(
    '.navbar-soft .navbar-nav > .active > a{color:#fff;background-color:#303030}.navbar-soft .navbar-nav > .open > a{color:#fff;background-color:rgba(48,48,48,0.8)}/* caret */.navbar-soft .navbar-nav > .dropdown > a .caret{border-top-color:#777;border-bottom-color:#777}'
  )
);

test(
  'should not throw on comment nodes (2)',
  processCSS(
    'h1{color:black;background:blue/*test*/}h2{background:blue}',
    'h1{color:black/*test*/}h1,h2{background:blue}'
  )
);

test(
  'should not be responsible for deduping declarations when merging',
  processCSS(
    'h1{display:block;display:block}h2{display:block;display:block}',
    'h1,h2{display:block;display:block}'
  )
);

test(
  'should not be responsible for deduping selectors when merging',
  processCSS(
    'h1,h2{display:block}h2,h1{display:block}',
    'h1,h2,h2,h1{display:block}'
  )
);

test(
  'should not crash on comment',
  processCSS(
    '.a,/*! x, y */.b{color:red}\n.c{color:red}',
    '.a,.b,.c{color:red}'
  )
);

test(
  'should handle css mixins',
  passthroughCSS(
    `paper-card{--paper-card-content:{padding-top:0};margin:0 auto 16px;width:768px;max-width:calc(100% - 32px)}`
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test('should not crash when node.raws.value is null', () => {
  const css =
    '$color: red; h1{box-shadow:inset 0 -10px 12px 0 $color, /* some comment */ inset 0 0 5px 0 $color;color:blue}h2{color:blue}';
  const res = postcss([vars(), comments(), plugin]).process(css).css;

  assert.strictEqual(
    res,
    'h1{box-shadow:inset 0 -10px 12px 0 red,  inset 0 0 5px 0 red}h1,h2{color:blue}'
  );
});

test('should not crash when node.raws.value is null (2)', () => {
  const css =
    '#foo .bar { margin-left: auto ; margin-right: auto ; } #foo .qux { margin-right: auto ; }';
  const res = postcss([comments(), plugin]).process(css).css;

  assert.strictEqual(
    res,
    '#foo .bar { margin-left: auto ; } #foo .bar,#foo .qux { margin-right: auto ; }'
  );
});
