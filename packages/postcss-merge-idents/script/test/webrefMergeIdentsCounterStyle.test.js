import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMergeIdents } from '../lib/webrefMergeIdents.js';

/** @param {Partial<import('../lib/webrefMergeIdents.js').WebrefData>} data */
function webref({ properties = [], atrules = [], types = [], functions = [] }) {
  return { properties, atrules, types, functions };
}

test('reserves the keywords of a descriptor that reaches a counter style name through another type', () => {
  const data = buildMergeIdents(
    webref({
      atrules: [
        {
          name: '@counter-style',
          descriptors: [{ name: 'marker', syntax: '<marker-kind>' }],
        },
      ],
      types: [
        {
          name: 'marker-kind',
          syntax: 'disc-like | <counter-style-name>',
        },
      ],
    })
  );
  assert.ok(data.counterStyle.keywords.includes('disc-like'));
});

test('reserves the keywords of any property that reaches a counter style name, not only list-style', () => {
  const data = buildMergeIdents(
    webref({
      properties: [
        { name: 'marker-style', syntax: 'bullet-like | <counter-style>' },
      ],
      types: [{ name: 'counter-style', syntax: '<counter-style-name>' }],
    })
  );
  assert.ok(data.counterStyle.keywords.includes('bullet-like'));
});
