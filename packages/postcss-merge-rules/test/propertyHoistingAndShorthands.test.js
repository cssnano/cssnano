import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// `font-weight` appears twice, and both declarations are shared, so they travel
// into the merged rule together and keep their order. The `font-feature-settings`
// declarations between them are a different longhand and do not hold them back.
test(
  'should hoist a declaration together with the one that overrides it',
  processCSS(
    `.name {
        font-family:Inter,sans-serif;
        font-weight:400;
        font-size:18px;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }
      .name.small {
        font-family:Inter,sans-serif;
        font-weight:400;
        font-size:16px;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }`,
    `.name {
        font-size:18px
      }
      .name,.name.small {
        font-family:Inter,sans-serif;
        font-weight:400;
        line-height:1.5;
        letter-spacing:-.01em;
        -webkit-font-feature-settings:"ccmp","locl";
        -moz-font-feature-settings:"ccmp","locl";
        font-feature-settings:"ccmp","locl";
        font-weight:600
      }
      .name.small {
        font-size:16px
      }`
  )
);

test(
  'should not hoist a declaration whose only override is dropped later',
  passthroughCSS(
    '.a{font-weight:700;font:12px serif;font:14px serif}.b{font-weight:700;font:12px serif;font-family:serif;font:14px serif}'
  )
);

test(
  'should not hoist a longhand over a shorthand that stays behind',
  passthroughCSS(
    '.a{font-weight:700;font:12px serif}.b{font-weight:700;font-family:serif;font:12px serif}'
  )
);

test(
  'should not hoist a declaration reset by all in the same rule',
  passthroughCSS('.a{color:red;all:initial}.b{color:red;font-size:12px}')
);

test(
  'should hoist a custom property shared with a rule containing all',
  processCSS(
    '.a{--theme:dark}.b{--theme:dark;all:unset}',
    '.a,.b{--theme:dark}.b{all:unset}'
  )
);

test(
  'should keep hoisting declarations all does not reset',
  processCSS(
    '.a{direction:ltr;all:initial}.b{direction:ltr;color:red}',
    '.a{all:initial}.a,.b{direction:ltr}.b{color:red}'
  )
);

test(
  'should only remove the declaration the merged rule replaces',
  processCSS(
    '.a{margin-left:2px;color:red}.b{margin-left:2px;margin:1px;margin-left:2px}',
    '.a{color:red}.a,.b{margin-left:2px}.b{margin:1px;margin-left:2px}'
  )
);

test(
  'should hoist a declaration a later shorthand of another family does not reset',
  processCSS(
    '.a{border-radius:0;border:none;color:red}.b{border-radius:0;border:none}',
    '.a{color:red}.a,.b{border-radius:0;border:none}'
  )
);

// A shared declaration cannot be hoisted past a declaration that overrides it
// and stays behind, whatever the two properties are named. The shorthand
// relations come from `@webref/css`, so cases the old name-based heuristic
// could not see, such as `font` setting `line-height`, are covered too.
for (const [name, fixture] of [
  [
    'font sets line-height',
    '.a{font:12px/1.5 serif;line-height:2}.b{font:12px/1.5 serif}',
  ],
  [
    'border sets the colour of every edge',
    '.a{border-bottom:1px solid red;border-color:blue}.b{border-bottom:1px solid red}',
  ],
  ['gap sets row-gap', '.a{gap:1px;row-gap:5px}.b{gap:1px}'],
  ['inset sets top', '.a{inset:0;top:5px}.b{inset:0}'],
  [
    'columns sets column-count',
    '.a{columns:2 20em;column-count:5}.b{columns:2 20em}',
  ],
  [
    'flex-flow sets flex-wrap',
    '.a{flex-flow:row wrap;flex-wrap:nowrap}.b{flex-flow:row wrap}',
  ],
  [
    'grid-area sets grid-row',
    '.a{grid-area:1/2/3/4;grid-row:9}.b{grid-area:1/2/3/4}',
  ],
  [
    'white-space sets text-wrap',
    '.a{white-space:pre-wrap;text-wrap:nowrap}.b{white-space:pre-wrap}',
  ],
]) {
  test(
    `should not hoist a declaration past a shorthand: ${name}`,
    passthroughCSS(fixture)
  );
}

// The same relation, seen from the later rule: the declaration left behind
// there would end up overriding the merged rule.
test(
  'should not claim a declaration a shorthand overrides in the later rule',
  passthroughCSS('.a{column-gap:1px}.b{gap:0;column-gap:1px}')
);

// A flow-relative property and its physical counterpart are the same property
// under some writing modes, so their order has to hold as well.
for (const [name, fixture] of [
  [
    'margin',
    '.a{margin-inline-start:1px;margin-top:2px}.b{margin-inline-start:1px}',
  ],
  ['inset', '.a{inset-inline-start:1px;left:2px}.b{inset-inline-start:1px}'],
  ['size', '.a{width:5px;inline-size:9px}.b{width:5px}'],
]) {
  test(
    `should not reorder logical and physical properties: ${name}`,
    passthroughCSS(fixture)
  );
}

// Although flex and flex-direction share a name segment, they are independent
test(
  'should merge past an unrelated property in the same family',
  processCSS(
    '.a{flex:1 1 auto;flex-direction:row}.b{flex:1 1 auto}',
    '.a{flex-direction:row}.a,.b{flex:1 1 auto}'
  )
);

test(
  'should merge past an unrelated property in the same family (2)',
  processCSS(
    '.a{place-items:center;appearance:none}.b{place-items:center}',
    '.a{appearance:none}.a,.b{place-items:center}'
  )
);
