import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * A host plugin's stage member that builds the given stage, with no options.
 * @param {import('../../src/pipeline/host.js').Stage} stage
 */
const hostOf = (...stages) =>
  hostPlugin(
    stages.map((stage) => ({
      descriptor: { compile: () => () => stage },
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

/** @param {{count: number, targets: unknown[]}} calls */
const countingDescriptor = (calls, targets = false) => ({
  targets,
  compile(
    /** @type {Record<PropertyKey, unknown>} */ _options,
    /** @type {readonly string[] | undefined} */ resolved
  ) {
    calls.count += 1;
    calls.targets.push(resolved);
    return () => ({ run() {} });
  },
});

describe('a host plugin compiling its stages', () => {
  test('compiles a stage once for the same options over several stylesheets', async () => {
    const calls = { count: 0, targets: [] };
    const host = hostPlugin([
      { descriptor: countingDescriptor(calls), options: {} },
    ]);
    const processor = postcss([host]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.equal(calls.count, 1);
  });

  test('compiles again for another options object', async () => {
    const calls = { count: 0, targets: [] };
    const descriptor = countingDescriptor(calls);
    await postcss([hostPlugin([{ descriptor, options: {} }])]).process('a{}', {
      from: undefined,
    });
    await postcss([hostPlugin([{ descriptor, options: {} }])]).process('a{}', {
      from: undefined,
    });
    assert.equal(calls.count, 2);
  });

  test('gives a stage that reads targets the same frozen targets for every stylesheet', async () => {
    const calls = { count: 0, targets: [] };
    const host = hostPlugin([
      { descriptor: countingDescriptor(calls, true), options: {} },
    ]);
    const processor = postcss([host]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.equal(calls.count, 1);
    assert.ok(Object.isFrozen(calls.targets[0]));
  });

  test('starts a fresh stage for each stylesheet, so no state outlives a run', async () => {
    let started = 0;
    const descriptor = {
      compile: () => () => {
        started += 1;
        return { run() {} };
      },
    };
    const processor = postcss([hostPlugin([{ descriptor, options: {} }])]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.equal(started, 2);
  });
});
