import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin, stageDescriptor } from '../../src/pipeline/host.js';

/**
 * A host plugin's stage member that builds the given stage, with no options.
 * @param {import('../../src/pipeline/host.js').Stage} stage
 */
const hostOf = (...stages) =>
  hostPlugin(
    stages.map((stage) => ({
      descriptor: stageDescriptor({ compile: () => () => stage }),
      options: {},
    }))
  );

/**
 * @param {string} name
 * @param {string[]} log the names of the stages in the order they ran
 */
function recordingStage(name, log) {
  return {
    run() {
      log.push(name);
    },
  };
}

describe('a host plugin', () => {
  test('runs its stages in the order they were given', async () => {
    const log = [];
    await postcss([
      hostOf(recordingStage('first', log), recordingStage('second', log)),
    ]).process('a{color:red}', { from: undefined });
    assert.deepStrictEqual(log, ['first', 'second']);
  });

  test('runs the at-rule and selector part of a value stage after its declaration walk, before the next phase', async () => {
    const log = [];
    /** @type {import('../../src/pipeline/host.js').ValueStage & {run: (root: unknown) => void}} */
    const valueAndPrelude = {
      forProperty: () => (buffer) => {
        log.push(`value:${buffer.text()}`);
      },
      run() {
        log.push('prelude');
      },
    };
    await postcss([
      hostOf(valueAndPrelude, recordingStage('next', log)),
    ]).process('a{color:red}', { from: undefined });
    assert.deepStrictEqual(log, ['value:red', 'prelude', 'next']);
  });

  test('passes the same stylesheet root to every stage', async () => {
    /** @type {unknown[]} */
    const roots = [];
    const record = { run: (/** @type {unknown} */ root) => roots.push(root) };
    await postcss([hostOf(record, record)]).process('a{}', {
      from: undefined,
    });
    assert.equal(roots.length, 2);
    assert.strictEqual(roots[0], roots[1]);
  });

  test('runs its stages after the plugins before it have changed the stylesheet', async () => {
    /** @type {string[]} */
    const seen = [];
    const addRule = {
      postcssPlugin: 'add-rule',
      OnceExit(/** @type {import('postcss').Root} */ root) {
        root.append({ selector: '.added' });
      },
    };
    const observe = {
      run(/** @type {import('postcss').Root} */ root) {
        seen.push(...root.nodes.map((node) => node.selector));
      },
    };
    await postcss([addRule, hostOf(observe)]).process('a{}', {
      from: undefined,
    });
    assert.deepStrictEqual(seen, ['a', '.added']);
  });
});
