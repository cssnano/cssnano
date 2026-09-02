import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import stylehacks from '../src/index.js';
import {
  findRuleSelectorHacks,
  findSelectorHacks,
} from '../src/lib/selectorScanner.js';

const positive = [
  ['star-html', '* html h1', 'IE 6', ['* html h1']],
  ['star-html', 'a, * HTML h1, b', 'IE 6', [' * HTML h1']],
  ['star-html', 'a, b, * html h1', 'IE 6', [' * html h1']],
  [
    'html-first-child',
    'html:first-child h1',
    'Opera 9',
    ['html:first-child h1'],
  ],
  [
    'html-first-child',
    'a, HTML:FIRST-CHILD h1, b',
    'Opera 9',
    [' HTML:FIRST-CHILD h1'],
  ],
  [
    'html-first-child',
    'a, b, html:first-child h1',
    'Opera 9',
    [' html:first-child h1'],
  ],
  ['html-comment-body', 'html > /**/ body h1', 'IE 6', ['html > /**/ body h1']],
  [
    'html-comment-body',
    'html /*x*/ > /**/ body h1',
    'IE 6',
    ['html /*x*/ > /**/ body h1'],
  ],
  [
    'html-comment-body',
    'html > /**/ /*x*/ body h1',
    'IE 6',
    ['html > /**/ /*x*/ body h1'],
  ],
  [
    'html-comment-body',
    'a, HTML ~ /*x*/ BODY h1, b',
    'IE 6',
    [' HTML ~ /*x*/ BODY h1'],
  ],
  [
    'html-comment-body',
    'a, b, html > /**/ body h1',
    'IE 6',
    [' html > /**/ body h1'],
  ],
  ['body-empty', 'body:empty h1', 'Firefox 2', ['body:empty h1']],
  ['body-empty', 'a, BODY:EMPTY h1, b', 'Firefox 2', [' BODY:EMPTY h1']],
  ['body-empty', 'a, b, body:empty h1', 'Firefox 2', [' body:empty h1']],
];

for (const [kind, selector, browser, expected] of positive) {
  test(`${kind} is detected in ${selector}`, async () => {
    const rule = postcss.parse(`${selector} { color: red }`).first;
    assert.equal(stylehacks.detect(rule), true);
    assert.deepEqual(findSelectorHacks(selector, kind), expected);
    const [expectedHack] = expected;

    const removed = await postcss(
      stylehacks({ overrideBrowserslist: 'Chrome 58' })
    ).process(`${selector} { color: red }`, { from: undefined });
    assert.equal(removed.css, '');

    const preserved = await postcss(
      stylehacks({ overrideBrowserslist: browser })
    ).process(`${selector} { color: red }`, { from: undefined });
    assert.equal(preserved.css, `${selector} { color: red }`);

    const lint = await postcss(
      stylehacks({ lint: true, overrideBrowserslist: 'Chrome 58' })
    ).process(`${selector} { color: red }`, { from: undefined });
    assert.equal(lint.warnings().length, 1);
    assert.ok(lint.warnings()[0].text.includes(expectedHack));
  });
}

test('returns every hack and preserves each matching alternative', () => {
  const selector =
    '* html h1, html:first-child h2, html > /**/ body h3, body:empty h4, * html h5';
  assert.deepEqual(findSelectorHacks(selector, 'star-html'), [
    '* html h1',
    ' * html h5',
  ]);
  assert.deepEqual(findSelectorHacks(selector, 'html-first-child'), [
    ' html:first-child h2',
  ]);
  assert.deepEqual(findSelectorHacks(selector, 'html-comment-body'), [
    ' html > /**/ body h3',
  ]);
  assert.deepEqual(findSelectorHacks(selector, 'body-empty'), [
    ' body:empty h4',
  ]);
});

test('shares rule results and invalidates them when selector sources change', () => {
  const rule = postcss.parse('* html h1 {}').first;
  const first = findRuleSelectorHacks(rule);
  assert.deepEqual(first.selector['star-html'], ['* html h1']);
  assert.strictEqual(findRuleSelectorHacks(rule).selector, first.selector);

  rule.selector = 'h1';
  assert.deepEqual(findRuleSelectorHacks(rule).selector['star-html'], []);
});

test('invalidates raw-selector results when the raw source changes', () => {
  const rule = postcss.parse('html > /**/ body h1 {}').first;
  assert.deepEqual(findRuleSelectorHacks(rule).raw['html-comment-body'], [
    'html > /**/ body h1',
  ]);

  rule.raws.selector.raw = 'h1';
  assert.deepEqual(findRuleSelectorHacks(rule).raw['html-comment-body'], []);
});

const negative = [
  ['star-html', '[data-value="* html h1"]'],
  ['star-html', ':is(* html h1)'],
  ['star-html', ':not(* html h1)'],
  ['star-html', '* htm\\78 h1'],
  ['star-html', '* html'],
  ['html-first-child', 'html:first-child'],
  ['html-comment-body', 'html + /**/ body h1'],
  ['html-comment-body', 'html > /**/ body'],
  ['html-comment-body', 'html > /**/ body /*x*/'],
  ['html-comment-body', 'html > body /**/ h1'],
  ['body-empty', 'body:empty'],
  ['body-empty', 'body:empty/**/h1'],
  ['star-html', 'a[foo=(x,y)]'],
];

for (const [kind, selector] of negative) {
  test(`${kind} does not classify ${selector}`, async () => {
    assert.deepEqual(findSelectorHacks(selector, kind), []);
    const rule = postcss.parse(`${selector} { color: red }`).first;
    assert.equal(stylehacks.detect(rule), false);
    const result = await postcss(
      stylehacks({ overrideBrowserslist: 'Chrome 58' })
    ).process(`${selector} { color: red }`, { from: undefined });
    assert.equal(result.css, `${selector} { color: red }`);
  });
}

for (const kind of [
  'star-html',
  'html-first-child',
  'html-comment-body',
  'body-empty',
]) {
  test(`${kind} passes malformed selector input through`, () => {
    const prefix = {
      'star-html': '* html',
      'html-first-child': 'html:first-child',
      'html-comment-body': 'html > /**/ body',
      'body-empty': 'body:empty',
    }[kind];
    for (const suffix of ['[', '(', ' "x', ' /*x']) {
      assert.deepEqual(findSelectorHacks(`${prefix} h1${suffix}`, kind), []);
    }
  });
}
