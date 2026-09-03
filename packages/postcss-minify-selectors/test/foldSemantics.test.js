import assert from 'node:assert/strict';
import { test } from 'node:test';
import jsdom from 'jsdom';
import postcss from 'postcss';
import { generateFoldCandidates } from '../script/lib/fuzzGenerate.js';
import plugin from '../src/index.js';
import {
  classifyFoldCandidate,
  compoundBoundaries,
  referenceSpecificity,
} from './referenceAst.js';

const modernOptions = { overrideBrowserslist: 'last 2 Chrome versions' };
const { JSDOM } = jsdom;

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
      (value) => value === specificities[0]
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

test('reference AST calculates Selectors 4 specificity', () => {
  const specificityCases = new Map([
    ['#id.foo[type=a] div', '1,2,1'],
    [':where(#id).foo', '0,1,0'],
    [':is(.a, #b, article.foo)', '1,0,0'],
    [':not(.a, article#b)', '1,0,1'],
    [':has(.a, article#b)', '1,0,1'],
    [':nth-child(2n of .a, #b)', '1,1,0'],
    ['::before', '0,0,1'],
  ]);
  for (const [selector, expected] of specificityCases) {
    assert.equal(referenceSpecificity(selector), expected, selector);
  }
});

test('reference AST exposes compound and combinator boundaries', () => {
  assert.deepEqual(compoundBoundaries('.scope > a.foo .tail'), {
    compounds: ['.scope', 'a.foo', '.tail'],
    combinators: ['>', ' '],
  });
  assert.deepEqual(compoundBoundaries(':is(.a, .b) + [data-x="a,b"]'), {
    compounds: [':is(.a, .b)', '[data-x="a,b"]'],
    combinators: ['+'],
  });
});

test('reference AST classifies fold safety and nth-of clauses', () => {
  for (const selector of ['.a', 'a.foo', ':hover', '[data-a]']) {
    assert.equal(classifyFoldCandidate(selector).safe, true, selector);
  }
  for (const selector of [
    'svg|a',
    '|*',
    '&.a',
    'a::before',
    ':not(.a)',
    '[lang=en i]',
    ':nth-child(2n of .a)',
  ]) {
    const result = classifyFoldCandidate(selector);
    assert.equal(result.safe, false, selector);
    if (selector.startsWith(':nth-')) assert.equal(result.hasNthOf, true);
  }
});

test('folding retains :is() specificity in the cascade', async () => {
  const source =
    '#h .target,#i .target,#j .target{color:red}.target{color:blue}';
  const output = await postcss([plugin(modernOptions)]).process(source, {
    from: undefined,
  }).css;
  assert.match(output, /:is\(#h,#i,#j\) \.target/u);
  const before = new JSDOM(
    `<style>${source}</style><div id="h"><div class="target low"></div></div>`
  );
  const after = new JSDOM(
    `<style>${output}</style><div id="h"><div class="target low"></div></div>`
  );
  assert.equal(
    before.window.getComputedStyle(
      before.window.document.querySelector('.target')
    ).color,
    'rgb(255, 0, 0)'
  );
  assert.equal(
    after.window.getComputedStyle(
      after.window.document.querySelector('.target')
    ).color,
    'rgb(255, 0, 0)'
  );
});

test('does not fold unsafe middle grammar', async () => {
  for (const middles of [
    [':not(.a)', ':not(.b)', ':not(.c)'],
    ['svg|a', 'svg|b', 'svg|c'],
    ['[lang=en i]', '[lang=fr i]', '[lang=nl i]'],
    ['::before', '::after', '::marker'],
    ['&.a', '&.b', '&.c'],
  ]) {
    assert.equal(
      middles.every((middle) => !classifyFoldCandidate(middle).safe),
      true
    );
    const output = await minify(
      middles.map((middle) => `.scope ${middle} .tail`).join(',')
    );
    assert.equal(output.includes(':is('), false, output);
  }
});

test('targeted fold corpus agrees with its independent safety contract', async () => {
  for (const seed of [1, 2, 3]) {
    for (const { selector, folds } of generateFoldCandidates(seed, 50)) {
      const middles = selector
        .split(',')
        .map((entry) => compoundBoundaries(entry).compounds[1]);
      const references = middles.map(classifyFoldCandidate);
      const astDecision =
        references.every((reference) => reference.safe) &&
        references.every(
          (reference) => reference.specificity === references[0].specificity
        );
      assert.equal(astDecision, folds, `${seed}: AST fold contract`);
      const output = await minify(selector);
      assert.equal(output.includes(':is('), folds, `${seed}: ${output}`);
    }
  }
});
