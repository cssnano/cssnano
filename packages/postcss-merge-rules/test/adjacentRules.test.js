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
  'should merge based on declarations',
  processCSS('h1{display:block}h2{display:block}', 'h1,h2{display:block}')
);

test(
  'should preserve an important comment in the first equal-declaration block',
  processCSS(
    '.a{/*!keep*/color:red}.b{color:red}',
    '.a{/*!keep*/}.a,.b{color:red}'
  )
);

test(
  'should preserve an important comment in the second equal-declaration block',
  processCSS(
    '.a{color:red}.b{/*!keep*/color:red}',
    '.a,.b{color:red}.b{/*!keep*/}'
  )
);

test(
  'should preserve important comments from both equal-declaration blocks',
  processCSS(
    '.a{/*!one*/color:red}.b{/*!two*/color:red}',
    '.a{/*!one*/}.a,.b{color:red}.b{/*!two*/}'
  )
);

test(
  'should not merge equal declarations with comments when selector length makes it unprofitable',
  passthroughCSS(
    '.very-long-selector-name-one{/*!keep*/color:red}.very-long-selector-name-two{color:red}'
  )
);

test(
  'should preserve comments when rules share multiple declarations',
  processCSS(
    '.a{/*!license*/color:red;font-size:12px}.b{color:red;font-size:12px}',
    '.a{/*!license*/}.a,.b{color:red;font-size:12px}'
  )
);

test(
  'should preserve an interspersed important comment while merging declarations',
  processCSS(
    '.a{color:red;/*!note*/font-size:12px}.b{color:red;font-size:12px}',
    '.a{/*!note*/}.a,.b{color:red;font-size:12px}'
  )
);

test(
  'should preserve an unimportant comment while merging declarations',
  processCSS(
    '.a{/*note*/color:red}.b{color:red}',
    '.a{/*note*/}.a,.b{color:red}'
  )
);

test(
  'should merge based on declarations (2)',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{color:red;line-height:1.5;font-size:2em}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should preserve repeated declaration merge output',
  processCSS(
    '.one{color:red;display:grid;gap:1rem}.two{color:red;display:grid;gap:1rem;font-weight:700}.three{color:red;display:grid;gap:1rem}',
    '.one,.two{color:red;display:grid;gap:1rem}.two{font-weight:700}.three{color:red;display:grid;gap:1rem}'
  )
);

test(
  'should merge based on declarations, with a different property order',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{font-size:2em;color:red;line-height:1.5}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should merge based on selectors',
  processCSS(
    'h1{display:block}h1{text-decoration:underline}',
    'h1{display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (2)',
  processCSS(
    'h1{color:red;display:block}h1{text-decoration:underline}',
    'h1{color:red;display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (3)',
  processCSS(
    'h1{font-size:2em;color:#000}h1{background:#fff;line-height:1.5}',
    'h1{font-size:2em;color:#000;background:#fff;line-height:1.5}'
  )
);

test('should handle empty rulesets', processCSS('h1{h2{}h3{}}', 'h1{h2,h3{}}'));

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
    'h1{box-shadow:inset 0 -10px 12px 0 red, inset 0 0 5px 0 red}h1,h2{color:blue}'
  );
});

test('should not crash when node.raws.value is null (2)', () => {
  const css =
    '#foo .bar { margin-left: auto ; margin-right: auto ; } #foo .qux { margin-right: auto ; }';
  const res = postcss([comments(), plugin]).process(css).css;

  assert.strictEqual(
    res,
    '#foo .bar{ margin-left:auto; } #foo .bar,#foo .qux{ margin-right:auto; }'
  );
});
