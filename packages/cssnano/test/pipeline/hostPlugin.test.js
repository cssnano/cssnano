import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin, pluginStage } from '../../src/pipeline/host.js';

/**
 * A host plugin's stage member that builds the given stage, with no options.
 * @param {import('../../src/pipeline/host.js').Stage} stage
 */
const hostOf = (...stages) =>
  hostPlugin(
    stages.map((stage) => ({ descriptor: { build: () => stage }, options: {} }))
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

describe('a plugin stage', () => {
  test('runs the OnceExit listener of the plugin it wraps', async () => {
    const log = [];
    const plugin = {
      postcssPlugin: 'wrapped',
      OnceExit(/** @type {import('postcss').Root} */ root) {
        log.push(root.type);
      },
    };
    await postcss([hostOf(pluginStage(plugin))]).process('a{}', {
      from: undefined,
    });
    assert.deepStrictEqual(log, ['root']);
  });

  test('runs the listeners that prepare returns for the result, so per-result state reaches OnceExit', async () => {
    const log = [];
    const plugin = {
      postcssPlugin: 'wrapped',
      prepare(/** @type {import('postcss').Result} */ result) {
        return {
          OnceExit() {
            log.push(result.opts.from);
          },
        };
      },
    };
    await postcss([hostOf(pluginStage(plugin))]).process('a{}', {
      from: 'input.css',
    });
    assert.deepStrictEqual(log, ['input.css']);
  });

  test('rejects a plugin with a listener other than OnceExit, because the host would skip it', async () => {
    const plugin = {
      postcssPlugin: 'walks',
      Declaration() {},
    };
    await assert.rejects(
      postcss([hostOf(pluginStage(plugin))]).process('a{color:red}', {
        from: undefined,
      }),
      /Declaration/v
    );
  });
});
