import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * A stage that gives each property the reducer that `select` returns for it.
 *
 * @param {(property: string) => ((buffer: import('../../src/values/valueBuffer.js').ValueBuffer) => void) | null} select
 * @returns {import('../../src/pipeline/host.js').ValueStage}
 */
function valueStage(select) {
  return { forProperty: select };
}

/**
 * A host plugin that runs the stages in order, with no options.
 *
 * @param {import('../../src/pipeline/host.js').Stage[]} stages
 */
function hostOf(stages) {
  return hostPlugin(
    stages.map((stage) => ({
      descriptor: { compile: () => () => stage },
      options: {},
    }))
  );
}

/**
 * A reducer that appends `suffix` to the value, and counts its calls.
 *
 * @param {string} suffix
 * @param {string[]} [seen] the text each call received
 */
function appending(suffix, seen = []) {
  return (
    /** @type {import('../../src/values/valueBuffer.js').ValueBuffer} */ buffer
  ) => {
    seen.push(buffer.text());
    buffer.replaceText(buffer.text() + suffix);
  };
}

/**
 * @param {string} css
 * @param {import('postcss').AcceptedPlugin} plugin
 * @returns {Promise<string>}
 */
async function run(css, plugin) {
  const result = await postcss([plugin]).process(css, { from: undefined });
  return result.css;
}

describe('a value reducer in a host plugin', () => {
  test('changes the values of the properties its stage selects', async () => {
    const css = await run(
      'a{color:red;width:1px}',
      hostOf([
        valueStage((property) =>
          property === 'color' ? appending('!') : null
        ),
      ])
    );
    assert.equal(css, 'a{color:red!;width:1px}');
  });

  test('folds a value that several declarations share once for each declaration', async () => {
    let calls = 0;
    await run(
      'a{color:red}b{color:red}c{color:red}',
      hostOf([
        valueStage(() => (buffer) => {
          calls++;
          buffer.replaceText(buffer.text() + '!');
        }),
      ])
    );
    assert.equal(calls, 3);
  });

  test('folds a declaration with no reducer for its property not at all', async () => {
    const seen = [];
    await run(
      'a{width:1px}',
      hostOf([
        valueStage((property) =>
          property === 'color' ? appending('!', seen) : null
        ),
      ])
    );
    assert.deepEqual(seen, []);
  });

  test('folds each declaration with a shared reducer, even when two of them have the same value', async () => {
    const seen = [];
    // One reducer object for both properties, as forProperty returns for properties treated alike.
    const reducer = appending('!', seen);
    await run(
      'a{color:red;background:red;color:red}',
      hostOf([valueStage(() => reducer)])
    );
    assert.deepEqual(seen, ['red', 'red', 'red']);
  });

  test('folds the same value separately for properties whose reducers run in another order', async () => {
    const css = await run(
      'a{color:x;background:x}',
      hostOf([
        valueStage((property) =>
          property === 'color' ? appending('A') : appending('B')
        ),
        valueStage((property) =>
          property === 'color' ? appending('B') : appending('A')
        ),
      ])
    );
    assert.equal(css, 'a{color:xAB;background:xBA}');
  });

  test('folds each declaration from its own source, not from a value an earlier one produced', async () => {
    const seen = [];
    const css = await run(
      'a{color:a;color:b}',
      hostOf([
        valueStage(() => (buffer) => {
          seen.push(buffer.text());
          if (buffer.text() === 'a') buffer.replaceText('b');
        }),
      ])
    );
    assert.equal(css, 'a{color:b;color:b}');
    assert.deepEqual(seen, ['a', 'b']);
  });

  test('leaves the raws of a declaration whose value does not change as they were', async () => {
    const root = postcss.parse('a{color:red /* c */}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first.first
    );
    decl.raws.value = { raw: 'red /* c */', value: 'red' };
    decl.value = 'red';
    await postcss([
      hostOf([valueStage(() => (buffer) => buffer.replaceText(buffer.text()))]),
    ]).process(root, { from: undefined });
    assert.deepEqual(decl.raws.value, { raw: 'red /* c */', value: 'red' });
  });

  test('replaces the value of a declaration that changes and drops its stale raw', async () => {
    const root = postcss.parse('a{color:red}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first.first
    );
    decl.raws.value = { raw: 'red /* c */', value: 'red' };
    await postcss([hostOf([valueStage(() => appending('!'))])]).process(root, {
      from: undefined,
    });
    assert.equal(decl.value, 'red /* c */!');
    assert.equal(decl.raws.value, undefined);
  });

  test('reads the value of a declaration when its raw is stale', async () => {
    const root = postcss.parse('a{color:red}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first.first
    );
    decl.value = 'blue';
    decl.raws.value = { raw: 'red', value: 'red' };
    const seen = [];
    await postcss([hostOf([valueStage(() => appending('', seen))])]).process(
      root,
      { from: undefined }
    );
    assert.deepEqual(seen, ['blue']);
  });

  test('reads the raw of a declaration when it matches the value, so comments in the source reach the reducer', async () => {
    const root = postcss.parse('a{color:red}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first.first
    );
    decl.value = 'red';
    decl.raws.value = { raw: 'red /* c */', value: 'red' };
    const seen = [];
    await postcss([hostOf([valueStage(() => appending('', seen))])]).process(
      root,
      { from: undefined }
    );
    assert.deepEqual(seen, ['red /* c */']);
  });

  test('folds each declaration again in a later stylesheet, so no value survives its run', async () => {
    const seen = [];
    const processor = postcss([
      hostOf([valueStage(() => appending('', seen))]),
    ]);
    await processor.process('a{color:red}', { from: undefined });
    await processor.process('a{color:red}', { from: undefined });
    assert.deepEqual(seen, ['red', 'red']);
  });
});

describe('the stages of a host plugin in one run', () => {
  test('runs a value reducer before a later phase stage and after an earlier one', async () => {
    const log = [];
    await run(
      'a{color:red}',
      hostOf([
        valueStage(() => (buffer) => {
          log.push('before');
          buffer.replaceText(buffer.text());
        }),
        {
          run() {
            log.push('phase');
          },
        },
        valueStage(() => (buffer) => {
          log.push('after');
          buffer.replaceText(buffer.text());
        }),
      ])
    );
    assert.deepEqual(log, ['before', 'phase', 'after']);
  });

  test('runs adjacent value stages on each declaration in pipeline order', async () => {
    const log = [];
    await run(
      'a{color:red;color:blue}',
      hostOf([
        valueStage(() => (buffer) => {
          log.push(`first ${buffer.text()}`);
          buffer.replaceText(buffer.text());
        }),
        valueStage(() => (buffer) => {
          log.push(`second ${buffer.text()}`);
          buffer.replaceText(buffer.text());
        }),
      ])
    );
    assert.deepEqual(log, [
      'first red',
      'second red',
      'first blue',
      'second blue',
    ]);
  });
});
