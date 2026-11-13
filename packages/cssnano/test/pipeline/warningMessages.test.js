import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * A stage whose reducers warn on each node of one kind, so the messages show
 * which node reported each warning.
 *
 * @param {import('../../src/pipeline/host.js').Stage} stage
 * @returns {Promise<[string, number][]>} the text and line of each message
 */
async function warningsOf(css, stage) {
  const host = hostPlugin([
    { entry: { create: () => stage }, options: {}, targets: false },
  ]);
  const result = await postcss([host]).process(css, { from: undefined });
  return result.messages.map((message) => [message.text, message.line]);
}

/** @param {string} text @returns {import('../../src/values/valueBuffer.js').ValueBuffer} */
const warnWith = (text) => (buffer) => {
  buffer.warn(text, { plugin: 'test-stage' });
};

describe('warnings of a stage reach the messages in document order', () => {
  test('a warning on each declaration reports its node, also for a repeated value', async () => {
    const stage = {
      forProperty: (property) =>
        property === 'color' ? warnWith('color warned') : null,
    };
    assert.deepEqual(await warningsOf('a{color:red}\nb{color:red}', stage), [
      ['color warned', 1],
      ['color warned', 2],
    ]);
  });

  test('a warning on each rule reports its node, also for a repeated selector', async () => {
    const stage = { selector: warnWith('selector warned') };
    assert.deepEqual(await warningsOf('a{}\na{}', stage), [
      ['selector warned', 1],
      ['selector warned', 2],
    ]);
  });

  test('a warning on each at-rule reports its node, also for a repeated name', async () => {
    const stage = {
      forAtRule: (name) =>
        name === 'media' ? { buffer: warnWith('media warned') } : null,
    };
    assert.deepEqual(
      await warningsOf('@media print{}\n@media print{}', stage),
      [
        ['media warned', 1],
        ['media warned', 2],
      ]
    );
  });
});
