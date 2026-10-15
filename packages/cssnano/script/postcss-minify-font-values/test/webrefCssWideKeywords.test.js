import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildCssWideKeywords,
  serialize,
  validate,
} from '../lib/webrefCssWideKeywords.js';

const properties = [
  { name: 'all', syntax: 'initial | inherit | unset | revert | revert-rule' },
];

test('buildCssWideKeywords keeps keywords that only a draft specification defines', () => {
  assert.deepStrictEqual(buildCssWideKeywords({ properties }), {
    keywords: ['inherit', 'initial', 'revert', 'revert-rule', 'unset'],
  });
});

test('validate rejects data that lacks a CSS-wide keyword every browser implements', () => {
  assert.throws(
    () => validate({ keywords: ['inherit', 'initial', 'unset'] }),
    /revert/v
  );
});

test('validate accepts the CSS-wide keywords of css-cascade-4', () => {
  assert.doesNotThrow(() =>
    validate({
      keywords: ['inherit', 'initial', 'revert', 'revert-layer', 'unset'],
    })
  );
});

test('serialize ends the JSON with a newline', () => {
  assert.ok(serialize({ keywords: ['initial'] }).endsWith('}\n'));
});
