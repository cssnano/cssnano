import { test } from 'node:test';
import assert from 'node:assert';
import { minimize } from '../src/playground-minifier.js';

test('playground minifier', async (t) => {
  await t.test('return the minified CSS', async () => {
    const reply = await minimize('a { color: red; }', 'cssnano-preset-default');
    assert.deepStrictEqual(reply, { ok: true, css: 'a{color:red}' });
  });

  await t.test('returns the syntax error for invalid input CSS', async () => {
    const reply = await minimize('a { color: red', 'cssnano-preset-default');
    assert.strictEqual(reply.ok, false);
    assert.ok(reply.error.message.includes('CssSyntaxError:'));
    assert.ok(reply.error.message.match(/\d+:\d+/), 'includes line:column');
  });

  await t.test('return an error message for invalid CSS', async () => {
    const reply = await minimize(
      'a { color: red; }',
      /** @type {any} */ ('cssnano-preset-invalid')
    );
    assert.strictEqual(reply.ok, false);
    assert.ok(reply.error.message.length > 0);
  });

  await t.test('accept all three valid presets', async () => {
    for (const preset of [
      'cssnano-preset-default',
      'cssnano-preset-lite',
      'cssnano-preset-advanced',
    ]) {
      const reply = await minimize(
        'a { margin: 1px; }',
        /** @type {'cssnano-preset-default' | 'cssnano-preset-lite' | 'cssnano-preset-advanced'} */ (
          preset
        )
      );
      assert.strictEqual(reply.ok, true);
      assert.strictEqual(reply.css, 'a{margin:1px}');
    }
  });
});
