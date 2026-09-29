import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

// Frozen output from the pre-tokenizer value-parser implementation. Keep this
// compatibility corpus independent of the reducer; it is not a live
// differential test because the legacy implementation is not executed.
const corpus = [
  ['a{width:calc((192px) + 0px)}', 'a{width:calc((2in) + 0px)}'],
  [
    'a{width:calc(min((192px),0px) + 0px)}',
    'a{width:calc(min((2in),0px) + 0px)}',
  ],
  ['a{width:calc(192px/* 0px */ + 0px)}', 'a{width:calc(2in/* 0px */ + 0px)}'],
  ['a{width:calc([192px] + 0px)}', 'a{width:calc([2in] + 0px)}'],
  ['a{width:calc({192px} + 0px)}', 'a{width:calc({2in} + 0px)}'],
  ['a{width:calc([192px) + 0px] 192px}', 'a{width:calc([2in) + 0px] 2in}'],
  ['a{width:calc([min(0px)] 192px)}', 'a{width:calc([min(0px)] 2in)}'],
  ['a{width:calc({[192px} 192px])}', 'a{width:calc({[2in} 2in])}'],
  [
    'a{background:url("image 0px.png") 192px}',
    'a{background:url("image 0px.png") 2in}',
  ],
  [
    'a{background:url(image\\ 0px.png) 192px}',
    'a{background:url(image\\ 0px.png) 2in}',
  ],
  ['a{width:f\\75 n(192px)}', 'a{width:f\\75 n(2in)}'],
  ['a{width:192\\70 x}', 'a{width:192\\70 x}'],
  ['a{width:calc(192px + 0\\70 x)}', 'a{width:calc(2in + 0\\70 x)}'],
  ['a{background:URL(192px)}', 'a{background:URL(192px)}'],
  ['a{background:u\\72 l(192px)}', 'a{background:u\\72 l(192px)}'],
  ['a{color:COLOR-MIX(0px)}', 'a{color:COLOR-MIX(0px)}'],
  ['a{color:c\\6f lor-mix(0px)}', 'a{color:c\\6f lor-mix(0px)}'],
  ['a{color:HSL(0px)}', 'a{color:HSL(0px)}'],
  ['a{color:h\\73 l(0px)}', 'a{color:h\\73 l(0px)}'],
  ['a{width:LINEAR(0px)}', 'a{width:LINEAR(0px)}'],
  ['a{width:l\\69 near(0px)}', 'a{width:l\\69 near(0px)}'],
];

test('matches the frozen compatibility corpus', async () => {
  for (const [input, expected] of corpus) {
    await processCSS(input, expected)();
  }
});

test('preserves the legacy partial scan for an unbalanced function', async () => {
  const root = postcss.root({
    nodes: [postcss.decl({ prop: 'width', value: 'calc(192px + 0px' })],
  });
  const result = await postcss(plugin()).process(root, { from: undefined });
  assert.equal(result.css, 'width: calc(2in + 0px');
});
