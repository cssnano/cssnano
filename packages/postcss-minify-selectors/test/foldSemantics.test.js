import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { generateFoldCandidates } from '../script/lib/fuzzGenerate.js';
import plugin from '../src/index.js';

const modernOptions = { overrideBrowserslist: 'last 2 Chrome versions' };

/**
 * A deliberately small reference implementation for the simple-selector
 * grammar that folding permits. It does not share the production tokenizer,
 * so a scanner bookkeeping error cannot validate itself here.
 *
 * @param {string} compound
 * @return {[number, number, number]}
 */
function referenceSpecificity(compound) {
  let id = 0;
  let cls = 0;
  let type = 0;
  const tokens = compound.match(
    /::?[a-z-]+|#[a-z-]+|\.[a-z-]+|\[[^\]]+\]|\*|[a-z-]+/giu
  );
  for (const token of tokens ?? []) {
    if (token.startsWith('#')) id++;
    else if (token.startsWith('.') || token.startsWith('[') || token[0] === ':')
      cls++;
    else if (token !== '*') type++;
  }
  return [id, cls, type];
}

/** @param {string} selector @return {string} */
async function minify(selector) {
  return (
    await postcss([plugin(modernOptions)]).process(`${selector}{color:red}`, {
      from: undefined,
    })
  ).css;
}

const cases = [
  {
    name: 'does not raise an action pseudo-class specificity to match a type and class',
    middles: [':hover', 'b.foo', 'c.bar'],
    folds: false,
  },
  {
    name: 'does not fold an action pseudo-class with a type selector',
    middles: [':focus', 'button', 'input'],
    folds: false,
  },
  {
    name: 'folds action pseudo-classes with equal specificity',
    middles: [':hover', ':focus', ':active'],
    folds: true,
  },
  {
    name: 'folds type and class compounds with equal specificity',
    middles: ['a.foo', 'b.bar', 'c.baz'],
    folds: true,
  },
  {
    name: 'does not fold an attribute with a type and class compound',
    middles: ['[data-a]', 'a.foo', 'b.bar'],
    folds: false,
  },
  {
    name: 'does not fold IDs with class selectors',
    middles: ['#first', '.second', '.third'],
    folds: false,
  },
];

for (const { name, middles, folds } of cases) {
  test(name, async () => {
    const specificities = middles.map(referenceSpecificity);
    const equalSpecificity = specificities.every(
      (value) => value.join(',') === specificities[0].join(',')
    );
    assert.equal(equalSpecificity, folds, 'reference specificity contract');

    const input = middles.map((middle) => `.scope ${middle} .tail`).join(',');
    const output = await minify(input);
    assert.equal(output.includes(':is('), folds, output);
    assert.equal(
      await minify(output.slice(0, output.indexOf('{'))),
      output,
      'folded output is idempotent'
    );
  });
}

test('does not fold unsafe middle grammar', async () => {
  for (const middles of [
    [':not(.a)', ':not(.b)', ':not(.c)'],
    ['svg|a', 'svg|b', 'svg|c'],
    ['[lang=en i]', '[lang=fr i]', '[lang=nl i]'],
    ['::before', '::after', '::marker'],
    ['&.a', '&.b', '&.c'],
  ]) {
    const output = await minify(
      middles.map((middle) => `.scope ${middle} .tail`).join(',')
    );
    assert.equal(output.includes(':is('), false, output);
  }
});

test('targeted fold corpus agrees with its independent safety contract', async () => {
  for (const seed of [1, 2, 3]) {
    for (const { selector, folds } of generateFoldCandidates(seed, 50)) {
      const output = await minify(selector);
      assert.equal(output.includes(':is('), folds, `${seed}: ${output}`);
    }
  }
});
